"""
Avatar Assistant API Views — Green Room Talking Avatar.
Provides endpoints for:
- Getting the avatar token (creates LiveKit room + agent session)
- Saving conversation history
- Getting/setting guest readiness
- Guest info for agent context (with summaries instead of raw messages)
"""

import secrets
import json
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.conf import settings
from livekit import api as livekit_api
from livekit.api import AccessToken, RoomAgentDispatch, RoomConfiguration, VideoGrants
from .avatar_models import GreenRoomPrompt, GuestConversation



class AvatarTokenView(APIView):
    """
    Generate a LiveKit token for the avatar green room and create/return
    the session ID for conversation tracking.
    
    POST /api/avatar/token/
    Body: {
        "guestName": "John",
        "guestEmail": "john@example.com",
        "showId": 1 (optional),
        "sessionId": "abc123" (optional, to resume)
    }
    Returns: {
        "token": "...",
        "serverUrl": "wss://...",
        "roomName": "avatar_Broadcast_Studio_A1",
        "sessionId": "...",
        "prompt": {...},
        "welcomeMessage": "..."
    }
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No auth required — guests aren't logged in

    def post(self, request):

        guest_name = request.data.get('guestName', '').strip() or 'Guest'
        guest_email = request.data.get('guestEmail', '').strip()
        show_id = request.data.get('showId')
        existing_session_id = request.data.get('sessionId', '').strip()

        try:
            api_key = settings.LIVEKIT_API_KEY
            api_secret = settings.LIVEKIT_API_SECRET
            livekit_url = settings.LIVEKIT_URL
        except AttributeError:
            return Response({'error': 'LiveKit not configured'}, status=500)

        # Determine room name — must be UNIQUE per session for agent dispatch to work
        # Agent dispatch via token only triggers on room CREATION, so each guest needs
        # their own room. We use session_id as the room identity.
        main_room = getattr(settings, 'LIVEKIT_ROOM_NAME', 'Broadcast_Studio_A1')
        room_name = f"avatar_{main_room}_{secrets.token_hex(6)}"


        # Find the best prompt config for this guest
        prompt = self._find_prompt(guest_name, guest_email, show_id)

        # Create or resume session
        session_id = existing_session_id or f"av_{secrets.token_hex(12)}"

        if existing_session_id:
            try:
                conversation = GuestConversation.objects.get(session_id=session_id)
            except GuestConversation.DoesNotExist:
                conversation = self._create_conversation(
                    session_id, guest_name, guest_email, show_id, prompt, room_name
                )
        else:
            conversation = self._create_conversation(
                session_id, guest_name, guest_email, show_id, prompt, room_name
            )

        # Generate LiveKit token for the guest with agent dispatch
        # This tells LiveKit to automatically dispatch the avatar-assistant agent
        # when the guest joins and creates this room.
        participant_identity = f"avatar_guest_{secrets.token_hex(6)}"
        metadata = json.dumps({
            "guestName": guest_name,
            "guestEmail": guest_email,
            "sessionId": session_id,
            "showId": show_id,
        })
        token = AccessToken(api_key, api_secret) \
            .with_identity(participant_identity) \
            .with_name(guest_name) \
            .with_grants(VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )) \
            .with_room_config(
                RoomConfiguration(
                    agents=[
                        RoomAgentDispatch(
                            agent_name="avatar-assistant",
                            metadata=metadata,
                        )
                    ],
                ),
            )

        token_jwt = token.to_jwt()


        # Build prompt info for the frontend
        prompt_data = None
        if prompt:
            prompt_data = {
                'systemPrompt': prompt.system_prompt,
                'guestInfo': prompt.guest_info,
                'guestName': prompt.guest_name or guest_name,
                'modelName': prompt.model_name,
                'temperature': prompt.temperature,
                'maxTokens': prompt.max_tokens,
                'piperVoice': prompt.piper_voice,
            }
            welcome = prompt.welcome_message or f"Hey {guest_name}! I'm Lil' Dawg, your pre-show assistant. Let's get you ready for the broadcast!"
        else:
            welcome = f"Hey {guest_name}! I'm Lil' Dawg, your pre-show assistant. Let's get you ready for the broadcast!"

        return Response({
            'token': token_jwt,
            'serverUrl': livekit_url,
            'roomName': room_name,
            'sessionId': session_id,
            'prompt': prompt_data,
            'welcomeMessage': welcome,
            'guestName': guest_name,
            'mainRoomName': main_room,
        })

    def _find_prompt(self, guest_name, guest_email, show_id):
        """Find the best matching prompt for this guest."""
        from django.contrib.auth.models import User
        
        user = None
        if guest_email:
            try:
                user = User.objects.get(email=guest_email)
            except User.DoesNotExist:
                pass
        if not user and guest_name:
            try:
                user = User.objects.get(username=guest_name)
            except User.DoesNotExist:
                pass

        prompts = GreenRoomPrompt.objects.filter(is_active=True)

        # Priority 1: Prompt matching both show AND guest user
        if user and show_id:
            match = prompts.filter(show_id=show_id, guest=user).order_by('-priority').first()
            if match:
                return match

        # Priority 2: Prompt matching guest user only
        if user:
            match = prompts.filter(guest=user).order_by('-priority').first()
            if match:
                return match

        # Priority 3: Prompt matching show only
        if show_id:
            match = prompts.filter(show_id=show_id).order_by('-priority').first()
            if match:
                return match

        # Priority 4: Default active prompt (no show, no guest)
        match = prompts.filter(show__isnull=True, guest__isnull=True).order_by('-priority').first()
        if match:
            return match

        return None

    def _create_conversation(self, session_id, guest_name, guest_email, show_id, prompt, room_name):
        """Create a new conversation record."""
        from django.contrib.auth.models import User
        
        user = None
        if guest_email:
            try:
                user = User.objects.get(email=guest_email)
            except User.DoesNotExist:
                pass

        return GuestConversation.objects.create(
            guest=user,
            guest_name=guest_name,
            guest_email=guest_email,
            show_id=show_id if show_id else None,
            prompt_used=prompt,
            session_id=session_id,
            room_name=room_name,
        )


class AvatarSaveConversationView(APIView):
    """
    Save a message to the conversation history.
    
    POST /api/avatar/save-message/
    Body: {
        "sessionId": "...",
        "role": "assistant|user",
        "content": "Hello!",
        "guestReady": false (optional, set to true when guest is ready)
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = request.data.get('sessionId', '').strip()
        role = request.data.get('role', '')
        content = request.data.get('content', '').strip()
        guest_ready = request.data.get('guestReady')

        if not session_id:
            return Response({'error': 'sessionId required'}, status=400)
        if role not in ('user', 'assistant'):
            return Response({'error': 'role must be "user" or "assistant"'}, status=400)

        try:
            conversation = GuestConversation.objects.get(session_id=session_id)
        except GuestConversation.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)

        conversation.add_message(role, content)

        if guest_ready is True:
            conversation.guest_ready = True
            conversation.save(update_fields=['guest_ready'])

        return Response({
            'messageCount': conversation.message_count,
            'guestReady': conversation.guest_ready,
        })


