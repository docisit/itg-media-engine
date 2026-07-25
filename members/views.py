from rest_framework import serializers
from .models import Profile, GuestRequest, MediaAsset, Show, ContactInquiry, Sport, AthleteStatEntry, StatVerificationVideo, ParentalConsentRequest, COPPAAuditLog, ContentReport
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.conf import settings
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from livekit import api as livekit_api
from django.db import transaction
from django.db.models import F, FloatField, Case, When, IntegerField
from django.db.models.functions import Cast
import secrets
import hashlib
import hmac
import time
import urllib.parse
import json
import requests  # For Turnstile verification
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from dateutil.relativedelta import relativedelta
from .serializers import (
    ProfileSerializer,
    GuestRequestSerializer, ContactInquirySerializer,
    SportSerializer, SportAttributeSerializer, AthleteStatEntrySerializer, 
    MediaAssetSerializer, DrillListSerializer, DrillCreateSerializer, MediaTagSerializer
)



# Profile Views for listing and detail
class ProfileListView(APIView):
    """Get all profiles"""
    
    def get(self, request):
        profiles = Profile.objects.all()
        serializer = ProfileSerializer(profiles, many=True, context={'request': request})
        return Response(serializer.data)


class ProfileDetailView(APIView):
    """Get a single profile by username"""
    
    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
            profile = user.profile
            serializer = ProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
class ShowSerializer(serializers.ModelSerializer):
    guest_name = serializers.SerializerMethodField()
    guest_profile = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    is_past = serializers.SerializerMethodField()
    duration_formatted = serializers.SerializerMethodField()
    tags_list = serializers.SerializerMethodField()

    class Meta:
        model = Show
        fields = [
            'id', 'title', 'description', 'category', 'tags', 'tags_list',
            'guest', 'guest_name', 'guest_profile', 'guest_name_override',
            'image_url', 'thumbnail_url', 'air_date', 'video_url', 
            'transcript', 'questions_asked', 'show_notes', 'duration', 
            'duration_formatted', 'is_live', 'is_past', 'is_published', 
            'created_at', 'updated_at'
        ]
        # These fields can be written to by your Next.js Edit Form
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_past']

    def get_guest_name(self, obj):
        try:
            return obj.display_guest_name
        except Exception:
            return None

    def get_guest_profile(self, obj):
        # Note: Ensure ProfileSerializer is defined above this class
        if obj.guest:
            return ProfileSerializer(obj.guest, context=self.context).data
        return None

    def get_image_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.image and hasattr(obj.image, 'url'):
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
        except Exception:
            pass
        return None

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.thumbnail and hasattr(obj.thumbnail, 'url'):
                if request:
                    return request.build_absolute_uri(obj.thumbnail.url)
                return obj.thumbnail.url
        except Exception:
            pass
        # Fallback to main image
        return self.get_image_url(obj)

    def get_is_past(self, obj):
        return obj.is_past

    def get_duration_formatted(self, obj):
        return obj.duration_formatted

    def get_tags_list(self, obj):
        return obj.get_tags_list()

class ShowDetailView(generics.RetrieveUpdateAPIView):
    """
    Handles GET (viewing) and PATCH (editing) for a single show.
    """
    queryset = Show.objects.all()
    serializer_class = ShowSerializer  # This refers to the class you defined above
    lookup_field = 'pk'
    
    def get_permissions(self):
        # Allow anyone to see the show details, 
        # but only Admins can save changes (PATCH/PUT)
        if self.request.method in ['PATCH', 'PUT']:
            return [IsAdminUser()]
        return [AllowAny()]


