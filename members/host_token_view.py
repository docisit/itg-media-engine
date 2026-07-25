from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import time
import jwt
from rest_framework.permissions import AllowAny  # Ensure this is included

class HostTokenView(APIView):
    """Generate LiveKit tokens for hosts and guests"""
    permission_classes = [AllowAny]

    def generate_livekit_token(self, room_name, participant_name, participant_identity, is_admin=False):
        """Generate JWT token for LiveKit access"""
        try:
            # Get LiveKit credentials from settings
            api_key = getattr(settings, 'LIVEKIT_API_KEY', '')
            api_secret = getattr(settings, 'LIVEKIT_API_SECRET', '')

            if not api_key or not api_secret:
                raise ValueError("LiveKit API credentials not configured")

            # Define token claims
            now = int(time.time())
            expires = now + 3600  # Token valid for 1 hour

            # Permissions (same for host and guest - both can publish)
            grants = {
                'room': room_name,
                'roomJoin': True,
                'canPublish': True,  # ← Guest can publish video!
                'canSubscribe': True,
                'canPublishData': True,
                'canUpdateOwnMetadata': True,
                'hidden': False,
                'recorder': False
            }
            
            # Add admin privileges if host
            if is_admin:
                grants['roomAdmin'] = True

            # Create JWT token
            token = jwt.encode(
                {
                    'iss': api_key,
                    'sub': participant_identity,
                    'exp': expires,
                    'nbf': now,
                    'name': participant_name,
                    'video': {
                        'roomJoin': True,
                        'room': room_name,
                        'canPublish': grants['canPublish'],
                        'canSubscribe': grants['canSubscribe'],
                    },
                    'grants': grants
                },
                api_secret,
                algorithm='HS256'
            )

            return token
        except Exception as e:
            print(f"Error generating LiveKit token: {str(e)}")
            raise

    def get(self, request):
        """Generate LiveKit host token (GET request)"""
        try:
            room_name = request.GET.get('roomName', getattr(settings, 'LIVEKIT_ROOM_NAME', 'Broadcast_Studio_A1'))
            host_name = request.GET.get('hostName', 'Host')
            participant_identity = f"Host_{int(time.time())}"

            token = self.generate_livekit_token(
                room_name=room_name,
                participant_name=host_name,
                participant_identity=participant_identity,
                is_admin=True  # ← Host gets admin privileges
            )

            livekit_url = getattr(settings, 'LIVEKIT_URL', 'wss://vdo.yourdomain.com')

            return Response({
                'success': True,
                'participantToken': token,
                'serverUrl': livekit_url,
                'room': room_name,
                'participant': {
                    'identity': participant_identity,
                    'name': host_name,
                    'role': 'host'
                },
                'permissions': {
                    'canPublish': True,
                    'canSubscribe': True,
                    'canPublishData': True,
                    'roomAdmin': True
                }
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Generate LiveKit guest token (POST request)"""
        try:
            data = request.data
            room_name = data.get('room_name', getattr(settings, 'LIVEKIT_ROOM_NAME', 'Broadcast_Studio_A1'))
            participant_name = data.get('participant_name', 'Guest')
            is_admin = data.get('is_admin', False)

            # Generate unique identity
            participant_identity = f"guest_{int(time.time() * 1000)}_{participant_name}"

            token = self.generate_livekit_token(
                room_name=room_name,
                participant_name=participant_name,
                participant_identity=participant_identity,
                is_admin=is_admin
            )

            livekit_url = getattr(settings, 'LIVEKIT_URL', 'wss://vdo.yourdomain.com')

            return Response({
                'success': True,
                'token': token,  # ← Note: using 'token' for consistency
                'participantToken': token,
                'url': livekit_url,
                'serverUrl': livekit_url,
                'room_name': room_name,
                'room': room_name,
                'participant_name': participant_name,
                'participant': {
                    'identity': participant_identity,
                    'name': participant_name,
                    'role': 'guest'
                },
                'permissions': {
                    'canPublish': True,  # ← Guest CAN publish!
                    'canSubscribe': True,
                    'canPublishData': True
                }
            })

        except Exception as e:
            print(f"Error in guest token generation: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)