"""
AI Chat WebSocket Consumer — Streaming DeepSeek integration for Coach & Athlete assistants.

Architecture:
- Each user connects to ws://domain/ws/ai/{role}/ (role = 'coach' or 'athlete')
- Messages are streamed token-by-token from DeepSeek API
- All messages are zlib-compressed in PostgreSQL
- Redis channel layer coordinates across multiple Daphne instances
"""

import json
import asyncio
import aiohttp
import hashlib
from datetime import datetime, timedelta
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from .ai_models import AIChatSession, AIChatMessage, AIPersonality


class AIChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for streaming AI chat with DeepSeek."""

    async def connect(self):
        # Authenticate user from scope (set by AuthMiddlewareStack)
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Get role from URL route
        self.role = self.scope['url_route']['kwargs'].get('role', 'athlete')
        if self.role not in ('coach', 'athlete'):
            await self.close(code=4002)
            return

        # Get or create session_id from query string
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        self.session_id = None
        if query_string:
            params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
            self.session_id = params.get('session_id')

        # Build user-specific group name for broadcasting
        self.user_group_name = f'ai_chat_{self.user.id}'

        # Join user group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

        # Rate limit check
        can_proceed, wait_time = await self.check_rate_limit()
        if not can_proceed:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'rate_limited',
                'message': f'Please wait {wait_time} seconds before sending another message.',
                'wait_seconds': wait_time
            }))
            return

        # Send initial connection confirmation with personality context
        personality = await self.get_personality()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'role': self.role,
            'personality': {
                'name': 'Coach AI' if self.role == 'coach' else 'Athlete AI',
                'supports_streaming': personality.supports_streaming if personality else True,
                'supports_audio': personality.supports_audio_input if personality else False,
                'daily_message_limit': personality.daily_message_limit if personality else 50,
            } if personality else {
                'name': 'Coach AI' if self.role == 'coach' else 'Athlete AI',
                'supports_streaming': True,
                'supports_audio': False,
                'daily_message_limit': 50,
            },
            'sessions': await self.get_recent_sessions(),
        }))

    async def disconnect(self, close_code):
        # Leave user group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'invalid_json',
                'message': 'Invalid JSON payload.'
            }))
            return

        msg_type = data.get('type')

        if msg_type == 'message':
            await self.handle_user_message(data)
        elif msg_type == 'create_session':
            await self.handle_create_session(data)
        elif msg_type == 'list_sessions':
            await self.send_sessions_list()
        elif msg_type == 'load_session':
            await self.handle_load_session(data)
        elif msg_type == 'delete_session':
            await self.handle_delete_session(data)
        elif msg_type == 'rename_session':
            await self.handle_rename_session(data)
        elif msg_type == 'toggle_favorite':
            await self.handle_toggle_favorite(data)
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'unknown_type',
                'message': f'Unknown message type: {msg_type}'
            }))

    async def handle_user_message(self, data):
        """Handle a user message: save it, call DeepSeek, stream response."""
        content = data.get('content', '').strip()
        session_id = data.get('session_id')

        if not content:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'empty_message',
                'message': 'Message cannot be empty.'
            }))
            return

        # Rate limit check
        can_proceed, wait_time = await self.check_rate_limit()
        if not can_proceed:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'rate_limited',
                'message': f'Please wait {wait_time} seconds before sending another message.',
                'wait_seconds': wait_time
            }))
            return

        # Get or create session
        session = await self.get_or_create_session(session_id)

        # Save user message
        user_msg = await self.save_message(session, 'user', content)

        # Send typing indicator
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'session_id': session.id,
        }))

        try:
            # Stream response from DeepSeek
            full_response = ""
            async for chunk in self.stream_deepseek(session, content):
                full_response += chunk
                await self.send(text_data=json.dumps({
                    'type': 'chunk',
                    'session_id': session.id,
                    'content': chunk,
                }))

            # Save assistant response
            personality = await self.get_personality()
            token_count = len(full_response.split())  # Approximate
            await self.save_message(session, 'assistant', full_response,
                                    token_count=token_count,
                                    metadata={
                                        'model': personality.model_name if personality else 'deepseek-chat',
                                        'temperature': personality.temperature if personality else 0.7,
                                    })

            # Update session summary
            await database_sync_to_async(session.update_summary)()

            # Send completion signal
            await self.send(text_data=json.dumps({
                'type': 'done',
                'session_id': session.id,
                'token_count': token_count,
            }))

        except aiohttp.ClientError as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'api_error',
                'message': f'AI service error: {str(e)}. Please try again.'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'internal_error',
                'message': 'An unexpected error occurred. Please try again.'
            }))

    async def stream_deepseek(self, session, user_message):
        """Stream tokens from DeepSeek API. Yields chunks as they arrive."""

        # Determine which API key to use
        if self.role == 'coach':
            api_key = settings.DEEPSEEK_API_COACH
        else:
            api_key = settings.DEEPSEEK_API_ATHLETE

        # Get personality for system prompt and model params
        personality = await self.get_personality()

        # Build message history for context (last ~30 messages or 8K tokens)
        history = await self.get_session_context(session)

        # System prompt with medical disclaimer
        system_prompt = personality.system_prompt if personality else (
            "You are a professional sports analyst and coaching assistant." 
            if self.role == 'coach'
            else "You are a personal athletic trainer and performance coach."
        )

        # Add medical disclaimer for athlete
        if self.role == 'athlete':
            system_prompt += (
                "\n\nIMPORTANT MEDICAL DISCLAIMER: You must always remind users "
                "to consult a doctor before starting any new exercise or training routine. "
                "You NEVER diagnose injuries. Always recommend consulting a healthcare professional "
                "for medical advice."
            )

        # Add inspiring, witty closing instruction
        system_prompt += (
            "\n\nPersonality: You are professional, blunt, and direct with a good sense of humor. "
            "Always end your responses with something inspiring and witty. "
            "You use the user's profile information (sport, role, stats) to personalize responses."
        )

        # Build the messages array
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        # Make streaming request to DeepSeek
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": personality.model_name if personality else "deepseek-chat",
            "messages": messages,
            "temperature": personality.temperature if personality else 0.7,
            "max_tokens": personality.max_tokens if personality else 4096,
            "top_p": personality.top_p if personality else 0.95,
            "stream": True,
        }

        async with aiohttp.ClientSession() as client_session:
            async with client_session.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise aiohttp.ClientError(
                        f"DeepSeek API returned {response.status}: {error_text}"
                    )

                # Stream SSE response
                buffer = ""
                async for line in response.content:
                    decoded = line.decode("utf-8").strip()
                    if not decoded:
                        continue
                    if decoded.startswith("data: "):
                        data_str = decoded[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                delta = chunk_data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    async def handle_create_session(self, data):
        """Create a new chat session."""
        session = await self.create_session()
        await self.send(text_data=json.dumps({
            'type': 'session_created',
            'session': await self.serialize_session(session),
        }))

    async def handle_load_session(self, data):
        """Load a session's message history."""
        session_id = data.get('session_id')
        if not session_id:
            return

        messages = await self.get_session_messages(session_id)
        await self.send(text_data=json.dumps({
            'type': 'session_loaded',
            'session_id': session_id,
            'messages': messages,
        }))

    async def handle_delete_session(self, data):
        """Delete a chat session and all its messages."""
        session_id = data.get('session_id')
        if not session_id:
            return
        await self.delete_session(session_id)
        await self.send(text_data=json.dumps({
            'type': 'session_deleted',
            'session_id': session_id,
        }))

    async def handle_rename_session(self, data):
        """Rename a chat session."""
        session_id = data.get('session_id')
        title = data.get('title', '').strip()
        if not session_id or not title:
            return
        await self.rename_session(session_id, title)
        await self.send(text_data=json.dumps({
            'type': 'session_renamed',
            'session_id': session_id,
            'title': title,
        }))

    async def handle_toggle_favorite(self, data):
        """Toggle favorite status on a session."""
        session_id = data.get('session_id')
        if not session_id:
            return
        is_fav = await self.toggle_favorite(session_id)
        await self.send(text_data=json.dumps({
            'type': 'favorite_toggled',
            'session_id': session_id,
            'is_favorited': is_fav,
        }))

    async def send_sessions_list(self):
        """Send the user's session list."""
        sessions = await self.get_recent_sessions()
        await self.send(text_data=json.dumps({
            'type': 'sessions_list',
            'sessions': sessions,
        }))

    # --- Database operations ---

    @database_sync_to_async
    def get_personality(self):
        """Get the active personality for this role."""
        try:
            return AIPersonality.objects.get(role=self.role, is_active=True)
        except AIPersonality.DoesNotExist:
            return None

    @database_sync_to_async
    def get_or_create_session(self, session_id):
        """Get existing session or create a new one."""
        if session_id:
            try:
                return AIChatSession.objects.get(
                    id=session_id, user=self.user, is_active=True
                )
            except AIChatSession.DoesNotExist:
                pass
        
        return AIChatSession.objects.create(
            user=self.user,
            role=self.role,
            title="",
        )

    @database_sync_to_async
    def create_session(self):
        """Create a new session."""
        return AIChatSession.objects.create(
            user=self.user,
            role=self.role,
            title="",
        )

    @database_sync_to_async
    def save_message(self, session, role, content, token_count=0, metadata=None):
        """Save a message to the database with compression."""
        return AIChatMessage.objects.create(
            session=session,
            role=role,
            content=content,  # Auto-compressed by CompressedTextField
            token_count=token_count,
            metadata=metadata or {},
        )

    @database_sync_to_async
    def get_session_context(self, session):
        """Get conversation history for context (last 30 messages)."""
        messages = AIChatMessage.objects.filter(
            session=session
        ).order_by('-created_at')[:30]

        context = []
        for msg in reversed(messages):
            if msg.role == 'system':
                continue
            context.append({
                "role": msg.role,
                "content": msg.get_content(),
            })

        return context

    @database_sync_to_async
    def get_session_messages(self, session_id):
        """Get all messages for a session, serialized."""
        try:
            session = AIChatSession.objects.get(id=session_id, user=self.user)
        except AIChatSession.DoesNotExist:
            return []

        messages = AIChatMessage.objects.filter(session=session).order_by('created_at')
        return [{
            'id': msg.id,
            'role': msg.role,
            'content': msg.get_content(),
            'token_count': msg.token_count,
            'created_at': msg.created_at.isoformat(),
        } for msg in messages]

    @database_sync_to_async
    def get_recent_sessions(self):
        """Get user's recent sessions (without loading all messages)."""
        sessions = AIChatSession.objects.filter(
            user=self.user, role=self.role
        ).order_by('-last_message_at')[:50]

        return [{
            'id': s.id,
            'title': s.title or 'New Chat',
            'role': s.role,
            'message_count': s.message_count,
            'is_favorited': s.is_favorited,
            'is_active': s.is_active,
            'last_message_at': s.last_message_at.isoformat(),
            'created_at': s.created_at.isoformat(),
        } for s in sessions]

    @database_sync_to_async
    def delete_session(self, session_id):
        """Delete a session and all its messages."""
        try:
            session = AIChatSession.objects.get(id=session_id, user=self.user)
            session.messages.all().delete()
            session.delete()
        except AIChatSession.DoesNotExist:
            pass

    @database_sync_to_async
    def rename_session(self, session_id, title):
        """Rename a session."""
        try:
            session = AIChatSession.objects.get(id=session_id, user=self.user)
            session.title = title
            session.save(update_fields=['title'])
        except AIChatSession.DoesNotExist:
            pass

    @database_sync_to_async
    def toggle_favorite(self, session_id):
        """Toggle favorite on a session."""
        try:
            session = AIChatSession.objects.get(id=session_id, user=self.user)
            session.is_favorited = not session.is_favorited
            session.save(update_fields=['is_favorited'])
            return session.is_favorited
        except AIChatSession.DoesNotExist:
            return False

    @database_sync_to_async
    def check_rate_limit(self):
        """Check if user is rate limited.
        Returns (can_proceed: bool, wait_seconds: int)."""
        personality = self.get_personality()
        if not personality:
            return True, 0

        personality = personality  # Already sync, this is the object

        # Check daily limit
        today = timezone.now().date()
        daily_count = AIChatMessage.objects.filter(
            session__user=self.user,
            session__role=self.role,
            created_at__date=today,
            role='user',
        ).count()

        # We need the personality object directly
        try:
            personality_obj = AIPersonality.objects.get(role=self.role, is_active=True)
            if daily_count >= personality_obj.daily_message_limit:
                return False, 0

            # Check rate limit window
            recent_msg = AIChatMessage.objects.filter(
                session__user=self.user,
                session__role=self.role,
                role='user',
            ).order_by('-created_at').first()

            if recent_msg:
                elapsed = (timezone.now() - recent_msg.created_at).total_seconds()
                if elapsed < personality_obj.rate_limit_window:
                    wait = int(personality_obj.rate_limit_window - elapsed)
                    return False, wait
        except AIPersonality.DoesNotExist:
            pass

        return True, 0

    # --- Serialization ---

    @database_sync_to_async
    def serialize_session(self, session):
        """Serialize a session object for JSON."""
        return {
            'id': session.id,
            'title': session.title or 'New Chat',
            'role': session.role,
            'message_count': session.message_count,
            'is_favorited': session.is_favorited,
            'is_active': session.is_active,
            'last_message_at': session.last_message_at.isoformat(),
            'created_at': session.created_at.isoformat(),
        }
