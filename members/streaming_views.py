"""
Streaming Platform Views for Multi-Platform Broadcasting
"""
from rest_framework import serializers, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from django.utils import timezone
from django.db import transaction
from .models import StreamingPlatform, StreamingSession
from livekit.protocol import egress as egress_types
import secrets
import json
import logging
import asyncio
import aiohttp
import time
from livekit import api
from livekit.protocol import ingress as ingress_types

logger = logging.getLogger(__name__)

# ============================================================================
# SERIALIZERS
# ============================================================================

class StreamingPlatformSerializer(serializers.ModelSerializer):
    full_rtmp_url = serializers.SerializerMethodField()
    
    class Meta:
        model = StreamingPlatform
        fields = [
            'id', 'name', 'platform_type', 'rtmp_url', 'stream_key',
            'is_enabled', 'is_active', 'last_test', 'test_status',
            'created_at', 'updated_at', 'youtube_broadcast_id',
            'facebook_page_id', 'instagram_account_id', 'tiktok_username', 'custom_settings',
            'full_rtmp_url'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_test', 'test_status', 'is_active']
    
    def get_full_rtmp_url(self, obj):
        return obj.get_full_rtmp_url()
    
    def validate_stream_key(self, value):
        if self.context.get('request') and self.context['request'].method in ['GET', 'HEAD']:
            if value and len(value) > 4:
                return f"{value[:4]}****{value[-4:]}"
        return value
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'stream_key' in data and self.context.get('request') and self.context['request'].method in ['GET', 'HEAD']:
            if data['stream_key'] and len(data['stream_key']) > 8:
                data['stream_key'] = f"{data['stream_key'][:4]}****{data['stream_key'][-4:]}"
        return data


class StreamingSessionSerializer(serializers.ModelSerializer):
    platforms = StreamingPlatformSerializer(many=True, read_only=True)
    platform_ids = serializers.PrimaryKeyRelatedField(
        queryset=StreamingPlatform.objects.filter(is_enabled=True),
        many=True,
        write_only=True,
        source='platforms'
    )
    
    class Meta:
        model = StreamingSession
        fields = [
            'id', 'session_id', 'platforms', 'platform_ids',
            'started_at', 'ended_at', 'duration', 'viewer_count',
            'bitrate', 'is_active', 'total_viewers', 'peak_viewers',
            'total_duration'
        ]
        read_only_fields = [
            'session_id', 'started_at', 'ended_at', 'duration',
            'viewer_count', 'bitrate', 'is_active', 'total_viewers',
            'peak_viewers', 'total_duration'
        ]


# ============================================================================
# VIEWSETS
# ============================================================================

class StreamingPlatformViewSet(viewsets.ModelViewSet):
    queryset = StreamingPlatform.objects.all().order_by('platform_type', 'name')
    serializer_class = StreamingPlatformSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        platform_type = self.request.query_params.get('platform_type')
        if platform_type:
            queryset = queryset.filter(platform_type=platform_type)
        enabled = self.request.query_params.get('enabled')
        if enabled is not None:
            queryset = queryset.filter(is_enabled=enabled.lower() == 'true')
        return queryset
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        platform = self.get_object()
        platform.last_test = timezone.now()
        platform.test_status = True
        platform.save()
        return Response({
            'status': 'success',
            'message': f'Connection test completed for {platform.name}',
            'last_test': platform.last_test,
            'test_status': platform.test_status
        })
    
    @action(detail=True, methods=['post'])
    def toggle_enabled(self, request, pk=None):
        platform = self.get_object()
        platform.is_enabled = not platform.is_enabled
        platform.save()
        return Response({
            'status': 'success',
            'message': f'{platform.name} is now {"enabled" if platform.is_enabled else "disabled"}',
            'is_enabled': platform.is_enabled
        })
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        platform = self.get_object()
        platform.is_active = not platform.is_active
        platform.save()
        return Response({
            'status': 'success',
            'message': f'{platform.name} is now {"active" if platform.is_active else "inactive"}',
            'is_active': platform.is_active
        })


class StreamingSessionViewSet(viewsets.ModelViewSet):
    queryset = StreamingSession.objects.all().order_by('-started_at')
    serializer_class = StreamingSessionSerializer
    permission_classes = [IsAdminUser]
    
    @transaction.atomic
    def create(self, request):
        session_id = f"session_{secrets.token_hex(8)}"
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            session = serializer.save(session_id=session_id)
            for platform in session.platforms.all():
                platform.is_active = True
                platform.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @transaction.atomic
    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        session = self.get_object()
        if not session.is_active:
            return Response({
                'status': 'error',
                'message': 'Session is already stopped'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        for platform in session.platforms.all():
            platform.is_active = False
            platform.save()
        
        session.is_active = False
        session.ended_at = timezone.now()
        session.duration = int((session.ended_at - session.started_at).total_seconds())
        session.save()
        
        return Response({
            'status': 'success',
            'message': 'Streaming session stopped',
            'session_id': session.session_id,
            'duration': session.duration
        })
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        current_session = StreamingSession.objects.filter(is_active=True).first()
        if current_session:
            serializer = self.get_serializer(current_session)
            return Response(serializer.data)
        return Response({
            'status': 'no_active_session',
            'message': 'No active streaming session'
        })


# ============================================================================
# API VIEWS
# ============================================================================

class StreamingStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        platforms = StreamingPlatform.objects.filter(is_enabled=True)
        current_session = StreamingSession.objects.filter(is_active=True).first()
        
        platform_status = []
        for platform in platforms:
            platform_status.append({
                'id': platform.id,
                'name': platform.name,
                'platform_type': platform.platform_type,
                'is_enabled': platform.is_enabled,
                'is_active': platform.is_active,
                'test_status': platform.test_status,
                'last_test': platform.last_test,
                'full_rtmp_url': platform.get_full_rtmp_url() if request.user.is_staff else None
            })
        
        session_info = None
        if current_session:
            session_info = {
                'session_id': current_session.session_id,
                'started_at': current_session.started_at,
                'duration': current_session.duration,
                'viewer_count': current_session.viewer_count,
                'bitrate': current_session.bitrate,
                'platform_count': current_session.platforms.count()
            }
        
        return Response({
            'status': 'success',
            'platforms': platform_status,
            'current_session': session_info,
            'total_platforms': platforms.count(),
            'active_platforms': platforms.filter(is_active=True).count(),
            'timestamp': timezone.now()
        })


class StreamingControlView(APIView):
    """
    Control streaming to multiple platforms using LiveKit Egress
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        import asyncio
        from livekit import api
        from django.conf import settings
        
        platform_ids = request.data.get('platform_ids', [])
        action_type = request.data.get('action', 'start')
        room_name = request.data.get('room_name', 'Broadcast_Studio_A1')
        # Optional encoding preset: "portrait" (default, 1080×1920) or "landscape" (1920×1080)
        encoding_preset = request.data.get('encoding_preset', 'portrait')
        
        if not platform_ids:
            return Response({
                'status': 'error',
                'message': 'No platform IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        platforms = StreamingPlatform.objects.filter(id__in=platform_ids, is_enabled=True)
        
        # Helper to get host-only track IDs
        async def get_host_track_ids():
            from livekit.protocol import room as room_proto
            lk_api = api.LiveKitAPI(
                url=settings.LIVEKIT_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            try:
                req = room_proto.ListParticipantsRequest(room=room_name)
                resp = await lk_api.room.list_participants(req)
                
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
                return host_audio_id, host_video_id, len(resp.participants)
            finally:
                await lk_api.aclose()
        
        async def start_track_composite_egress():
            lk_api = api.LiveKitAPI(
                url=settings.LIVEKIT_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            try:
                # Get host track IDs first
                audio_id, video_id, participant_count = await get_host_track_ids()
                
                if not video_id and not audio_id:
                    return {
                        'status': 'error',
                        'message': 'No host tracks found. Make sure OBS is streaming to LiveKit first.'
                    }
                
                # Build all RTMP URLs
                urls = []
                for platform in platforms:
                    base_url = platform.rtmp_url.rstrip('/')
                    full_url = f"{base_url}/{platform.stream_key}"
                    urls.append(full_url)
                
                # Choose encoding preset based on orientation
                if encoding_preset == 'landscape':
                    preset = egress_types.EncodingOptionsPreset.H264_1080P_30
                else:
                    preset = egress_types.EncodingOptionsPreset.PORTRAIT_H264_1080P_30

                # Single egress for ALL platforms (one call, multiple destinations)
                # DRIFT FIX: audio_tempo_controller in egress.yaml handles sync, NOT advanced codec options
                # (Explicit AAC codec causes RTMP audio to be dropped by YouTube/Facebook)
                egress_result = await lk_api.egress.start_track_composite_egress(
                    egress_types.TrackCompositeEgressRequest(
                        room_name=room_name,
                        audio_track_id=audio_id,
                        video_track_id=video_id,
                        preset=preset,
                        stream_outputs=[egress_types.StreamOutput(
                            protocol=egress_types.StreamProtocol.RTMP,
                            urls=urls
                        )]
                    )
                )

                
                # Mark all platforms as active
                for platform in platforms:
                    platform.is_active = True
                    platform.save()
                
                return {
                    'status': 'success',
                    'message': f'Started streaming to {platforms.count()} platform(s) with host tracks only',
                    'egress_id': egress_result.egress_id,
                    'action': 'start_track_composite'
                }
            finally:
                await lk_api.aclose()
        
        async def stop_egress():
            lk_api = api.LiveKitAPI(
                url=settings.LIVEKIT_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
            try:
                for platform in platforms:
                    try:
                        # List egresses to find active ones
                        egress_list = await lk_api.egress.list_egress(
                            egress_types.ListEgressRequest(room_name=room_name)
                        )
                        for e in egress_list.items:
                            if e.room_name == room_name and e.status == 1:  # EGRESS_ACTIVE
                                await lk_api.egress.stop_egress(
                                    egress_types.StopEgressRequest(egress_id=e.egress_id)
                                )
                    except Exception as e:
                        logger.error(f"Failed to stop egress for {platform.name}: {e}")
                    
                    platform.is_active = False
                    platform.save()
                
                return {
                    'status': 'success',
                    'message': f'Stopped streaming to {platforms.count()} platform(s)',
                    'platforms': [p.name for p in platforms],
                    'action': 'stop'
                }
            finally:
                await lk_api.aclose()
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                if action_type == 'start_track_composite':
                    result = loop.run_until_complete(start_track_composite_egress())
                    return Response(result)
                elif action_type == 'stop':
                    result = loop.run_until_complete(stop_egress())
                    return Response(result)
                elif action_type == 'start':
                    # Legacy 'start' action - map to track_composite
                    result = loop.run_until_complete(start_track_composite_egress())
                    return Response(result)
                else:
                    return Response({
                        'status': 'error',
                        'message': f'Unknown action: {action_type}'
                    }, status=400)
            finally:
                loop.close()
        except ValueError as ve:
            # Handle LiveKit connection errors gracefully
            logger.error(f"Streaming control LiveKit error: {ve}")
            return Response({
                'status': 'error', 
                'message': f'LiveKit connection error: {str(ve)}. Check that LiveKit server is running.',
                'hint': 'Ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are correct'
            }, status=500)
        except Exception as e:
            logger.error(f"Streaming control error: {e}")
            return Response({
                'status': 'error', 
                'message': str(e)
            }, status=500)

class LiveKitRoomStatusView(APIView):
    """
    Check LiveKit room status and participant presence
    This ACTUALLY checks who is in the LiveKit room
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        import asyncio
        from livekit import api
        from django.conf import settings
        
        room_name = request.query_params.get('room_name', 'Broadcast_Studio_A1')
        
        try:
            async def get_room_status():
                from livekit.protocol import room as room_proto
                
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                
                try:
                    # List participants in the room (async call)
                    participants = await lk_api.room.list_participants(
                        room_proto.ListParticipantsRequest(room=room_name)
                    )
                    
                    host_present = False
                    guest_present = False
                    participant_list = []
                    whip_ingress_active = False
                    
                    for p in participants.participants:
                        participant_info = {
                            'identity': p.identity,
                            'name': p.name,
                            'joined_at': str(p.joined_at),
                        }
                        participant_list.append(participant_info)
                        
                        # Check if host is present (identity = 'host' or 'whip_ingress_host')
                        if p.identity == 'host' or p.identity == 'whip_ingress_host':
                            host_present = True
                            if p.identity == 'whip_ingress_host':
                                whip_ingress_active = True
                        else:
                            # Any other participant is considered a guest
                            guest_present = True
                    
                    return {
                        'status': 'success',
                        'room_name': room_name,
                        'host_present': host_present,
                        'guest_present': guest_present,
                        'participant_count': len(participant_list),
                        'participants': participant_list,
                        'is_live': host_present,
                        'whip_ingress_active': whip_ingress_active,
                        'timestamp': timezone.now()
                    }
                finally:
                    await lk_api.aclose()
            
            # Use new_event_loop pattern for Daphne compatibility
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(get_room_status())
                return Response(result)
            finally:
                loop.close()
            
        except Exception as e:
            logger.error(f"Error checking LiveKit room status: {e}")
            return Response({
                'status': 'error',
                'room_name': room_name,
                'host_present': False,
                'guest_present': False,
                'participant_count': 0,
                'whip_ingress_active': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StreamingStatisticsView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        total_platforms = StreamingPlatform.objects.count()
        enabled_platforms = StreamingPlatform.objects.filter(is_enabled=True).count()
        active_platforms = StreamingPlatform.objects.filter(is_active=True).count()
        
        total_sessions = StreamingSession.objects.count()
        active_sessions = StreamingSession.objects.filter(is_active=True).count()
        completed_sessions = StreamingSession.objects.filter(is_active=False).count()
        
        total_streaming_time = sum(session.duration for session in StreamingSession.objects.all())
        
        platform_types = {}
        for platform in StreamingPlatform.objects.all():
            platform_type = platform.get_platform_type_display()
            if platform_type not in platform_types:
                platform_types[platform_type] = {
                    'total': 0,
                    'enabled': 0,
                    'active': 0
                }
            platform_types[platform_type]['total'] += 1
            if platform.is_enabled:
                platform_types[platform_type]['enabled'] += 1
            if platform.is_active:
                platform_types[platform_type]['active'] += 1
        
        return Response({
            'status': 'success',
            'statistics': {
                'platforms': {
                    'total': total_platforms,
                    'enabled': enabled_platforms,
                    'active': active_platforms,
                    'by_type': platform_types
                },
                'sessions': {
                    'total': total_sessions,
                    'active': active_sessions,
                    'completed': completed_sessions,
                    'total_streaming_time_seconds': total_streaming_time,
                    'total_streaming_time_hours': round(total_streaming_time / 3600, 2)
                }
            },
            'timestamp': timezone.now()
        })


class WHIPIngressView(APIView):
    """
    Create and manage WHIP ingress for OBS Studio
    Provides WHIP URL and bearer token for OBS to connect as host
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """
        Create WHIP ingress for a room
        Returns WHIP URL and bearer token for OBS configuration
        """
        from django.conf import settings
        
        room_name = request.data.get('room_name', 'Broadcast_Studio_A1')
        # CRITICAL: Use 'whip_ingress_host' identity so egress host detection works!
        participant_identity = request.data.get('participant_identity', 'whip_ingress_host')
        participant_name = request.data.get('participant_name', 'OBS WHIP Host')
        
        try:
            # Create async function to call LiveKit API
            async def create_whip_ingress():
                # Initialize LiveKit API
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                
                # Create WHIP ingress request
                req = ingress_types.CreateIngressRequest(
                    input_type=ingress_types.IngressInput.WHIP_INPUT,
                    name=f"OBS_WHIP_{room_name}_{int(time.time())}",
                    room_name=room_name,
                    participant_identity=participant_identity,
                    participant_name=participant_name,
                    enable_transcoding=True,  # Enable transcoding for compatibility
                    audio=ingress_types.IngressAudioOptions(
                        name="OBS Audio",
                        source=2,  # MICROPHONE
                    ),
                    video=ingress_types.IngressVideoOptions(
                        name="OBS Video",
                        source=1,  # CAMERA
                        encoding_options=ingress_types.IngressVideoEncodingOptions(
                            video_codec=ingress_types.VideoCodec.H264_BASELINE,
                            frame_rate=30,
                            layers=[
                                ingress_types.VideoLayer(
                                    quality=ingress_types.VideoQuality.HIGH,
                                    width=1920,
                                    height=1080,
                                    bitrate=4000,
                                )
                            ]
                        )
                    )
                )
                
                # Create the ingress
                result = await lk_api.ingress.create_ingress(req)
                return result
            
            # Run the async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                ingress_info = loop.run_until_complete(create_whip_ingress())
                loop.close()
                
                # Construct WHIP URL
                # LiveKit WHIP URL format: https://[server]/whip/[ingress-id]
                server_url = settings.LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')
                server_host = server_url.replace('https://', '').replace('http://', '').split('/')[0]
                whip_url = f"https://{server_host}/whip/{ingress_info.ingress_id}"
                
                return Response({
                    'status': 'success',
                    'room_name': room_name,
                    'participant_identity': participant_identity,
                    'participant_name': participant_name,
                    'whip_url': whip_url,
                    'bearer_token': ingress_info.stream_key,
                    'ingress_id': ingress_info.ingress_id,
                    'stream_key': ingress_info.stream_key,
                    'created_at': timezone.now().isoformat(),
                    'note': 'Use this WHIP URL and Bearer token in OBS Studio WHIP settings'
                })
                
            except Exception as e:
                loop.close()
                logger.error(f"Failed to create WHIP ingress: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Failed to create WHIP ingress: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in WHIP ingress creation: {e}")
            return Response({
                'status': 'error',
                'message': f'Error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """
        Get existing WHIP ingress info for a room
        """
        room_name = request.query_params.get('room_name', 'Broadcast_Studio_A1')
        
        # Note: In a production system, you would store WHIP credentials in database
        # and retrieve them here. For now, we return a message indicating
        # WHIP needs to be generated.
        
        return Response({
            'status': 'info',
            'room_name': room_name,
            'message': 'WHIP credentials not found. Use POST to create WHIP ingress.',
            'note': 'WHIP credentials are not persisted in current implementation. Generate new credentials when needed.'
        })
    
    def delete(self, request):
        """
        Delete/revoke WHIP ingress for a room
        """
        from django.conf import settings
        
        room_name = request.data.get('room_name', 'Broadcast_Studio_A1')
        ingress_id = request.data.get('ingress_id')
        
        if not ingress_id:
            return Response({
                'status': 'error',
                'message': 'ingress_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            async def delete_ingress():
                lk_api = api.LiveKitAPI(
                    url=settings.LIVEKIT_URL,
                    api_key=settings.LIVEKIT_API_KEY,
                    api_secret=settings.LIVEKIT_API_SECRET,
                )
                
                await lk_api.ingress.delete_ingress(ingress_id)
                return True
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(delete_ingress())
                loop.close()
                
                return Response({
                    'status': 'success',
                    'message': f'WHIP ingress {ingress_id} deleted for room {room_name}',
                    'room_name': room_name,
                    'ingress_id': ingress_id
                })
                
            except Exception as e:
                loop.close()
                logger.error(f"Failed to delete WHIP ingress: {e}")
                return Response({
                    'status': 'error',
                    'message': f'Failed to delete WHIP ingress: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error deleting WHIP ingress: {e}")
            return Response({
                'status': 'error',
                'message': f'Error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