class AvatarConversationHistoryView(APIView):
    """
    Get conversation history for a session.
    
    GET /api/avatar/conversation/?sessionId=...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.query_params.get('sessionId', '').strip()

        if not session_id:
            return Response({'error': 'sessionId required'}, status=400)

        try:
            conversation = GuestConversation.objects.get(session_id=session_id)
        except GuestConversation.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)

        return Response({
            'sessionId': conversation.session_id,
            'guestName': conversation.guest_name,
            'guestEmail': conversation.guest_email,
            'messages': conversation.messages,
            'messageCount': conversation.message_count,
            'guestReady': conversation.guest_ready,
            'guestNotes': conversation.guest_notes,
            'autoSummary': conversation.auto_summary,
            'createdAt': conversation.created_at.isoformat(),
        })


class AvatarEndSessionView(APIView):
    """
    End an avatar session (guest is leaving).
    If an auto_summary is provided, it's saved for future cross-session memory.
    
    POST /api/avatar/end-session/
    Body: {
        "sessionId": "...",
        "autoSummary": "Guest was excited about... (optional, generated by agent)"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = request.data.get('sessionId', '').strip()
        auto_summary = request.data.get('autoSummary', '').strip()

        if not session_id:
            return Response({'error': 'sessionId required'}, status=400)

        try:
            conversation = GuestConversation.objects.get(session_id=session_id)
        except GuestConversation.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)

        now = timezone.now()
        if conversation.created_at:
            conversation.duration_seconds = int((now - conversation.created_at).total_seconds())
        conversation.ended_at = now

        if auto_summary:
            conversation.auto_summary = auto_summary

        conversation.save(update_fields=['duration_seconds', 'ended_at', 'auto_summary'])

        return Response({
            'message': 'Session ended',
            'durationSeconds': conversation.duration_seconds,
        })