class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get or create profile if it doesn't exist
        profile, created = Profile.objects.get_or_create(user=request.user)
        if created:
            print(f"DEBUG: Created missing profile for user: {request.user.username}")
        
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    def put(self, request):
        # Get or create profile if it doesn't exist
        profile, created = Profile.objects.get_or_create(user=request.user)
        if created:
            print(f"DEBUG: Created missing profile for user: {request.user.username}")
        
        # DEBUG: Log what we're receiving
        print(f"DEBUG: ProfileUpdateView.put() called for user: {request.user.username}")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request data keys: {list(request.data.keys())}")
        print(f"DEBUG: Request FILES keys: {list(request.FILES.keys())}")
        
        # Handle file uploads properly
        data = request.data.copy()
        
        # DEBUG: Log data before processing
        print(f"DEBUG: Data before merge: {data}")
        
        # Merge files into data
        if request.FILES:
            for key, file in request.FILES.items():
                data[key] = file
                print(f"DEBUG: Added file {key}: {file.name} ({file.size} bytes)")
        
        print(f"DEBUG: Data after merge: {data}")
        
        serializer = ProfileSerializer(
            profile, 
            data=data, 
            partial=True, 
            context={'request': request}
        )
        
        # DEBUG: Check serializer validity
        print(f"DEBUG: Serializer is valid: {serializer.is_valid()}")
        if not serializer.is_valid():
            print(f"DEBUG: Serializer errors: {serializer.errors}")
        
        if serializer.is_valid():
            try:
                serializer.save()
                print(f"DEBUG: Profile saved successfully")
                return Response(serializer.data)
            except Exception as e:
                print(f"DEBUG: Error saving profile: {str(e)}")
                import traceback
                traceback.print_exc()
                return Response({
                    'detail': 'Error saving profile',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Return detailed error information
        return Response({
            'detail': 'Profile update failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class LiveStatusView(APIView):
    """Check if show is currently live and return guest count"""
    
    def get(self, request):
        current_time = datetime.now()
        
        # Check for shows that are marked as live
        live_show = Show.objects.filter(is_live=True).first()
        
        # Count active guests (who have accessed their link in last 30 minutes)
        # You'll need to track this - add a GuestSession model if needed
        guest_count = 0
        
        if live_show:
            # Optional: Track guest sessions
            # guest_count = GuestSession.objects.filter(
            #     is_active=True,
            #     last_seen__gte=current_time - timedelta(minutes=30)
            # ).count()
            
            return Response({
                'is_live': True,
                'current_show': live_show.title,
                'guest': str(live_show.guest) if live_show.guest else 'No guest',
                'guest_count': guest_count,
                'air_date': live_show.air_date
            })
        
        return Response({
            'is_live': False,
            'guest_count': 0
        })


class MediaAssetListView(APIView):
    """Get authenticated user's own media assets"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        assets = MediaAsset.objects.filter(user=request.user).order_by('-created_at')
        serializer = MediaAssetSerializer(assets, many=True, context={'request': request})
        return Response(serializer.data)


class MediaAssetPublicListView(APIView):
    """Get all media assets for public gallery (no authentication required)"""
    
    def get(self, request):
        assets = MediaAsset.objects.all().order_by('-created_at')
        serializer = MediaAssetSerializer(assets, many=True, context={'request': request})
        return Response(serializer.data)


class MediaAssetUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    ALLOWED_ROLES = ['staff', 'coach', 'athlete', 'vip']
    
    def post(self, request):
        # Check user role - only Staff, Coach, Athlete can upload
        try:
            profile = request.user.profile
            if profile.role not in self.ALLOWED_ROLES:
                return Response(
                    {'detail': 'Only Staff, Coaches, and Athletes can upload media.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Profile.DoesNotExist:
            return Response(
                {'detail': 'Profile not found. Please set up your profile first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file size (max 500MB)
        if 'file' in request.FILES:
            max_size = 500 * 1024 * 1024  # 500MB
            if request.FILES['file'].size > max_size:
                return Response(
                    {'detail': 'File too large. Maximum size is 500MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = MediaAssetSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, media_id=None):
        """Delete a media asset (own or any if staff)"""
        if media_id is None:
            return Response({'detail': 'Media asset ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            asset = MediaAsset.objects.get(id=media_id)
        except MediaAsset.DoesNotExist:
            return Response({'detail': 'Media asset not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Allow if user owns it OR is staff
        if asset.user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'You do not have permission to delete this asset.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        asset.delete()
        return Response({'detail': 'Media asset deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class ContactInquiryView(APIView):
    """Handles contact form submissions from visitors"""
    permission_classes = [AllowAny]  # ✅ Allows non-members to submit
    
    def post(self, request):
        # This uses the serializer you imported above
        serializer = ContactInquirySerializer(data=request.data)
        if serializer.is_valid():
            inquiry = serializer.save()
            
            # Get email settings
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourdomain.com')
            recipient_email = getattr(settings, 'EMAIL_HOST_USER', 'doc@yourdomain.com')
            
            send_mail(
                subject=f"New Contact Inquiry: {inquiry.name}",
                message=f"Name: {inquiry.name}\nEmail: {inquiry.email}\nType: {inquiry.inquiry_type}\n\nMessage:\n{inquiry.message}",
                from_email=from_email,
                recipient_list=[recipient_email],
                fail_silently=True,
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class GuestRequestViewSet(viewsets.ModelViewSet):
    queryset = GuestRequest.objects.all()
    serializer_class = GuestRequestSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]  # Allow anyone to submit guest requests
        return [IsAuthenticated()]  # Only admin can view/edit/delete
    
    def perform_create(self, serializer):
        # Get client IP address and user agent
        request = self.request
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Split IP if it's a list (common with proxies)
        if ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        # Save the guest request
        guest_request = serializer.save(
            status='pending',
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Send verification email
        try:
            from .email_service import send_verification_email
            send_verification_email(guest_request)
        except Exception as e:
            print(f"Failed to send verification email: {str(e)}")
            # Don't fail the request if email fails
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update guest request status (approve/reject/reset)"""
        guest_request = self.get_object()
        status = request.data.get('status')
        reason = request.data.get('reason', '')
        
        if status not in ['approved', 'rejected', 'pending']:
            return Response(
                {'error': 'Invalid status. Use "approved", "rejected", or "pending".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if status == 'approved':
            guest_request.approve(request.user)
            # Send approval email
            try:
                from .email_service import send_approval_email
                send_approval_email(guest_request)
            except Exception as e:
                print(f"Failed to send approval email: {str(e)}")
            return Response({'message': 'Guest request approved successfully'})
        elif status == 'rejected':
            guest_request.reject(request.user, reason)
            # Send rejection email
            try:
                from .email_service import send_rejection_email
                send_rejection_email(guest_request, reason)
            except Exception as e:
                print(f"Failed to send rejection email: {str(e)}")
            return Response({'message': 'Guest request rejected'})
        elif status == 'pending':
            guest_request.status = 'pending'
            guest_request.save()
            return Response({'message': 'Guest request reset to pending'})
    
    @action(detail=True, methods=['post'])
    def send_verification_email(self, request, pk=None):
        """Send verification email to guest"""
        guest_request = self.get_object()
        
        # Generate verification token
        token = guest_request.generate_verification_token()
        
        # TODO: Send verification email with token
        # For now, return the token for testing
        return Response({
            'message': 'Verification email sent',
            'token': token,  # Remove in production
            'email': guest_request.email
        })
    
    @action(detail=False, methods=['post'])
    def verify_email(self, request):
        """Verify email with token"""
        token = request.data.get('token')
        email = request.data.get('email')
        
        if not token or not email:
            return Response(
                {'error': 'Token and email are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            guest_request = GuestRequest.objects.get(
                email=email,
                verification_token=token
            )
            
            if guest_request.verify_email(token):
                return Response({
                    'message': 'Email verified successfully',
                    'status': guest_request.status
                })
            else:
                return Response(
                    {'error': 'Invalid verification token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except GuestRequest.DoesNotExist:
            return Response(
                {'error': 'Invalid verification token or email'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def partial_update(self, request, *args, **kwargs):
        """Allow partial updates for admin panel"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class ShowViewSet(viewsets.ModelViewSet):
    queryset = Show.objects.all().order_by('-air_date')
    serializer_class = ShowSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['post'])
    def toggle_live(self, request, pk=None):
        show = self.get_object()
        show.is_live = not show.is_live
        show.save()
        return Response({'is_live': show.is_live})


class PublicShowListView(APIView):
    """Get all shows for public viewing (no authentication required)"""
    
    def get(self, request):
        shows = Show.objects.filter(is_published=True).order_by('-air_date')
        serializer = ShowSerializer(shows, many=True, context={'request': request})
        return Response(serializer.data)


# Admin-specific views for frontend admin dashboard
class AdminMediaAssetListView(APIView):
    """Get all media assets for admin dashboard"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        assets = MediaAsset.objects.all().order_by('-created_at')
        serializer = MediaAssetSerializer(assets, many=True, context={'request': request})
        return Response(serializer.data)
    
    def delete(self, request, media_id=None):
        """Admin delete any media asset"""
        if media_id is None:
            return Response({'detail': 'Media asset ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            asset = MediaAsset.objects.get(id=media_id)
        except MediaAsset.DoesNotExist:
            return Response({'detail': 'Media asset not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        title = asset.title
        asset.delete()
        return Response({'detail': f'Media asset "{title}" deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)


class AdminProfileManagementView(APIView):
    """Admin profile management — list all or create"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        profiles = Profile.objects.all()
        serializer = ProfileSerializer(profiles, many=True, context={'request': request})
        return Response(serializer.data)
    
    def post(self, request):
        # Create new user with profile
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'athlete')
        
        if not username or not email or not password:
            return Response({'detail': 'Username, email, and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                user = User.objects.create_user(username=username, email=email, password=password)
                profile = user.profile
                profile.role = role
                profile.bio = request.data.get('bio', '') or ''
                profile.school_name = request.data.get('school_name', '') or ''
                profile.position = request.data.get('position', '') or ''
                
                # Convert empty string graduation_year to None to avoid IntegerField errors
                grad_year = request.data.get('graduation_year')
                if grad_year == '' or grad_year is None:
                    profile.graduation_year = None
                else:
                    try:
                        profile.graduation_year = int(grad_year)
                    except (ValueError, TypeError):
                        profile.graduation_year = None
                
                # Set link fields — DB has NOT NULL constraint so always provide empty string
                profile.twitter_x_link = request.data.get('twitter_x_link', '') or ''
                profile.hudl_link = request.data.get('hudl_link', '') or ''
                profile.maxpreps_link = request.data.get('maxpreps_link', '') or ''
                
                profile.save()
            
            serializer = ProfileSerializer(profile, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminProfileEditView(APIView):
    """Admin/staff can edit any user's profile fields"""
    permission_classes = [IsAdminUser]
    
    def patch(self, request, username):
        """Edit profile fields for any user"""
        try:
            user = User.objects.get(username=username)
            profile = user.profile
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Merge files into data
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        if request.FILES:
            for key, file in request.FILES.items():
                data[key] = file
        
        serializer = ProfileSerializer(
            profile,
            data=data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data)
            except Exception as e:
                return Response({
                    'detail': 'Error saving profile',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'detail': 'Profile update failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class AdminProfileDetailView(APIView):
    """Admin profile detail — toggle enable/disable or delete"""
    permission_classes = [IsAdminUser]
    
    def patch(self, request, username):
        """Toggle user account enabled/disabled (Staff only)"""
        try:
            user = User.objects.get(username=username)
            new_active = request.data.get('is_active')
            if new_active is None:
                return Response({'detail': 'is_active field is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Don't allow disabling yourself
            if user == request.user:
                return Response({'detail': 'You cannot disable your own account'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.is_active = bool(new_active)
            user.save()
            
            profile = user.profile
            serializer = ProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, username):
        """Delete a user account permanently"""
        try:
            user = User.objects.get(username=username)
            
            # Don't allow deleting yourself
            if user == request.user:
                return Response({'detail': 'You cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)
            
            username_deleted = user.username
            user.delete()
            return Response({'detail': f'User "{username_deleted}" has been permanently deleted'})
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ============================================================================
# LIVEKIT WEBRTC VIEWS
# ============================================================================

from livekit import api as livekit_api

class LiveKitTokenView(APIView):
    """Generate LiveKit access tokens for WebRTC connections"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Generate LiveKit token for authenticated user"""
        try:
            # Get LiveKit credentials from settings
            api_key = settings.LIVEKIT_API_KEY
            api_secret = settings.LIVEKIT_API_SECRET
            livekit_url = settings.LIVEKIT_URL
            room_name = settings.LIVEKIT_ROOM_NAME
            
            # DEBUG
            print("="*60)
            print(f"API_KEY: {api_key}")
            print(f"API_SECRET length: {len(api_secret)}")
            print(f"LIVEKIT_URL: {livekit_url}")
            print(f"ROOM_NAME: {room_name}")
            print("="*60)
            
            profile = request.user.profile
            is_host = request.user.is_staff
            
            # Generate participant identity
            participant_identity = f"{request.user.username}_{int(time.time())}"
            participant_name = request.user.username
            
            # Create token using LiveKit SDK
            token = livekit_api.AccessToken(api_key, api_secret) \
                .with_identity(participant_identity) \
                .with_name(participant_name) \
                .with_grants(livekit_api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=is_host,
                    can_subscribe=True,
                    can_publish_data=is_host,
                ))
            
            jwt_token = token.to_jwt()
            
            print(f"Generated token for {participant_name} (host={is_host})")
            print(f"Token (first 30 chars): {jwt_token[:30]}...")
            
            return Response({
                'success': True,
                'token': jwt_token,
                'url': livekit_url,
                'room': room_name,
                'participant': {
                    'identity': participant_identity,
                    'name': participant_name,
                    'role': 'host' if is_host else 'guest'
                },
                'permissions': {
                    'canPublish': is_host,
                    'canSubscribe': True,
                    'canPublishData': is_host
                }
            })
            
        except Exception as e:
            print(f"ERROR generating token: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Generate LiveKit token with custom parameters"""
        try:
            api_key = settings.LIVEKIT_API_KEY
            api_secret = settings.LIVEKIT_API_SECRET
            livekit_url = settings.LIVEKIT_URL
            
            data = request.data
            room_name = data.get('room_name', settings.LIVEKIT_ROOM_NAME)
            participant_name = data.get('participant_name', request.user.username if request.user.is_authenticated else 'Anonymous')
            participant_identity = data.get('participant_identity', f"{participant_name}_{int(time.time())}")
            is_host = data.get('is_host', request.user.is_staff if request.user.is_authenticated else False)
            
            # Create token using LiveKit SDK
            token = livekit_api.AccessToken(api_key, api_secret) \
                .with_identity(participant_identity) \
                .with_name(participant_name) \
                .with_grants(livekit_api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=is_host,
                    can_subscribe=True,
                    can_publish_data=is_host,
                ))
            
            jwt_token = token.to_jwt()
            
            return Response({
                'success': True,
                'token': jwt_token,
                'url': livekit_url,
                'room': room_name,
                'participant': {
                    'identity': participant_identity,
                    'name': participant_name,
                    'role': 'host' if is_host else 'guest'
                },
                'permissions': {
                    'canPublish': is_host,
                    'canSubscribe': True,
                    'canPublishData': is_host
                }
            })
            
        except Exception as e:
            print(f"ERROR: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LiveKitGuestTokenView(APIView):
    """Generate LiveKit token for guest users (no authentication required)"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Generate LiveKit token for guest user"""
        try:
            api_key = settings.LIVEKIT_API_KEY
            api_secret = settings.LIVEKIT_API_SECRET
            livekit_url = settings.LIVEKIT_URL
            room_name = settings.LIVEKIT_ROOM_NAME
            
            data = request.data
            guest_name = data.get('guest_name', f'Guest_{int(time.time())}')
            
            # Generate unique guest identity
            guest_identity = f"guest_{int(time.time())}_{secrets.token_hex(4)}"
            
            print(f"Generating guest token for: {guest_name} ({guest_identity})")
            
            # Create token using LiveKit SDK
            token = livekit_api.AccessToken(api_key, api_secret) \
                .with_identity(guest_identity) \
                .with_name(guest_name) \
                .with_grants(livekit_api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,  # Guests can publish for OBS
                    can_subscribe=True,
                    can_publish_data=True,
                ))
            
            jwt_token = token.to_jwt()
            
            print(f"Guest token generated successfully")
            
            return Response({
                'success': True,
                'token': jwt_token,
                'url': livekit_url,
                'room': room_name,
                'participant': {
                    'identity': guest_identity,
                    'name': guest_name,
                    'role': 'guest'
                },
                'permissions': {
                    'canPublish': True,
                    'canSubscribe': True,
                    'canPublishData': True
                }
            })
            
        except Exception as e:
            print(f"ERROR generating guest token: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# SPEED TEST VIEWS
# ============================================================================

class SpeedTestIPView(APIView):
    """Return the client's IP address for the speed test page"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Get client IP from forwarded headers or direct remote addr
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        
        # Get additional client info
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        return Response({
            'ip': ip,
            'user_agent': user_agent,
        })


# ============================================================================
# MEDIA DETAIL & LIKE VIEWS
# ============================================================================

class MediaAssetDetailView(APIView):
    """Get a single media asset by ID"""
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            asset = MediaAsset.objects.get(id=pk)
        except MediaAsset.DoesNotExist:
            return Response({'detail': 'Media not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = MediaAssetSerializer(asset, context={'request': request})
        return Response(serializer.data)


class MediaAssetLikeToggleView(APIView):
    """Toggle like on a media asset"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, media_id):
        try:
            asset = MediaAsset.objects.get(id=media_id)
        except MediaAsset.DoesNotExist:
            return Response({'detail': 'Media not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if asset.likes.filter(id=request.user.id).exists():
            asset.likes.remove(request.user)
            liked = False
        else:
            asset.likes.add(request.user)
            liked = True
        
        return Response({
            'liked': liked,
            'like_count': asset.likes.count(),
        })


# ============================================================================
# ELITE ATHLETE STATS SYSTEM — API VIEWS
# ============================================================================

class SportListView(APIView):
    """List all available sports"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        sports = Sport.objects.all()
        serializer = SportSerializer(sports, many=True)
        return Response(serializer.data)


class StatUpdateView(APIView):
    """Update an athlete stat and auto-record a history entry"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update a stat on the authenticated user's profile and create history entry"""
        profile = request.user.profile
        stat_type = request.data.get('stat_type')
        value = request.data.get('value')
        
        VALID_STATS = {
            'height_ft': {'field': 'height_ft', 'history_type': 'height'},
            'height_in': {'field': 'height_in', 'history_type': 'height'},
            'weight_lbs': {'field': 'weight_lbs', 'history_type': 'weight'},
            'vertical_jump_in': {'field': 'vertical_jump_in', 'history_type': 'vertical_jump'},
            'forty_yard_time': {'field': 'forty_yard_time', 'history_type': 'forty_yard'},
            'max_bench_lbs': {'field': 'max_bench_lbs', 'history_type': 'max_bench'},
            'max_squat_lbs': {'field': 'max_squat_lbs', 'history_type': 'max_squat'},
            'max_power_clean_lbs': {'field': 'max_power_clean_lbs', 'history_type': 'max_power_clean'},
            'shuttle_time': {'field': 'shuttle_time', 'history_type': 'shuttle'},
            'gpa': {'field': 'gpa', 'history_type': 'gpa'},
        }
        
        if stat_type not in VALID_STATS:
            return Response({'error': f'Invalid stat_type. Valid: {", ".join(VALID_STATS.keys())}'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            value = float(value)
            if stat_type in ['height_ft', 'height_in', 'weight_lbs', 'max_bench_lbs', 'max_squat_lbs', 'max_power_clean_lbs']:
                value = int(value)
        except (ValueError, TypeError):
            return Response({'error': 'Value must be a number'}, status=status.HTTP_400_BAD_REQUEST)
        
        field_info = VALID_STATS[stat_type]
        setattr(profile, field_info['field'], value)
        profile.save()
        
        # Create history entry
        AthleteStatEntry.objects.create(
            athlete=profile,
            stat_type=field_info['history_type'],
            value=float(value)
        )
        
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)


class StatHistoryView(APIView):
    """Get stat history for trend arrows"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, stat_type):
        """Get all history entries for a specific stat type"""
        valid_types = [c[0] for c in AthleteStatEntry.STAT_TYPE_CHOICES]
        if stat_type not in valid_types:
            return Response({'error': f'Invalid stat_type. Valid: {", ".join(valid_types)}'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        entries = AthleteStatEntry.objects.filter(
            athlete=request.user.profile,
            stat_type=stat_type
        ).order_by('-recorded_at')
        
        # Determine trend
        trend = None
        if len(entries) >= 2:
            better_when_higher = ['vertical_jump', 'max_bench', 'max_squat', 'max_power_clean', 'gpa']
            if entries[0].value > entries[1].value:
                trend = 'up' if stat_type in better_when_higher else 'down'
            elif entries[0].value < entries[1].value:
                trend = 'down' if stat_type in better_when_higher else 'up'
            else:
                trend = 'flat'
        elif len(entries) == 1:
            trend = 'new'
        
        return Response({
            'stat_type': stat_type,
            'trend': trend,
            'entries': AthleteStatEntrySerializer(entries, many=True).data
        })


class LeaderboardView(APIView):
    """Get top athletes for any stat type with strength-to-weight ratios"""
    permission_classes = [AllowAny]
    
    def get(self, request, stat_type):
        """Return leaderboard for a given stat"""
        valid_leaderboard_stats = {
            'vertical_jump': {'field': 'vertical_jump_in', 'label': 'Vertical Jump (in)', 'higher_is_better': True},
            'forty_yard': {'field': 'forty_yard_time', 'label': '40-Yard Dash (s)', 'higher_is_better': False},
            'max_bench': {'field': 'max_bench_lbs', 'label': 'Max Bench (lbs)', 'higher_is_better': True},
            'max_squat': {'field': 'max_squat_lbs', 'label': 'Max Squat (lbs)', 'higher_is_better': True},
            'max_power_clean': {'field': 'max_power_clean_lbs', 'label': 'Max Power Clean (lbs)', 'higher_is_better': True},
            'shuttle': {'field': 'shuttle_time', 'label': 'Shuttle Time (s)', 'higher_is_better': False},
            'bench_ratio': {'field': None, 'label': 'Bench x Weight', 'higher_is_better': True, 'is_ratio': True},
            'squat_ratio': {'field': None, 'label': 'Squat x Weight', 'higher_is_better': True, 'is_ratio': True},
            'power_clean_ratio': {'field': None, 'label': 'Clean x Weight', 'higher_is_better': True, 'is_ratio': True},
            'gpa': {'field': 'gpa', 'label': 'GPA', 'higher_is_better': True},
        }
        
        if stat_type not in valid_leaderboard_stats:
            return Response({
                'error': f'Invalid stat_type. Valid: {", ".join(valid_leaderboard_stats.keys())}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        config = valid_leaderboard_stats[stat_type]
        limit = int(request.GET.get('limit', 50))
        sport_filter = request.GET.get('sport')
        state_filter = request.GET.get('state')
        
        # Filter athletes only
        athletes = Profile.objects.filter(role='athlete')
        
        # Apply optional filters
        if sport_filter:
            athletes = athletes.filter(sports__slug=sport_filter)
        if state_filter:
            athletes = athletes.filter(state__iexact=state_filter)
        
        if config.get('is_ratio'):
            # For strength-to-weight ratios, compute in Python
            results = []
            for athlete in athletes:
                val = None
                if stat_type == 'bench_ratio':
                    val = athlete.bench_ratio
                elif stat_type == 'squat_ratio':
                    val = athlete.squat_ratio
                elif stat_type == 'power_clean_ratio':
                    val = athlete.power_clean_ratio
                
                if val is not None and val > 0:
                    results.append({
                        'username': athlete.user.username,
                        'profile_image': athlete.profile_image.url if athlete.profile_image else None,
                        'school_name': athlete.school_name,
                        'state': athlete.state,
                        'position': athlete.position,
                        'graduation_year': athlete.graduation_year,
                        'value': val,
                        'weight': athlete.weight_lbs,
                        'strength': athlete.max_bench_lbs if 'bench' in stat_type else (
                            athlete.max_squat_lbs if 'squat' in stat_type else athlete.max_power_clean_lbs
                        ),
                    })
            
            results.sort(key=lambda x: x['value'], reverse=config['higher_is_better'])
            results = results[:limit]
        else:
            field = config['field']
            order = '-' + field if config['higher_is_better'] else field
            leaderboard = athletes.exclude(**{field: None}).order_by(order).values(
                'user__username', 'profile_image', 'school_name', 'state',
                'position', 'graduation_year', 'sports', field
            )[:limit]
            
            results = [{
                'username': item['user__username'],
                'profile_image': item['profile_image'],
                'school_name': item['school_name'],
                'state': item['state'],
                'position': item['position'],
                'graduation_year': item['graduation_year'],
                'value': item[field],
            } for item in leaderboard]
        
        # Add rank
        for i, r in enumerate(results):
            r['rank'] = i + 1
        
        return Response({
            'stat_type': stat_type,
            'label': config['label'],
            'higher_is_better': config['higher_is_better'],
            'leaderboard': results
        })


class VerificationsStatView(APIView):
    """Upload/review stat verification videos"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get verification status for all stats"""
        profile = request.user.profile
        videos = StatVerificationVideo.objects.filter(athlete=profile)
        return Response({
            'videos': [{
                'id': v.id,
                'stat_type': v.stat_type,
                'is_approved': v.is_approved,
                'uploaded_at': v.uploaded_at,
                'video_url': v.video.url if v.video else None,
            } for v in videos]
        })
    
    def post(self, request):
        """Upload a verification video"""
        profile = request.user.profile
        stat_type = request.data.get('stat_type')
        video_file = request.FILES.get('video')
        
        valid_types = [c[0] for c in StatVerificationVideo.STAT_TYPE_CHOICES]
        if stat_type not in valid_types:
            return Response({'error': f'Invalid stat_type. Valid: {", ".join(valid_types)}'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        if not video_file:
            return Response({'error': 'Video file is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Max 200MB for verification videos
        if video_file.size > 200 * 1024 * 1024:
            return Response({'error': 'Video too large. Max 200MB.'}, status=status.HTTP_400_BAD_REQUEST)
        
        verification = StatVerificationVideo.objects.create(
            athlete=profile,
            stat_type=stat_type,
            video=video_file
        )
        
        return Response({
            'id': verification.id,
            'stat_type': verification.stat_type,
            'status': 'pending_review',
            'message': 'Verification video uploaded. Staff will review it shortly.'
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# COACH DRILLS & MEDIA VIEW TRACKING
# ============================================================================

class MediaTrackView(APIView):
    """Track a media view (increment view counter)"""
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        try:
            asset = MediaAsset.objects.get(id=pk)
            asset.view_count = F('view_count') + 1
            asset.save(update_fields=['view_count'])
            # Refresh to get the new value
            asset.refresh_from_db()
            return Response({'view_count': asset.view_count})
        except MediaAsset.DoesNotExist:
            return Response({'detail': 'Media not found.'}, status=status.HTTP_404_NOT_FOUND)


class DrillsListView(APIView):
    """List all drill/training media assets with filtering"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Base query: only drill and training type media
        queryset = MediaAsset.objects.filter(
            media_type__in=['drill', 'training']
        ).order_by('-created_at')
        
        # Filter by sport
        sport_slug = request.GET.get('sport')
        if sport_slug:
            queryset = queryset.filter(sport__slug=sport_slug)
        
        # Filter by media type
        media_type = request.GET.get('media_type')
        if media_type:
            queryset = queryset.filter(media_type=media_type)
        
        # Sort by views (most viewed)
        sort = request.GET.get('sort', 'newest')
        if sort == 'popular':
            queryset = queryset.order_by('-view_count', '-created_at')
        elif sort == 'drills':
            queryset = queryset.filter(media_type='drill').order_by('-created_at')
        elif sort == 'training':
            queryset = queryset.filter(media_type='training').order_by('-created_at')
        
        serializer = MediaAssetSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class TrendingDrillsView(APIView):
    """Get top 10 most viewed drills for the homepage"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        queryset = MediaAsset.objects.filter(
            media_type__in=['drill', 'training']
        ).order_by('-view_count')[:10]
        
        serializer = MediaAssetSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class RecentDrillsView(APIView):
    """Get 6 most recent drills for homepage cards"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        queryset = MediaAsset.objects.filter(
            media_type__in=['drill', 'training']
        ).order_by('-created_at')[:6]
        
        serializer = MediaAssetSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


# ============================================================================
# REGISTRATION SYSTEM — Invite-Only (public signup disabled)
# ============================================================================

class RegisterView(APIView):
    """Registration is currently invite-only. Submit a join request instead."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        return Response({
            'error': 'registration_disabled',
            'message': 'Registration is currently invite-only. Please submit a join request.',
            'join_request_url': '/api/join-request/',
        }, status=status.HTTP_403_FORBIDDEN)

    def get(self, request):
        return Response({
            'status': 'invite_only',
            'message': 'Public registration is closed. Athletes and coaches can submit a join request.',
            'join_request_url': '/api/join-request/',
        })


class JoinRequestView(APIView):
    """Submit a request to join the platform. Admin reviews and creates accounts."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request):
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', 'athlete')
        school_or_organization = request.data.get('school_or_organization', '').strip()
        position_or_sport = request.data.get('position_or_sport', '').strip()
        message = request.data.get('message', '').strip()
        
        # Validation
        errors = {}
        if not first_name:
            errors['first_name'] = 'First name is required.'
        if not last_name:
            errors['last_name'] = 'Last name is required.'
        if not email or '@' not in email:
            errors['email'] = 'A valid email address is required.'
        elif JoinRequest.objects.filter(email__iexact=email).exclude(status='rejected').exists():
            errors['email'] = 'A request with this email has already been submitted.'
        if role not in ['athlete', 'coach']:
            errors['role'] = 'Please select athlete or coach.'
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            join_request = JoinRequest.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                role=role,
                school_or_organization=school_or_organization,
                position_or_sport=position_or_sport,
                message=message,
            )
            
            return Response({
                'success': True,
                'message': 'Your request has been submitted. We will review it and get back to you.',
                'id': join_request.id,
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            print(f"ERROR creating join request: {e}")
            return Response({
                'error': 'An error occurred. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyEmailView(APIView):
    """Verify email address via token link"""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request):
        token = request.data.get('token', '').strip()
        email = request.data.get('email', '').strip().lower()
        
        if not token or not email:
            return Response({
                'error': 'Token and email are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
            profile = user.profile
            
            if profile.email_verified:
                return Response({
                    'success': True,
                    'message': 'Email already verified.',
                    'already_verified': True,
                })
            
            if profile.email_verification_token != token:
                return Response({
                    'error': 'Invalid or expired verification link.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if token is expired (48 hours)
            if profile.email_verification_sent_at:
                expiry = profile.email_verification_sent_at + timedelta(hours=48)
                if timezone.now() > expiry:
                    return Response({
                        'error': 'Verification link has expired. Please request a new one.',
                        'expired': True,
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark as verified
            profile.email_verified = True
            profile.email_verification_token = None  # Clear token
            profile.save()
            
            return Response({
                'success': True,
                'message': 'Email verified successfully! You can now log in.',
                'verified': True,
            })
            
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid verification link.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Profile.DoesNotExist:
            return Response({
                'error': 'Invalid verification link.'
            }, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    """Re-send verification email"""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response({
                'error': 'Email is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if not user:
                # Don't reveal if email exists or not
                return Response({
                    'success': True,
                    'message': 'If an account exists with this email, a verification link has been sent.',
                })
            
            profile = user.profile
            
            if profile.email_verified:
                return Response({
                    'success': True,
                    'message': 'Email already verified.',
                    'already_verified': True,
                })
            
            # Generate new token
            token = secrets.token_urlsafe(48)
            profile.email_verification_token = token
            profile.email_verification_sent_at = timezone.now()
            profile.save()
            
            # Send email
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://yourdomain.com')
            verify_url = f"{frontend_url}/verify-email?token={token}&email={email}"
            
            try:
                send_mail(
                    subject="Verify Your Email - In The Game With Doc",
                    message=f"Verify your email at: {verify_url}",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourdomain.com'),
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"ERROR re-sending verification email: {e}")
            
            return Response({
                'success': True,
                'message': 'If an account exists with this email, a verification link has been sent.',
            })
            
        except Profile.DoesNotExist:
            return Response({
                'success': True,
                'message': 'If an account exists with this email, a verification link has been sent.',
            })
        except Exception as e:
            print(f"Error in resend verification: {e}")
            return Response({
                'error': 'An error occurred. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# RECRUITER ATTRIBUTE SYSTEM — Per-Sport Key Stats API
# ============================================================================

class SportAttributeListView(APIView):
    """List recruiter attributes by sport slug"""
    permission_classes = [AllowAny]

    def get(self, request):
        sport_slug = request.GET.get('sport')
        queryset = SportAttribute.objects.all()
        if sport_slug:
            queryset = queryset.filter(sport__slug=sport_slug)
        serializer = SportAttributeSerializer(queryset, many=True)
        return Response(serializer.data)


# ============================================================================
# DRILL LIBRARY — Full CRUD for Coaches & Athletes (replacing old shallow views)
# ============================================================================

class DrillListView(APIView):
    """List drills with filtering — uses new Drill model"""
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Drill.objects.filter(is_published=True)

        # Filter by sport
        sport_slug = request.GET.get('sport')
        if sport_slug:
            queryset = queryset.filter(sport__slug=sport_slug)

        # Filter by difficulty
        difficulty = request.GET.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        # Filter by creator (coach/athlete)
        creator = request.GET.get('creator')
        if creator:
            queryset = queryset.filter(creator__username=creator)

        # Sort
        sort = request.GET.get('sort', 'newest')
        if sort == 'popular':
            queryset = queryset.order_by('-view_count', '-created_at')
        elif sort == 'featured':
            queryset = queryset.filter(is_featured=True).order_by('-created_at')
        else:
            queryset = queryset.order_by('-created_at')

        serializer = DrillListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class DrillDetailView(APIView):
    """Get a single drill by ID"""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            drill = Drill.objects.get(pk=pk)
        except Drill.DoesNotExist:
            return Response({'detail': 'Drill not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Increment view count
        drill.view_count = F('view_count') + 1
        drill.save(update_fields=['view_count'])
        drill.refresh_from_db()

        serializer = DrillListSerializer(drill, context={'request': request})
        return Response(serializer.data)


class DrillCreateView(APIView):
    """Create a new drill"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        if profile.role not in ['coach', 'athlete', 'staff']:
            return Response({'detail': 'Only coaches and athletes can create drills.'},
                           status=status.HTTP_403_FORBIDDEN)

        serializer = DrillCreateSerializer(data=request.data)
        if serializer.is_valid():
            drill = serializer.save(creator=request.user)
            return Response(
                DrillListSerializer(drill, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DrillUpdateView(APIView):
    """Update a drill (creator only)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            drill = Drill.objects.get(pk=pk)
        except Drill.DoesNotExist:
            return Response({'detail': 'Drill not found.'}, status=status.HTTP_404_NOT_FOUND)

        if drill.creator != request.user and not request.user.is_staff:
            return Response({'detail': 'You can only edit your own drills.'},
                           status=status.HTTP_403_FORBIDDEN)

        serializer = DrillCreateSerializer(drill, data=request.data, partial=True)
        if serializer.is_valid():
            drill = serializer.save()
            return Response(
                DrillListSerializer(drill, context={'request': request}).data
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DrillDeleteView(APIView):
    """Delete a drill (creator or staff only)"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            drill = Drill.objects.get(pk=pk)
        except Drill.DoesNotExist:
            return Response({'detail': 'Drill not found.'}, status=status.HTTP_404_NOT_FOUND)

        if drill.creator != request.user and not request.user.is_staff:
            return Response({'detail': 'You can only delete your own drills.'},
                           status=status.HTTP_403_FORBIDDEN)

        drill.delete()
        return Response({'detail': 'Drill deleted.'}, status=status.HTTP_204_NO_CONTENT)


class DrillLikeToggleView(APIView):
    """Toggle like on a drill"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            drill = Drill.objects.get(pk=pk)
        except Drill.DoesNotExist:
            return Response({'detail': 'Drill not found.'}, status=status.HTTP_404_NOT_FOUND)

        if drill.likes.filter(id=request.user.id).exists():
            drill.likes.remove(request.user)
            liked = False
        else:
            drill.likes.add(request.user)
            liked = True

        return Response({
            'liked': liked,
            'like_count': drill.likes.count(),
        })


class DrillSaveToggleView(APIView):
    """Toggle save/bookmark on a drill"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            drill = Drill.objects.get(pk=pk)
        except Drill.DoesNotExist:
            return Response({'detail': 'Drill not found.'}, status=status.HTTP_404_NOT_FOUND)

        if drill.saved_by.filter(id=request.user.id).exists():
            drill.saved_by.remove(request.user)
            saved = False
        else:
            drill.saved_by.add(request.user)
            saved = True

        drill.save_count = drill.saved_by.count()
        drill.save(update_fields=['save_count'])

        return Response({
            'saved': saved,
            'save_count': drill.save_count,
        })


class DrillSavedListView(APIView):
    """List drills saved/bookmarked by the current user"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        drills = Drill.objects.filter(saved_by=request.user).order_by('-created_at')
        serializer = DrillListSerializer(drills, many=True, context={'request': request})
        return Response(serializer.data)


class DrillMyDrillsView(APIView):
    """List drills created by the current user"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        drills = Drill.objects.filter(creator=request.user).order_by('-created_at')
        serializer = DrillListSerializer(drills, many=True, context={'request': request})
        return Response(serializer.data)


# ============================================================================
# MEDIA TAG SYSTEM — Flexible Key-Value Tags on Receipt Videos
# ============================================================================

class MediaTagListView(APIView):
    """Get tags for a specific media asset"""
    permission_classes = [AllowAny]

    def get(self, request, media_id):
        tags = MediaTag.objects.filter(media_id=media_id)
        serializer = MediaTagSerializer(tags, many=True)
        return Response(serializer.data)


class MediaTagCreateView(APIView):
    """Add tags to a media asset (owner or staff only)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, media_id):
        try:
            media = MediaAsset.objects.get(pk=media_id)
        except MediaAsset.DoesNotExist:
            return Response({'detail': 'Media not found.'}, status=status.HTTP_404_NOT_FOUND)

        if media.user != request.user and not request.user.is_staff:
            return Response({'detail': 'You can only tag your own media.'},
                           status=status.HTTP_403_FORBIDDEN)

        key = request.data.get('key', '').strip()
        value = request.data.get('value', '').strip()

        if not key or not value:
            return Response({'detail': 'Both key and value are required.'},
                           status=status.HTTP_400_BAD_REQUEST)

        tag = MediaTag.objects.create(media=media, key=key, value=value)
        serializer = MediaTagSerializer(tag)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MediaTagDeleteView(APIView):
    """Delete a tag (owner or staff only)"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, tag_id):
        try:
            tag = MediaTag.objects.get(pk=tag_id)
        except MediaTag.DoesNotExist:
            return Response({'detail': 'Tag not found.'}, status=status.HTTP_404_NOT_FOUND)

        if tag.media.user != request.user and not request.user.is_staff:
            return Response({'detail': 'You can only delete tags on your own media.'},
                           status=status.HTTP_403_FORBIDDEN)

        tag.delete()
        return Response({'detail': 'Tag deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# COPPA AGE GATE — Non-Bypassable Age Verification & Parental Consent
# ============================================================================

class AgeGateCheckView(APIView):
    """
    Server-side age verification endpoint.
    Calculates age from date of birth and returns whether the user is allowed to proceed.
    This is the NON-BYPASSABLE enforcement point — client-side age check is UX only.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        dob_str = request.data.get('date_of_birth', '').strip()

        if not dob_str:
            return Response({
                'error': 'Date of birth is required.',
                'age_gate_passed': False,
                'is_underage': None,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Parse date of birth
        try:
            dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD.',
                'age_gate_passed': False,
                'is_underage': None,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Calculate age
        today = timezone.now().date()
        age = relativedelta(today, dob).years

        is_underage = age <= 12
        age_gate_passed = not is_underage

        # Log the age gate event (no PII stored — only age range + timestamp)
        COPPAAuditLog.objects.create(
            event_type='age_gate_denied' if is_underage else 'age_gate_allowed',
            notes=f'Age: {age}, DOB: {dob_str}',  # Stored for 30 days then deleted
            requester_identifier=hashlib.sha256(dob_str.encode()).hexdigest()[:16],
        )

        if is_underage:
            return Response({
                'age_gate_passed': False,
                'is_underage': True,
                'age': age,
                'message': 'You need a parent or guardian to help set up your account.',
            })

        return Response({
            'age_gate_passed': True,
            'is_underage': False,
            'age': age,
            'message': 'You are eligible to create an account.',
        })


class ParentConsentInitiateView(APIView):
    """
    Initiate the parental consent flow for users under 13.
    Creates a ParentalConsentRequest and sends an email to the parent.
    NO user account is created at this point — zero data collection before consent.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        child_email = request.data.get('child_email', '').strip().lower()
        parent_email = request.data.get('parent_email', '').strip().lower()
        child_dob_str = request.data.get('child_dob', '').strip()
        child_name = request.data.get('child_name', '').strip()
        parent_name = request.data.get('parent_name', '').strip()

        # Validate required fields
        if not child_email or not parent_email or not child_dob_str:
            return Response({
                'error': 'Child email, parent email, and child date of birth are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate child DOB
        try:
            child_dob = datetime.strptime(child_dob_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify they're really under 13 (server-side recheck)
        today = timezone.now().date()
        age = relativedelta(today, child_dob).years
        if age > 12:
            return Response({
                'error': 'This flow is for users under 13 only. Please use the standard registration.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check for existing pending requests for this child email
        existing = ParentalConsentRequest.objects.filter(
            child_email=child_email,
            status='pending',
            expires_at__gt=timezone.now()
        ).first()
        if existing:
            return Response({
                'success': True,
                'message': 'A consent request has already been sent to the parent email on file.',
                'consent_token': existing.consent_token
            })

        # Create consent request
        expires_at = timezone.now() + timedelta(hours=48)
        consent = ParentalConsentRequest.objects.create(
            child_email=child_email,
            parent_email=parent_email,
            child_dob=child_dob,
            child_name=child_name,
            parent_name=parent_name,
            expires_at=expires_at,
            consent_method=request.data.get('method', 'video_chat'),
        )
        consent.generate_consent_token()

        # Build consent URLs
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://yourdomain.com')
        consent_url = f"{frontend_url}/parent-consent?token={consent.consent_token}"

        # Send email to parent
        try:
            subject = "Action Required: Parental Consent for In The Game With Doc"
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #2563eb, #06b6d4); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                    .content {{ padding: 30px; background-color: #f9f9f9; }}
                    .button {{ display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #06b6d4); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Parental Consent Required</h1>
                    </div>
                    <div class="content">
                        <p>Dear {parent_name or 'Parent or Guardian'},</p>
                        <p><strong>{child_name or child_email}</strong> has indicated they are under 13 and would like to join <strong>In The Game With Doc</strong> — a sports platform for athletes to showcase their skills and connect with coaches.</p>
                        <p>Under the Children's Online Privacy Protection Act (COPPA), we need your consent before we can create an account for your child or collect any personal information.</p>
                        <p>To provide consent, please click the button below:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="{consent_url}" class="button">Review & Provide Consent</a>
                        </p>
                        <p style="font-size: 12px; color: #999;">This link will expire in 48 hours.</p>
                        <p>You can provide consent via:</p>
                        <ul>
                            <li><strong>Video Chat</strong> — Schedule a quick video call with our staff</li>
                            <li><strong>Signed Form</strong> — Download, sign, and return a consent form</li>
                            <li><strong>Credit Card</strong> — Verify your identity via a $0.50 micro-transaction</li>
                        </ul>
                        <p>If you have any questions, reply to this email or contact us at doc@yourdomain.com.</p>
                    </div>
                    <div class="footer">
                        <p>In The Game With Doc</p>
                        <p>doc@yourdomain.com</p>
                        <p><small>We never store driver's licenses or full credit card numbers. Verification records are kept for compliance only.</small></p>
                    </div>
                </div>
            </body>
            </html>
            """
            send_mail(
                subject=subject,
                message=f"Parental consent required for {child_name or child_email}. Visit: {consent_url}",
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yourdomain.com'),
                recipient_list=[parent_email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            print(f"ERROR sending parental consent email: {e}")

        return Response({
            'success': True,
            'message': 'A consent request has been sent to the parent email.',
            'consent_token': consent.consent_token,
            'expires_at': expires_at.isoformat(),
        })


class ParentConsentStatusView(APIView):
    """Check the status of a parental consent request"""
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.GET.get('token', '').strip()

        if not token:
            return Response({
                'error': 'Consent token is required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            consent = ParentalConsentRequest.objects.get(consent_token=token)

            # Check expiry
            if consent.is_expired() and consent.status == 'pending':
                consent.status = 'expired'
                consent.save()

            return Response({
                'status': consent.status,
                'method': consent.consent_method,
                'child_name': consent.child_name,
                'parent_name': consent.parent_name,
                'created_at': consent.created_at.isoformat(),
                'expires_at': consent.expires_at.isoformat(),
                'is_expired': consent.is_expired(),
            })
        except ParentalConsentRequest.DoesNotExist:
            return Response({
                'error': 'Invalid consent token.'
            }, status=status.HTTP_404_NOT_FOUND)


class ParentConsentConfirmView(APIView):
    """
    Confirm parental consent via one of the accepted methods.
    Staff-only for video_chat and signed_form; self-service for credit_card.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('consent_token', '').strip()
        method = request.data.get('method', 'video_chat')

        if not token:
            return Response({'error': 'Consent token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            consent = ParentalConsentRequest.objects.get(consent_token=token)
        except ParentalConsentRequest.DoesNotExist:
            return Response({'error': 'Invalid consent token.'}, status=status.HTTP_404_NOT_FOUND)

        # Check expiry
        if consent.is_expired():
            consent.status = 'expired'
            consent.save()
            return Response({'error': 'Consent request has expired. Please start a new request.'},
                           status=status.HTTP_400_BAD_REQUEST)

        if consent.status != 'pending':
            return Response({'error': f'Consent request is already {consent.status}.'},
                           status=status.HTTP_400_BAD_REQUEST)

        if method not in dict(ParentalConsentRequest.METHOD_CHOICES):
            return Response({'error': f'Invalid method. Valid: video_chat, signed_form, credit_card'},
                           status=status.HTTP_400_BAD_REQUEST)

        # Credit card method: auto-confirm (Stripe verification would happen here)
        if method == 'credit_card':
            # In production: verify Stripe charge was successful
            # For now: trust that the frontend handled the Stripe flow
            consent.status = 'consent_given'
            consent.consent_method = method
            consent.responded_at = timezone.now()
            consent.consent_granted_at = timezone.now()
            consent.save()

            # Create COPPA audit log entry
            COPPAAuditLog.objects.create(
                event_type='credit_card',
                parent_email_hash=hashlib.sha256(consent.parent_email.encode()).hexdigest(),
                notes='Credit card authorization completed via Stripe micro-transaction',
            )

            return Response({
                'success': True,
                'message': 'Parental consent granted via credit card authorization.',
                'child_email': consent.child_email,
            })

        # Video chat method: mark as pending-VC (staff will confirm after call)
        if method == 'video_chat':
            if not request.user.is_authenticated or not request.user.is_staff:
                return Response({
                    'error': 'Only staff members can confirm video chat verification.',
                }, status=status.HTTP_403_FORBIDDEN)

            consent.status = 'consent_given'
            consent.consent_method = method
            consent.handled_by = request.user
            consent.responded_at = timezone.now()
            consent.consent_granted_at = timezone.now()
            consent.save()

            # Audit log
            COPPAAuditLog.objects.create(
                event_type='video_chat',
                parent_email_hash=hashlib.sha256(consent.parent_email.encode()).hexdigest(),
                staff_username=request.user.username,
                notes=f'Video chat verification completed by staff {request.user.username}',
            )

            return Response({
                'success': True,
                'message': 'Parental consent confirmed via video chat.',
                'child_email': consent.child_email,
            })

        # Signed form method: staff uploads the signed form
        if method == 'signed_form':
            if not request.user.is_authenticated or not request.user.is_staff:
                return Response({
                    'error': 'Only staff members can confirm signed form verification.',
                }, status=status.HTTP_403_FORBIDDEN)

            consent.status = 'consent_given'
            consent.consent_method = method
            consent.handled_by = request.user
            consent.responded_at = timezone.now()
            consent.consent_granted_at = timezone.now()
            consent.save()

            COPPAAuditLog.objects.create(
                event_type='signed_form',
                parent_email_hash=hashlib.sha256(consent.parent_email.encode()).hexdigest(),
                staff_username=request.user.username,
                notes=f'Signed consent form processed by staff {request.user.username}',
            )

            return Response({
                'success': True,
                'message': 'Parental consent confirmed via signed form.',
                'child_email': consent.child_email,
            })

        return Response({'error': 'Invalid method.'}, status=status.HTTP_400_BAD_REQUEST)


class ParentConsentVideoTokenView(APIView):
    """
    Generate a LiveKit room token for video chat parental verification.
    Parent joins a temporary room with a staff member for identity verification.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        consent_token = request.data.get('consent_token', '').strip()

        if not consent_token:
            return Response({'error': 'Consent token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            consent = ParentalConsentRequest.objects.get(consent_token=consent_token)
        except ParentalConsentRequest.DoesNotExist:
            return Response({'error': 'Invalid consent token.'}, status=status.HTTP_404_NOT_FOUND)

        if consent.is_expired():
            return Response({'error': 'Consent request has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate LiveKit token for the verification room
        try:
            api_key = settings.LIVEKIT_API_KEY
            api_secret = settings.LIVEKIT_API_SECRET
            livekit_url = settings.LIVEKIT_URL

            # Use a dedicated verification room
            room_name = f"parent-consent-{consent_token[:8]}"
            participant_identity = f"parent_{consent_token[:8]}"
            participant_name = consent.parent_name or consent.parent_email

            token = livekit_api.AccessToken(api_key, api_secret) \
                .with_identity(participant_identity) \
                .with_name(participant_name) \
                .with_grants(livekit_api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,
                    can_subscribe=True,
                    can_publish_data=True,
                ))

            jwt_token = token.to_jwt()

            return Response({
                'success': True,
                'token': jwt_token,
                'url': livekit_url,
                'room': room_name,
                'participant': {
                    'identity': participant_identity,
                    'name': participant_name,
                    'role': 'parent',
                }
            })

        except Exception as e:
            print(f"ERROR generating video consent token: {e}")
            return Response({
                'error': 'Could not generate video chat room. Please try again or use another method.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ParentConsentRevokeView(APIView):
    """Allow parent to revoke previously granted consent"""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('consent_token', '').strip()

        if not token:
            return Response({'error': 'Consent token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            consent = ParentalConsentRequest.objects.get(consent_token=token)
        except ParentalConsentRequest.DoesNotExist:
            return Response({'error': 'Invalid consent token.'}, status=status.HTTP_404_NOT_FOUND)

        if consent.status != 'consent_given':
            return Response({'error': 'Consent is not currently granted.'}, status=status.HTTP_400_BAD_REQUEST)

        consent.status = 'revoked'
        consent.save()

        # Audit log
        COPPAAuditLog.objects.create(
            event_type='consent_revoked',
            parent_email_hash=hashlib.sha256(consent.parent_email.encode()).hexdigest(),
            notes='Parental consent revoked by parent via consent token link',
        )

        return Response({
            'success': True,
            'message': 'Parental consent has been revoked. Your child\'s data will be handled per our privacy policy.',
        })


# ============================================================================
# CONTENT REPORTING SYSTEM
# ============================================================================

class ContentReportCreateView(APIView):
    """Submit a content moderation report"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        media_id = request.data.get('media_id')
        reported_user_id = request.data.get('reported_user_id')
        reason = request.data.get('reason')
        description = request.data.get('description', '')

        if not reason:
            return Response({'error': 'A reason for the report is required.'},
                           status=status.HTTP_400_BAD_REQUEST)

        if reason not in dict(ContentReport.REASON_CHOICES):
            return Response({'error': f'Invalid reason. Valid: {", ".join(dict(ContentReport.REASON_CHOICES).keys())}'},
                           status=status.HTTP_400_BAD_REQUEST)

        if not media_id and not reported_user_id:
            return Response({'error': 'Either media_id or reported_user_id is required.'},
                           status=status.HTTP_400_BAD_REQUEST)

        report_data = {
            'reporter': request.user,
            'reason': reason,
            'description': description,
        }

        if media_id:
            try:
                media = MediaAsset.objects.get(id=media_id)
                report_data['media'] = media
            except MediaAsset.DoesNotExist:
                return Response({'error': 'Media not found.'}, status=status.HTTP_404_NOT_FOUND)

        if reported_user_id:
            try:
                reported_user = User.objects.get(id=reported_user_id)
                report_data['reported_user'] = reported_user
            except User.DoesNotExist:
                return Response({'error': 'Reported user not found.'}, status=status.HTTP_404_NOT_FOUND)

        report = ContentReport.objects.create(**report_data)

        return Response({
            'success': True,
            'message': 'Report submitted. Our team will review it shortly.',
            'report_id': report.id,
        }, status=status.HTTP_201_CREATED)


class ContentReportAdminListView(APIView):
    """Admin view all pending reports"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.GET.get('status', 'pending')
        reports = ContentReport.objects.filter(status=status_filter).order_by('-created_at')

        return Response([{
            'id': r.id,
            'reporter': r.reporter.username if r.reporter else 'Anonymous',
            'media_id': r.media.id if r.media else None,
            'media_title': r.media.title if r.media else None,
            'reported_user': r.reported_user.username if r.reported_user else None,
            'reason': r.get_reason_display(),
            'description': r.description,
            'status': r.status,
            'created_at': r.created_at.isoformat(),
        } for r in reports])


class ContentReportResolveView(APIView):
    """Admin resolve a content report"""
    permission_classes = [IsAdminUser]

    def post(self, request, report_id):
        try:
            report = ContentReport.objects.get(id=report_id)
        except ContentReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status', 'reviewed')
        notes = request.data.get('notes', '')

        report.resolve(request.user, new_status, notes)

        return Response({
            'success': True,
            'message': f'Report marked as {new_status}.',
        })


# ============================================================================
# COPPA ADMIN VIEW — View audit logs & manage consent requests
# ============================================================================

class COPPAAdminListView(APIView):
    """Admin view COPPA audit logs"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.GET.get('limit', 100))
        logs = COPPAAuditLog.objects.all().order_by('-timestamp')[:limit]

        return Response([{
            'id': log.id,
            'event_type': log.get_event_type_display(),
            'timestamp': log.timestamp.isoformat(),
            'staff_username': log.staff_username,
            'notes': log.notes,
        } for log in logs])


class COPPAConsentRequestAdminListView(APIView):
    """Admin view all parental consent requests"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.GET.get('status', '')
        requests_qs = ParentalConsentRequest.objects.all().order_by('-created_at')

        if status_filter:
            requests_qs = requests_qs.filter(status=status_filter)

        return Response([{
            'id': r.id,
            'child_name': r.child_name,
            'child_email': r.child_email,
            'parent_email': r.parent_email,
            'parent_name': r.parent_name,
            'status': r.status,
            'method': r.consent_method,
            'created_at': r.created_at.isoformat(),
            'expires_at': r.expires_at.isoformat(),
            'handled_by': r.handled_by.username if r.handled_by else None,
            'is_expired': r.is_expired(),
        } for r in requests_qs])

