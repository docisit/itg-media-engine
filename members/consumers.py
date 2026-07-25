import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone
from .models import WebRTCRoom, WebRTCParticipant, WebRTCSignal

class WebRTCConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.participant_id = self.scope['url_route']['kwargs'].get('participant_id', str(uuid.uuid4()))
        self.room_group_name = f'webrtc_{self.room_id}'
        
        # Get or create room (auto-create if doesn't exist)
        room = await self.get_or_create_room(self.room_id)
        if not room:
            print(f"WebRTC: Failed to get/create room {self.room_id}")
            await self.close()
            return
        
        self.room = room
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Create or get participant
        user = self.scope.get('user')
        participant = await self.get_or_create_participant(
            room, self.participant_id, user if user and user.is_authenticated else None
        )
        
        self.participant = participant
        
        await self.accept()
        
        print(f"WebRTC: Connection accepted for room={self.room_id}, participant={self.participant_id}")
        
        # Send connection confirmation with participant info
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'participant_id': self.participant_id,
            'room_id': self.room_id,
            'ice_servers': settings.WEBRTC_CONFIG['ICE_SERVERS']
        }))
        
        # Notify others in room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_joined',
                'participant_id': self.participant_id,
                'display_name': participant.display_name,
                'role': participant.role
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Mark participant as disconnected
        if hasattr(self, 'participant'):
            await self.disconnect_participant(self.participant)
        
        # Notify others in room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_left',
                'participant_id': self.participant_id
            }
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'signal':
            # Handle WebRTC signaling messages
            await self.handle_signal(data)
        elif message_type == 'join':
            # Handle participant joining with details
            await self.handle_join(data)
        elif message_type == 'leave':
            # Handle participant leaving
            await self.handle_leave(data)
        elif message_type == 'chat':
            # Handle chat messages
            await self.handle_chat(data)
        elif message_type == 'control':
            # Handle control messages (mute, video, etc.)
            await self.handle_control(data)

    async def handle_signal(self, data):
        """Handle WebRTC signaling messages (offer, answer, candidate)"""
        signal_type = data.get('signal_type')
        target = data.get('target')  # recipient participant_id
        payload = data.get('payload')
        
        # Store signal in database
        await self.store_signal(signal_type, target, payload)
        
        # Forward signal to target participant
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_signal',
                'sender': self.participant_id,
                'target': target,
                'signal_type': signal_type,
                'payload': payload
            }
        )

    async def handle_join(self, data):
        """Handle participant joining with display name and role"""
        display_name = data.get('display_name', 'Guest')
        role = data.get('role', 'guest')
        
        # Update participant info
        await self.update_participant_info(self.participant, display_name, role)
        
        # Broadcast participant info to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_info',
                'participant_id': self.participant_id,
                'display_name': display_name,
                'role': role,
                'has_audio': data.get('has_audio', True),
                'has_video': data.get('has_video', True)
            }
        )

    async def handle_leave(self, data):
        """Handle participant leaving"""
        await self.disconnect_participant(self.participant)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_left',
                'participant_id': self.participant_id,
                'reason': data.get('reason', 'left')
            }
        )

    async def handle_chat(self, data):
        """Handle chat messages"""
        message = data.get('message', '')
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'sender': self.participant_id,
                'display_name': self.participant.display_name,
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        )

    async def handle_control(self, data):
        """Handle control messages"""
        action = data.get('action')
        value = data.get('value')
        
        if action == 'mute_audio':
            await self.update_participant_audio(self.participant, not value)
        elif action == 'mute_video':
            await self.update_participant_video(self.participant, not value)
        elif action == 'screen_share':
            await self.update_participant_screen_share(self.participant, value)
        
        # Broadcast control change
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'control_update',
                'participant_id': self.participant_id,
                'action': action,
                'value': value
            }
        )

    # Handler methods for different message types
    async def webrtc_signal(self, event):
        """Send WebRTC signal to specific participant"""
        if event['target'] == self.participant_id:
            await self.send(text_data=json.dumps({
                'type': 'signal',
                'sender': event['sender'],
                'signal_type': event['signal_type'],
                'payload': event['payload']
            }))

    async def participant_joined(self, event):
        """Notify when a participant joins"""
        await self.send(text_data=json.dumps({
            'type': 'participant_joined',
            'participant_id': event['participant_id'],
            'display_name': event['display_name'],
            'role': event['role']
        }))

    async def participant_left(self, event):
        """Notify when a participant leaves"""
        await self.send(text_data=json.dumps({
            'type': 'participant_left',
            'participant_id': event['participant_id'],
            'reason': event.get('reason', 'left')
        }))

    async def participant_info(self, event):
        """Send participant info updates"""
        await self.send(text_data=json.dumps({
            'type': 'participant_info',
            'participant_id': event['participant_id'],
            'display_name': event['display_name'],
            'role': event['role'],
            'has_audio': event.get('has_audio', True),
            'has_video': event.get('has_video', True)
        }))

    async def chat_message(self, event):
        """Send chat messages"""
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'sender': event['sender'],
            'display_name': event['display_name'],
            'message': event['message'],
            'timestamp': event['timestamp']
        }))

    async def control_update(self, event):
        """Send control updates"""
        await self.send(text_data=json.dumps({
            'type': 'control',
            'participant_id': event['participant_id'],
            'action': event['action'],
            'value': event['value']
        }))

    # Database operations
    @database_sync_to_async
    def get_room(self, room_id):
        try:
            return WebRTCRoom.objects.get(room_id=room_id, is_active=True)
        except WebRTCRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def get_or_create_room(self, room_id):
        """Get existing room or auto-create if doesn't exist"""
        try:
            # First try to get existing active room
            room = WebRTCRoom.objects.filter(room_id=room_id, is_active=True).first()
            if room:
                return room
            
            # If room exists but is inactive, reactivate it
            room = WebRTCRoom.objects.filter(room_id=room_id).first()
            if room:
                room.is_active = True
                room.save()
                print(f"WebRTC: Reactivated room {room_id}")
                return room
            
            # Auto-create room for broadcast rooms
            from django.contrib.auth.models import User
            
            # Get first superuser as default host, or first user
            host = User.objects.filter(is_superuser=True).first()
            if not host:
                host = User.objects.first()
            
            room = WebRTCRoom.objects.create(
                room_id=room_id,
                name=f'Room {room_id}',
                room_type='interview',
                host=host,
                is_active=True,
                is_public=True,
                room_password='1234',
                max_participants=10
            )
            print(f"WebRTC: Auto-created room {room_id}")
            return room
            
        except Exception as e:
            print(f"WebRTC: Error getting/creating room {room_id}: {e}")
            return None

    @database_sync_to_async
    def get_or_create_participant(self, room, participant_id, user):
        participant, created = WebRTCParticipant.objects.get_or_create(
            room=room,
            participant_id=participant_id,
            defaults={
                'user': user,
                'display_name': user.username if user else f'Guest_{participant_id[:8]}',
                'role': 'host' if room.host == user else 'guest',
                'is_connected': True,
                'ice_servers': settings.WEBRTC_CONFIG['ICE_SERVERS']
            }
        )
        
        if not created:
            participant.is_connected = True
            participant.left_at = None
            participant.save()
        
        return participant

    @database_sync_to_async
    def disconnect_participant(self, participant):
        participant.disconnect()

    @database_sync_to_async
    def update_participant_info(self, participant, display_name, role):
        participant.display_name = display_name
        participant.role = role
        participant.save()

    @database_sync_to_async
    def update_participant_audio(self, participant, has_audio):
        participant.has_audio = has_audio
        participant.save()

    @database_sync_to_async
    def update_participant_video(self, participant, has_video):
        participant.has_video = has_video
        participant.save()

    @database_sync_to_async
    def update_participant_screen_share(self, participant, is_screen_sharing):
        participant.is_screen_sharing = is_screen_sharing
        participant.save()

    @database_sync_to_async
    def store_signal(self, signal_type, target, payload):
        room = WebRTCRoom.objects.get(room_id=self.room_id)
        sender = WebRTCParticipant.objects.get(
            room=room, 
            participant_id=self.participant_id
        )
        receiver = WebRTCParticipant.objects.get(
            room=room, 
            participant_id=target
        )
        
        signal = WebRTCSignal.objects.create(
            room=room,
            sender=sender,
            receiver=receiver,
            signal_type=signal_type,
            payload=payload
        )
        return signal