class AvatarConversationsForShowView(APIView):
    """
    Admin: Get all conversations for a show (for context reuse).
    
    GET /api/admin/avatar/conversations/?showId=1&guestEmail=...
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        show_id = request.query_params.get('showId')
        guest_email = request.query_params.get('guestEmail', '').strip()

        conversations = GuestConversation.objects.all()

        if show_id:
            conversations = conversations.filter(show_id=show_id)
        if guest_email:
            conversations = conversations.filter(guest_email=guest_email)

        conversations = conversations.order_by('-created_at')[:20]

        return Response([{
            'sessionId': c.session_id,
            'guestName': c.guest_name,
            'guestEmail': c.guest_email,
            'messageCount': c.message_count,
            'guestReady': c.guest_ready,
            'guestNotes': c.guest_notes,
            'autoSummary': c.auto_summary,
            'createdAt': c.created_at.isoformat(),
            'messages': c.messages,
        } for c in conversations])


class AvatarPastConversationsView(APIView):
    """
    Get past conversation summaries for a returning guest.
    Used by the agent to build cross-session memory for the system prompt.
    
    GET /api/avatar/past-conversations/?guestEmail=...&guestName=...
    
    Returns a flat list of past conversation data with summaries.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        guest_email = request.query_params.get('guestEmail', '').strip()
        guest_name = request.query_params.get('guestName', '').strip()

        conversations = GuestConversation.objects.all()
        if guest_email:
            conversations = conversations.filter(guest_email=guest_email)
        elif guest_name:
            conversations = conversations.filter(guest_name__iexact=guest_name)

        conversations = conversations.order_by('-created_at')[:10]

        result = []
        for c in conversations:
            show_title = c.show.title if c.show else "Unknown Show"
            result.append({
                'show': show_title,
                'date': c.created_at.date().isoformat(),
                'duration': c.duration_seconds,
                'summary': c.get_summary_for_context(),
                'guestNotes': c.guest_notes,
                'guestReady': c.guest_ready,
            })

        return Response(result)


class AvatarGuestInfoView(APIView):

    """
    Get guest info + past conversation context for the agent worker.
    The agent calls this to get info about who they're talking to.
    Returns SUMMARIES instead of raw messages — keeps prompt context small
    and preserves RAM/CPU for the main broadcast.
    
    GET /api/avatar/guest-info/?guestEmail=...&showId=...
    """
    permission_classes = [AllowAny]

    def get(self, request):
        guest_email = request.query_params.get('guestEmail', '').strip()
        show_id = request.query_params.get('showId')

        info = {
            'guestEmail': guest_email,
            'pastConversations': [],
            'totalPastSessions': 0,
        }

        if guest_email:
            # Find past conversations with this guest
            past = GuestConversation.objects.filter(
                guest_email=guest_email
            ).order_by('-created_at')[:5]

            info['totalPastSessions'] = GuestConversation.objects.filter(
                guest_email=guest_email
            ).count()

            for c in past:
                show_title = c.show.title if c.show else "Unknown Show"
                # Return the SUMMARY instead of raw messages
                summary = c.get_summary_for_context()
                info['pastConversations'].append({
                    'show': show_title,
                    'date': c.created_at.date().isoformat(),
                    'duration': c.duration_seconds,
                    'summary': summary,  # <-- was 'messages' before
                    'guestNotes': c.guest_notes,
                    'guestReady': c.guest_ready,
                })

        return Response(info)
