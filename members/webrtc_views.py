import os
import uuid
import json
import time
import asyncio
import requests
import aiohttp
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from livekit.protocol import ingress as ingress_proto
from livekit import api
import livekit 
import livekit.api as livekit_api
from livekit.protocol import ingress as ingress_types
from livekit.protocol import egress as egress_types
from livekit.protocol import room as room_proto
from rest_framework.permissions import IsAdminUser, IsAuthenticated, AllowAny
from asgiref.sync import async_to_sync
from .models import WebRTCRoom, WebRTCParticipant, WebRTCSignal
from .serializers import (
    WebRTCRoomSerializer, WebRTCParticipantSerializer, 
    WebRTCSignalSerializer
)

# ============================================================
# WebRTCRoomViewSet
# ============================================================
class WebRTCRoomViewSet(viewsets.ModelViewSet):
    queryset = WebRTCRoom.objects.filter(is_active=True)
    serializer_class = WebRTCRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['status_by_id', 'join_token_by_name']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], url_path='(?P<room_name>[^/.]+)/join_token')
    def join_token_by_name(self, request, room_name=None):
        try:
            room = WebRTCRoom.objects.get(name=room_name, is_active=True)
        except (WebRTCRoom.DoesNotExist, Exception):
            room_name = room_name or 'Broadcast_Studio_A1'
        
        identity = request.data.get('identity')
        metadata = request.data.get('metadata', '{}')
        
        # Use authenticated user's identity if not explicitly provided
        if not identity:
            user = request.user
            if user.is_authenticated:
                # Authenticated users always get their real username
                identity = user.username
            else:
                # Unauthenticated users get a Guest_ prefix
                identity = f"Guest_{int(time.time())}"
        
        # Parse metadata
        try:
            metadata_dict = json.loads(metadata) if isinstance(metadata, str) else metadata
        except:
            metadata_dict = {}
        
        role = metadata_dict.get('role', 'guest')
        
        # For viewer role: allow publish (director can unmute them on-air)
        # but set initial can_publish based on what the caller requests
        can_publish_raw = request.data.get('can_publish')
        if can_publish_raw is not None:
            can_publish = bool(can_publish_raw)
        else:
            # Default: viewers can publish, guests can publish, hosts can publish
            can_publish = True
        
        token = livekit_api.AccessToken(
            settings.LIVEKIT_API_KEY, 
            settings.LIVEKIT_API_SECRET
        ).with_identity(identity).with_name(identity)
        
        grants = livekit_api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=True,
            room_admin=(role == 'host')
        )
        
        token.with_grants(grants)
        token.metadata = json.dumps(metadata_dict)
        
        return Response({
            'token': token.to_jwt(),
            'url': settings.LIVEKIT_URL,
            'room_name': room_name,
            'identity': identity,
            'can_publish': can_publish
        })
    
    @action(detail=False, methods=['get'], url_path='(?P<room_id>[^/.]+)/status')
    def status_by_id(self, request, room_id=None):
        room = get_object_or_404(WebRTCRoom, room_id=room_id, is_active=True)
        
        try:
            session = aiohttp.ClientSession()
            room_service = livekit_api.RoomService(
                session,
                settings.LIVEKIT_API_URL,
                settings.LIVEKIT_API_KEY,
                settings.LIVEKIT_API_SECRET
            )
            
            participants = room_service.list_participants(room.name)
            
            participant_list = []
            host_connected = False
            
            for p in participants:
                try:
                    metadata = json.loads(p.metadata) if p.metadata else {}
                except:
                    metadata = {}
                
                if metadata.get('role') == 'host':
                    host_connected = True
                
                participant_list.append({
                    'identity': p.identity,
                    'name': p.name,
                    'is_connected': True,
                    'joined_at': str(p.joined_at) if hasattr(p, 'joined_at') else '',
                    'metadata': metadata
                })
            
            return Response({
                'room_id': room.room_id,
                'room_name': room.name,
                'is_live': len(participants) > 0,
                'participant_count': len(participants),
                'host_connected': host_connected,
                'participants': participant_list
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='(?P<room_id>[^/.]+)/participants/(?P<participant_identity>[^/.]+)/status')
    def update_participant_status(self, request, room_id=None, participant_identity=None):
        room = get_object_or_404(WebRTCRoom, room_id=room_id, is_active=True)
        
        new_status = request.data.get('status', 'live')
        
        if new_status not in ['waiting', 'live']:
            return Response(
                {'error': 'Invalid status. Must be "waiting" or "live"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = aiohttp.ClientSession()
            room_service = livekit_api.RoomService(
                session,
                settings.LIVEKIT_API_URL,
                settings.LIVEKIT_API_KEY,
                settings.LIVEKIT_API_SECRET
            )
            
            participants = room_service.list_participants(room.name)
            participant = next(
                (p for p in participants if p.identity == participant_identity), 
                None
            )
            
            if not participant:
                return Response(
                    {'error': 'Participant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            current_metadata = json.loads(participant.metadata) if participant.metadata else {}
            current_metadata['status'] = new_status
            
            room_service.update_participant(
                room.name,
                participant_identity,
                metadata=json.dumps(current_metadata)
            )
            
            return Response({
                'success': True,
                'participant': participant_identity,
                'status': new_status
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='(?P<room_name>[^/.]+)/participants/(?P<identity>[^/.]+)/mute')
    def mute_participant(self, request, room_name=None, identity=None):
        """Mute or unmute a participant's microphone"""
        mute = request.data.get('mute', True)
        
        try:
            from livekit import api
            from django.conf import settings
            
            async def mute_participant_async():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                
                req = room_proto.MuteRoomParticipantRequest(
                    room=room_name,
                    identity=identity,
                    muted=mute
                )
                
                result = await lk_api.room.mute_participant(req)
                await lk_api.aclose()
                return result
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(mute_participant_async())
            loop.close()
            
            return Response({
                'status': 'success',
                'message': f'Participant {identity} {"muted" if mute else "unmuted"}'
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=500)

    @action(detail=False, methods=['post'], url_path='(?P<room_name>[^/.]+)/participants/(?P<identity>[^/.]+)/kick')
    def kick_participant(self, request, room_name=None, identity=None):
        """Remove a participant from the room"""
        
        try:
            from livekit import api
            from django.conf import settings
            
            async def kick_participant_async():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                
                req = room_proto.RemoveParticipantRequest(
                    room=room_name,
                    identity=identity
                )
                
                result = await lk_api.room.remove_participant(req)
                await lk_api.aclose()
                return result
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(kick_participant_async())
            loop.close()
            
            return Response({
                'status': 'success',
                'message': f'Participant {identity} kicked from room'
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=500)

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        room = self.get_object()
        
        try:
            session = aiohttp.ClientSession()
            room_service = livekit_api.RoomService(
                session,
                settings.LIVEKIT_API_URL,
                settings.LIVEKIT_API_KEY,
                settings.LIVEKIT_API_SECRET
            )
            
            participants = room_service.list_participants(room.name)
            
            participant_list = []
            for p in participants:
                try:
                    metadata = json.loads(p.metadata) if p.metadata else {}
                except:
                    metadata = {}
                
                participant_list.append({
                    'identity': p.identity,
                    'name': p.name,
                    'metadata': metadata,
                    'is_publisher': p.permission.can_publish,
                    'joined_at': p.joined_at
                })
            
            return Response({'participants': participant_list})
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ============================================================
# Other ViewSets
# ============================================================
class WebRTCParticipantViewSet(viewsets.ModelViewSet):
    queryset = WebRTCParticipant.objects.all()
    serializer_class = WebRTCParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return WebRTCParticipant.objects.all()
        user_rooms = WebRTCRoom.objects.filter(host=user)
        return WebRTCParticipant.objects.filter(room__in=user_rooms)

    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        participant = self.get_object()
        participant.disconnect()
        return Response({'status': 'disconnected'})

class WebRTCSignalViewSet(viewsets.ModelViewSet):
    queryset = WebRTCSignal.objects.all()
    serializer_class = WebRTCSignalSerializer
    permission_classes = [permissions.IsAdminUser]

# ============================================================
# GuestRTMPEgressView
# ============================================================
class GuestRTMPEgressView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        return Response({'status': 'Guest RTMP Egress endpoint'})


# ============================================================
# LiveKitConnectionCheckView
# ============================================================
class LiveKitConnectionCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        return Response({
            'livekit_url': settings.LIVEKIT_URL,
            'livekit_configured': bool(
                getattr(settings, 'LIVEKIT_API_KEY', None) and 
                getattr(settings, 'LIVEKIT_API_SECRET', None)
            ),
            'status': 'Online',
            'timestamp': timezone.now().isoformat()
        })


# ============================================================
# LiveKitIngressView
# ============================================================
@async_to_sync
async def create_livekit_ingress(room_name, ingress_input, enable_transcoding):
    lk_api = api.LiveKitAPI(
        url=settings.LIVEKIT_API_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )
    
    request_data = ingress_types.CreateIngressRequest(
        input_type=ingress_input,
        name=f"OBS_Ingress_{room_name}_{int(time.time())}",
        room_name=room_name,
        participant_identity="broadcast_ingress",
        participant_name="Broadcast",
        enable_transcoding=enable_transcoding,
    )
    
    # This is the call that gets the ingress info
    result = await lk_api.ingress.create_ingress(request_data)
    await lk_api.aclose()
    return result
 
class LiveKitIngressView(APIView):
    permission_classes = [permissions.AllowAny]
 
    def post(self, request):
        room_name = request.data.get('room_name', 'Broadcast_Studio_A1')
        input_type = request.data.get('input_type', 'WHIP')
        
        if input_type.upper() == 'RTMP':
            ingress_input = ingress_types.IngressInput.RTMP_INPUT
            enable_transcoding = True
        else:
            ingress_input = ingress_types.IngressInput.WHIP_INPUT
            enable_transcoding = request.data.get('enable_transcoding', False)
        
        try:
            # Call the async function using the async_to_sync wrapper
            info = async_to_sync(create_livekit_ingress)(room_name, ingress_input, enable_transcoding)
            
            # =================================================================
            # CRUCIAL DEBUGGING STEP: Check your server console for this output
            print("--- LiveKit Ingress Info Received ---")
            print(info)
            print("-------------------------------------")
            # =================================================================
 
            return Response({
                'url': info.url,
                'stream_key': info.stream_key,
                'ingress_id': info.ingress_id,
                'room_name': room_name  # or info.room_name
            })
        except Exception as e:
            print(f"Ingress error: {e}")
            return Response({'error': str(e)}, status=500)
 
# ============================================================
# LiveKitStreamKeyView
# ============================================================
@method_decorator(csrf_exempt, name='dispatch')
class LiveKitStreamKeyView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        import asyncio
        import time
        import hashlib
        import jwt
        from datetime import datetime, timedelta
        from livekit import api
        from livekit.protocol import ingress as ingress_proto
        from django.conf import settings
        
        room_name = request.data.get('room_name', 'Broadcast_Studio_A1')
        streamer_name = request.data.get('streamer_name', 'OBS Streamer')
        input_type_str = request.data.get('input_type', 'RTMP').upper()
        
        input_type_map = {
            'RTMP': ingress_proto.IngressInput.RTMP_INPUT,
            'WHIP': ingress_proto.IngressInput.WHIP_INPUT,
        }
        input_type = input_type_map.get(input_type_str, ingress_proto.IngressInput.RTMP_INPUT)
        
        # Use a consistent, identifiable participant identity for WHIP ingress
        # This allows the system to distinguish WHIP tracks from VirtualCam tracks
        if input_type == ingress_proto.IngressInput.WHIP_INPUT:
            # Use a fixed identity so the system can detect WHIP is active
            streamer_identity = f"whip_ingress_host"
            streamer_name = "WHIP Ingress (Primary)"
        else:
            streamer_identity = request.data.get('streamer_identity', f'streamer_{int(time.time())}')
        
        async def create_ingress():
            lk_api = api.LiveKitAPI(
                url=settings.LIVEKIT_API_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            
            req = ingress_proto.CreateIngressRequest(
                input_type=input_type,
                name=f"{input_type_str}_Stream_{room_name}_{int(time.time())}",
                room_name=room_name,
                participant_identity=streamer_identity,
                participant_name=streamer_name,
                # Bypass mode — saves server CPU. Egress handles re-encode for RTMP.
                enable_transcoding=False,
                audio=ingress_types.IngressAudioOptions(
                    name="OBS Audio",
                    source=2  # TrackSource.MICROPHONE,
                ),
                video=ingress_types.IngressVideoOptions(
                    name="OBS Video",
                    source=1  # TrackSource.CAMERA,
                ),
            )
            
            result = await lk_api.ingress.create_ingress(req)
            return result
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            info = loop.run_until_complete(create_ingress())
            loop.close()
            
            # Extract host from LiveKit URL
            host = settings.LIVEKIT_URL.replace('wss://', '').replace('https://', '').split(':')[0]
            
            if input_type == ingress_proto.IngressInput.WHIP_INPUT:
                # WHIP endpoint configuration
                whip_base_url = getattr(settings, 'WHIP_BASE_URL', f'https://{host}/whip')
                # Use /w (your custom endpoint) - can be configured in settings
                whip_endpoint = getattr(settings, 'WHIP_ENDPOINT', 'https://vdo.yourdomain.com/w')
                
                # Generate a JWT Bearer token for WHIP authentication
                # This token is longer and contains grants for the specific stream
                whip_token = self._generate_whip_token(
                    stream_key=info.stream_key,
                    room_name=room_name,
                    identity=streamer_identity,
                    expires_in=3600  # 1 hour token validity
                )
                
                full_whip_url = f"{whip_endpoint}/{info.stream_key}"
                
                return Response({
                    'status': 'success',
                    'ingress_id': info.ingress_id,
                    'stream_key': info.stream_key,
                    'bearer_token': whip_token,  # The longer JWT token for WHIP
                    'url': full_whip_url,
                    'whip_endpoint': whip_endpoint,
                    'input_type': 'WHIP',
                    'room_name': room_name,
                    'streamer_name': streamer_name,
                    'source': 'livekit',
                    'authentication': {
                        'type': 'Bearer Token',
                        'header': f'Authorization: Bearer {whip_token[:20]}...',
                        'token_lifespan': '1 hour (configurable)'
                    },
                    'setup_instructions': {
                        'webrtc': 'For WHIP clients: Use the Bearer token in Authorization header',
                        'example_curl': f'curl -X POST "{full_whip_url}" -H "Authorization: Bearer {whip_token}"',
                        'client_implementation': 'WHIP-compatible WebRTC clients must include the Bearer token'
                    }
                })
            else:
                # RTMP response - simpler, static stream key
                rtmp_base = getattr(settings, 'RTMP_BASE_URL', f'rtmp://{host}:1936/x')
                rtmp_server = getattr(settings, 'RTMP_ENDPOINT', 'rtmp://vdo.yourdomain.com/x')
                full_rtmp_url = f"{rtmp_server}/{info.stream_key}"
                
                return Response({
                    'status': 'success',
                    'ingress_id': info.ingress_id,
                    'stream_key': info.stream_key,
                    'url': rtmp_server,
                    'full_rtmp_url': full_rtmp_url,
                    'input_type': 'RTMP',
                    'room_name': room_name,
                    'streamer_name': streamer_name,
                    'source': 'livekit',
                    'authentication': {
                        'type': 'Stream Key',
                        'usage': 'Enter directly in OBS Stream Key field'
                    }
                })
                
        except Exception as e:
            print(f"LiveKit ingress failed: {e}")
            return Response({
                'status': 'error',
                'message': f"Failed to create ingress: {str(e)}"
            }, status=500)
    
    def _generate_whip_token(self, stream_key, room_name, identity, expires_in=3600):
        """Generate a JWT Bearer token for WHIP authentication"""
        from django.conf import settings
        
        now = datetime.utcnow()
        expire_time = now + timedelta(seconds=expires_in)
        
        # WHIP token payload with LiveKit grants
        payload = {
            'iss': settings.LIVEKIT_API_KEY,
            'exp': expire_time,
            'nbf': now,
            'sub': identity,
            'video': {
                'room': room_name,
                'roomJoin': True,
                'canPublish': True,
                'canSubscribe': False
            },
            'ingress': {
                'stream_key': stream_key,
                'can_publish': True
            }
        }
        
        # Sign with API secret - this creates the longer token
        token = jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm='HS256')
        return token
        
        
@method_decorator(csrf_exempt, name='dispatch')
class LiveKitEgressView(APIView):
    """
    Django egress API endpoint.
    IMPORTANT: The frontend (streaming-admin.tsx) primarily uses the Next.js route handler
    at /api/webrtc/egress/ for LiveKit SDK operations. This Django endpoint is a
    secondary/backup path for some operations like listing egress platforms.
    
    JWT authentication is enforced so that only authenticated staff users can control
    LiveKit egress. The frontend sends Bearer tokens in the Authorization header.
    """
    permission_classes = [permissions.IsAdminUser]
    throttle_classes = []  # No throttle — director-control polls every 5-30s
    
    def post(self, request):
        import asyncio
        from livekit import api
        from livekit.protocol import egress
        from django.conf import settings
        from members.models import StreamingPlatform
        
        action = request.data.get('action', '')
        room_name = request.data.get('room_name', 'Broadcast_Studio_A1')
        # Optional encoding preset: "portrait" (default, 1080×1920) or "landscape" (1920×1080)
        encoding_preset = request.data.get('encoding_preset', 'portrait')
        
        # ============================================================
        # List enabled platforms (for frontend Configure Multicasting)
        # ============================================================
        if action == 'list':
            platforms = StreamingPlatform.objects.filter(is_enabled=True)
            platform_list = []
            for platform in platforms:
                platform_list.append({
                    'id': platform.id,
                    'name': platform.name,
                    'platform_type': platform.platform_type,
                    'rtmp_url': platform.rtmp_url,
                    'stream_key_masked': platform.stream_key[:4] + '****' + platform.stream_key[-4:] if len(platform.stream_key) > 8 else '****',
                    'is_enabled': platform.is_enabled,
                    'is_active': platform.is_active,
                })
            return Response({
                'status': 'success',
                'platforms': platform_list
            })
        
        # ============================================================
        # Check egress status
        # ============================================================
        elif action == 'status':
            async def check_egress():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                try:
                    egress_list = await lk_api.egress.list_egress(
                        egress.ListEgressRequest(room_name=room_name)
                    )
                    
                    active_egresses = [e for e in egress_list.items if e.status == 1]  # EGRESS_ACTIVE
                    
                    # Detect if running egress is recording (file output) or streaming (RTMP output)
                    is_recording = False
                    is_streaming = False
                    active_count = 0
                    
                    for e in active_egresses:
                        active_count += 1
                        if e.file_outputs and len(e.file_outputs) > 0:
                            is_recording = True
                        if e.stream_outputs and len(e.stream_outputs) > 0:
                            is_streaming = True
                    
                    return {
                        'status': 'success',
                        'is_running': len(active_egresses) > 0,
                        'is_recording': is_recording,
                        'is_streaming': is_streaming,
                        'active_count': active_count,
                        'egress_id': active_egresses[0].egress_id if active_egresses else None,
                        'platforms': [],
                        'started_at': str(active_egresses[0].started_at) if active_egresses else None
                    }
                finally:
                    await lk_api.aclose()
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(check_egress())
                loop.close()
                return Response(result)
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=500)
        
        # ============================================================
        # Start TrackComposite Egress (host tracks only, single egress for all platforms)
        # ============================================================
        elif action == 'start_track_composite':
            # Support platform_ids parameter for starting specific platforms only
            platform_ids = request.data.get('platform_ids', None)
            if platform_ids and len(platform_ids) > 0:
                platforms = StreamingPlatform.objects.filter(id__in=platform_ids, is_enabled=True)
            else:
                # Legacy behavior: start all enabled platforms
                platforms = StreamingPlatform.objects.filter(is_enabled=True)
            
            if not platforms.exists():
                return Response({
                    'status': 'error',
                    'message': 'No enabled platforms found'
                }, status=400)
            
            # Build RTMP URLs (single egress with multiple outputs)
            urls = []
            for platform in platforms:
                base_url = platform.rtmp_url.rstrip('/')
                full_url = f"{base_url}/{platform.stream_key}"
                urls.append(full_url)
            
            async def get_host_track_ids():
                """Get only the host's audio/video track IDs"""
                from livekit.protocol import room as room_proto
                
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                
                req = room_proto.ListParticipantsRequest(room=room_name)
                resp = await lk_api.room.list_participants(req)
                
                # Find host participant - identity 'whip_ingress_host', 'obs', or 'host'
                host_audio_id = None
                host_video_id = None
                
                for p in resp.participants:
                    is_host = (
                        p.identity == 'whip_ingress_host' or
                        p.identity == 'host' or
                        'whip' in (p.name or '').lower() or
                        'obs' in p.identity.lower() or
                        'ingress' in (p.name or '').lower()
                    )
                    
                    if not is_host:
                        continue
                    
                    for track in p.tracks:
                        if track.type == 0:  # AUDIO
                            host_audio_id = track.sid
                        elif track.type == 1:  # VIDEO
                            host_video_id = track.sid
                
                await lk_api.aclose()
                return host_audio_id, host_video_id, len(resp.participants)
            
            # First get host track IDs
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            audio_id, video_id, participant_count = loop.run_until_complete(get_host_track_ids())
            loop.close()
            
            if not video_id and not audio_id:
                return Response({
                    'status': 'error',
                    'message': 'No host tracks found. Make sure OBS is streaming to LiveKit first.'
                }, status=400)
            
            async def start_egress():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                try:
                    # Choose encoding preset based on orientation
                    if encoding_preset == 'landscape':
                        egress_preset = egress.EncodingOptionsPreset.H264_1080P_30
                    else:
                        egress_preset = egress.EncodingOptionsPreset.PORTRAIT_H264_1080P_30

                    # Single TrackCompositeEgressRequest with all RTMP URLs
                    # Only host tracks, so no guest camera/audio gets included
                    # DRIFT FIX: audio_tempo_controller in egress.yaml handles sync, NOT advanced codec options
                    # (Explicit AAC codec causes RTMP audio to be dropped by YouTube/Facebook)
                    req = egress.TrackCompositeEgressRequest(
                        room_name=room_name,
                        audio_track_id=audio_id,
                        video_track_id=video_id,
                        preset=egress_preset,
                        stream_outputs=[egress.StreamOutput(
                            protocol=egress.StreamProtocol.RTMP,
                            urls=urls
                        )]
                    )
                    
                    result = await lk_api.egress.start_track_composite_egress(req)
                    return result
                finally:
                    await lk_api.aclose()
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(start_egress())
                loop.close()
                
                return Response({
                    'status': 'success',
                    'message': f'Started streaming to {platforms.count()} platforms with host tracks only',
                    'egress_id': result.egress_id,
                    'audio_track_id': audio_id,
                    'video_track_id': video_id
                })
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=500)
        
        # ============================================================
        # Get current track IDs from room
        # ============================================================
        elif action == 'get_track_ids':
            def get_tracks_sync():
                from livekit.protocol import room as room_proto
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    lk_api = api.LiveKitAPI(
                        url=settings.LIVEKIT_API_URL,
                        api_key=settings.LIVEKIT_API_KEY,
                        api_secret=settings.LIVEKIT_API_SECRET,
                    )
                    
                    async def _fetch():
                        req = room_proto.ListParticipantsRequest(room=room_name)
                        resp = await lk_api.room.list_participants(req)
                        
                        host_audio_id = None
                        host_video_id = None
                        other_audio_id = None
                        other_video_id = None
                        
                        for p in resp.participants:
                            is_host = (
                                p.identity == 'whip_ingress_host' or
                                p.identity == 'host' or
                                'whip' in (p.name or '').lower() or
                                'obs' in p.identity.lower() or
                                'ingress' in (p.name or '').lower() or
                                'obs' in (p.name or '').lower() or
                                'host' in (p.metadata or '').lower()
                            )
                            
                            for track in p.tracks:
                                if track.type == 0:  # AUDIO
                                    if is_host:
                                        host_audio_id = track.sid
                                    elif other_audio_id is None:
                                        other_audio_id = track.sid
                                elif track.type == 1:  # VIDEO
                                    if is_host:
                                        host_video_id = track.sid
                                    elif other_video_id is None:
                                        other_video_id = track.sid
                        
                        await lk_api.aclose()
                        return host_audio_id or other_audio_id, host_video_id or other_video_id, len(resp.participants)
                    
                    return loop.run_until_complete(_fetch())
                finally:
                    loop.close()
            
            try:
                audio_id, video_id, participant_count = get_tracks_sync()
                
                return Response({
                    'status': 'success',
                    'audio_track_id': audio_id,
                    'video_track_id': video_id,
                    'participant_count': participant_count,
                    'host_audio_id': audio_id,
                    'host_video_id': video_id
                })
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=500)
        
        # ============================================================
        # Stop egress (RTMP streaming)
        # ============================================================
        elif action == 'stop':
            async def stop_egress():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                try:
                    egress_list = await lk_api.egress.list_egress(
                        egress.ListEgressRequest(room_name=room_name)
                    )
                    
                    stopped_any = False
                    ended_any = False
                    
                    for e in egress_list.items:
                        if e.room_name == room_name:
                            if e.status == 1:  # EGRESS_ACTIVE
                                await lk_api.egress.stop_egress(
                                    egress.StopEgressRequest(egress_id=e.egress_id)
                                )
                                stopped_any = True
                            elif e.status in (2, 3):  # EGRESS_ENDING or EGRESS_COMPLETE
                                ended_any = True
                    
                    return {
                        'stopped': stopped_any,
                        'already_ended': ended_any,
                        'found_any': len([e for e in egress_list.items if e.room_name == room_name]) > 0
                    }
                finally:
                    await lk_api.aclose()
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(stop_egress())
                loop.close()
                
                if result['stopped']:
                    return Response({'status': 'success', 'message': '✅ Stream stopped successfully'})
                elif result['already_ended']:
                    return Response({'status': 'success', 'message': 'Stream had already ended'})
                elif result['found_any']:
                    return Response({'status': 'success', 'message': 'No active stream found (all ended)'})
                else:
                    return Response({'status': 'success', 'message': 'No stream was running'})
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=500)
        
        # ============================================================
        # Start recording to file (TrackComposite + file_output)
        # ============================================================
        elif action == 'start_record':
            async def get_track_ids():
                from livekit.protocol import room as room_proto
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                try:
                    req = room_proto.ListParticipantsRequest(room=room_name)
                    resp = await lk_api.room.list_participants(req)
                    
                    host_audio_id = None
                    host_video_id = None
                    any_audio_id = None
                    any_video_id = None
                    
                    for p in resp.participants:
                        is_host = (
                            p.identity == 'whip_ingress_host' or
                            p.identity == 'host' or
                            'whip' in (p.name or '').lower() or
                            'obs' in p.identity.lower() or
                            'ingress' in (p.name or '').lower()
                        )
                        for track in p.tracks:
                            if track.type == 0:
                                if is_host:
                                    host_audio_id = track.sid
                                elif any_audio_id is None:
                                    any_audio_id = track.sid
                            elif track.type == 1:
                                if is_host:
                                    host_video_id = track.sid
                                elif any_video_id is None:
                                    any_video_id = track.sid
                    
                    return host_audio_id or any_audio_id, host_video_id or any_video_id
                finally:
                    await lk_api.aclose()
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            audio_id, video_id = loop.run_until_complete(get_track_ids())
            loop.close()
            
            if not video_id and not audio_id:
                return Response({
                    'status': 'error',
                    'message': 'No tracks found in room. Make sure participants are streaming.'
                }, status=400)
            
            async def start_recording():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                try:
                    # Build recording filepath with templated variables
                    filepath = f"recordings/{room_name}/{room_name}-{{time}}"
                    
                    if encoding_preset == 'landscape':
                        egress_preset = egress.EncodingOptionsPreset.H264_1080P_30
                    else:
                        egress_preset = egress.EncodingOptionsPreset.PORTRAIT_H264_1080P_30
                    
                    req = egress.TrackCompositeEgressRequest(
                        room_name=room_name,
                        audio_track_id=audio_id,
                        video_track_id=video_id,
                        preset=egress_preset,
                        advanced=egress.EncodingOptions(
                            audio_codec=egress.AudioCodec.AAC,
                            audio_frequency=48000,
                            audio_bitrate=128,
                        ),
                        file_outputs=[egress.EncodedFileOutput(
                            filepath=filepath,
                            # Disable cloud upload — write to local disk
                            disable_manifest=True,
                        )]
                    )
                    
                    result = await lk_api.egress.start_track_composite_egress(req)
                    return result
                finally:
                    await lk_api.aclose()
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(start_recording())
                loop.close()
                
                return Response({
                    'status': 'success',
                    'message': 'Recording started successfully',
                    'egress_id': result.egress_id,
                    'audio_track_id': audio_id,
                    'video_track_id': video_id,
                })
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=500)
        
        # ============================================================
        # Stop recording (file egress)
        # ============================================================
        elif action == 'stop_record':
            async def stop_recording():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_API_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                try:
                    egress_list = await lk_api.egress.list_egress(
                        egress.ListEgressRequest(room_name=room_name)
                    )
                    
                    stopped_any = False
                    for e in egress_list.items:
                        if e.room_name == room_name and e.status == 1:
                            # Check if this is a file egress (not RTMP streaming)
                            has_file_output = e.file_outputs and len(e.file_outputs) > 0
                            if has_file_output:
                                await lk_api.egress.stop_egress(
                                    egress.StopEgressRequest(egress_id=e.egress_id)
                                )
                                stopped_any = True
                    
                    return {'stopped': stopped_any}
                finally:
                    await lk_api.aclose()
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(stop_recording())
                loop.close()
                
                if result['stopped']:
                    return Response({'status': 'success', 'message': 'Recording stopped successfully'})
                else:
                    return Response({'status': 'success', 'message': 'No active recording found'})
            except Exception as e:
                return Response({'status': 'error', 'message': str(e)}, status=500)
        
        return Response({'error': f'Unknown action: {action}'}, status=400)
        
        # ============================================================
        # Signal Quality View
        # ============================================================    
class ParticipantQualityView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request, room_name):
        import asyncio
        from livekit import api
        from django.conf import settings
        
        async def get_quality_data():
            lk_api = api.LiveKitAPI(
                url=settings.LIVEKIT_API_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            try:
                req = api.ListParticipantsRequest(room=room_name)
                participants = await lk_api.room.list_participants(req)
                
                quality_data = {}
                for p in participants.participants:
                    # Get RTC stats for this participant
                    stats = await lk_api.room.get_participant_stats(
                        api.RoomParticipantIdentity(
                            room=room_name,
                            identity=p.identity
                        )
                    )
                    
                    # Calculate quality metrics
                    packets_lost = getattr(stats, 'packets_lost', 0) or 0
                    packets_received = getattr(stats, 'packets_received', 0) or 0
                    rtt = getattr(stats, 'round_trip_time', 0) or 0
                    jitter_val = getattr(stats, 'jitter', 0) or 0
                    
                    packet_loss = packets_lost / (packets_lost + packets_received) if packets_received > 0 else 0
                    
                    if packet_loss < 0.01:
                        quality = 'excellent'
                    elif packet_loss < 0.05:
                        quality = 'good'
                    else:
                        quality = 'poor'
                    
                    quality_data[p.identity] = {
                        'quality': quality,
                        'packetLoss': round(packet_loss * 100, 1),
                        'latency': rtt,
                        'jitter': jitter_val,
                    }
                
                return quality_data
            finally:
                await lk_api.aclose()
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(get_quality_data())
            loop.close()
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
# ============================================================
# Check Room Status director-control/page.tsx 
# ============================================================
        
class RoomStatusByNameView(APIView):
    """Get room status by room name (not database ID)
    
    Returns participant list with:
    - Parsed JSON metadata
    - Track info (has_video/has_audio)
    - Viewer/host detection
    - Raised hand status
    
    No authentication required — used by director control page polling.
    """
    authentication_classes = []  # No auth needed — room status is public info
    permission_classes = [permissions.AllowAny]
    throttle_classes = []  # No throttle — director-control polls every 5-30s
    
    def get(self, request, room_name):
        import asyncio
        from livekit import api
        from django.conf import settings
        import json as json_module
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._get_room_status(room_name))
            loop.close()
            return Response(result)
        except Exception as e:
            return Response({
                'error': str(e),
                'room_name': room_name,
                'is_live': False,
                'participant_count': 0,
                'viewer_count': 0,
                'host_connected': False,
                'participants': [],
                'whip_ingress_active': False,
            }, status=500)
    
    async def _get_room_status(self, room_name):
        from livekit.protocol import room as room_proto
        
        lk_api = api.LiveKitAPI(
            url=settings.LIVEKIT_API_URL,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
        )
        
        try:
            # List participants in the room
            participants = await lk_api.room.list_participants(
                room_proto.ListParticipantsRequest(room=room_name)
            )
            
            host_connected = False
            participant_list = []
            viewer_count = 0
            
            for p in participants.participants:
                # Parse JSON metadata
                metadata = {}
                if p.metadata:
                    try:
                        metadata = json.loads(p.metadata)
                    except (json.JSONDecodeError, TypeError):
                        metadata = {'raw': p.metadata}
                
                # Detect track types (type 0=audio, 1=video)
                has_video = any(t.type == 1 for t in p.tracks)
                has_audio = any(t.type == 0 for t in p.tracks)
                
                p_identity = p.identity or ''
                p_name = p.name or ''
                
                # Detect host participants
                is_host = (
                    p_identity == 'whip_ingress_host' or
                    p_identity == 'host' or
                    p_identity == 'host-user' or
                    p_identity.lower() == 'obs' or
                    'whip' in p_name.lower() or
                    'ingress' in p_name.lower() or
                    (p_identity.lower().startswith('host') and 
                     not p_identity.lower().startswith('host_') and
                     not 'guest' in p_identity.lower() and
                     not 'viewer' in p_identity.lower())
                )
                
                if is_host:
                    host_connected = True
                
                # Detect viewer participants (by role metadata or identity prefix)
                is_viewer = (
                    metadata.get('role') == 'viewer' or
                    p_identity.lower().startswith('viewer_')
                )
                if is_viewer:
                    viewer_count += 1
                
                participant_list.append({
                    'identity': p_identity,
                    'name': p_name or p_identity,
                    'joined_at': str(p.joined_at),
                    'metadata': metadata,
                    'has_video': has_video,
                    'has_audio': has_audio,
                    'is_host': is_host,
                    'is_viewer': is_viewer,
                    'raised_hand': metadata.get('raised_hand', False),
                    'status': metadata.get('status', 'waiting'),
                })
            
            # Additional host detection: check if any participant has whip in their name/identity
            if not host_connected:
                for p in participants.participants:
                    p_name = p.name or ''
                    p_identity = p.identity or ''
                    if ('whip' in p_name.lower() or 'ingress' in p_name.lower() or
                        'whip' in p_identity.lower() or 'ingress' in p_identity.lower()):
                        host_connected = True
                        break
            
            return {
                'room_name': room_name,
                'is_live': len(participant_list) > 0,
                'participant_count': len(participant_list),
                'viewer_count': viewer_count,
                'host_connected': host_connected,
                'participants': participant_list,
                'whip_ingress_active': any(p['identity'] == 'whip_ingress_host' for p in participant_list),
            }
            
        finally:
            await lk_api.aclose()
