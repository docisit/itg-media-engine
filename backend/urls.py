from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from members.host_token_view import HostTokenView
from django.contrib.auth import views as auth_views
from members.password_reset_views import APIPasswordResetView

from members.views import (
    ProfileUpdateView, LiveStatusView, MediaAssetUploadView,
    MediaAssetPublicListView, MediaAssetListView, GuestRequestViewSet,
    ShowViewSet, ProfileListView, ProfileDetailView, AdminMediaAssetListView,
    AdminProfileManagementView, AdminProfileDetailView, AdminProfileEditView,
    PublicShowListView, ContactInquiryView,
    ShowDetailView, LiveKitTokenView, LiveKitGuestTokenView, SpeedTestIPView,
    MediaAssetDetailView, MediaAssetLikeToggleView,
    RegisterView, JoinRequestView, VerifyEmailView, ResendVerificationView,
    MediaTrackView, DrillsListView, TrendingDrillsView, RecentDrillsView,
    MediaTagListView, MediaTagCreateView, MediaTagDeleteView,
    # COPPA Age Gate
    AgeGateCheckView, ParentConsentInitiateView, ParentConsentStatusView,
    ParentConsentConfirmView, ParentConsentVideoTokenView, ParentConsentRevokeView,
    # Content Reports
    ContentReportCreateView, ContentReportAdminListView, ContentReportResolveView,
    # COPPA Admin
    COPPAAdminListView, COPPAConsentRequestAdminListView,
)

# Sports views — imported only when sports module is enabled
from django.conf import settings as django_settings
if getattr(django_settings, 'SPORTS_MODULE_ENABLED', False):
    from members.views import (
        SportListView, SportAttributeListView,
        StatUpdateView, StatHistoryView, LeaderboardView, VerificationsStatView,
        DrillListView, DrillDetailView, DrillCreateView, DrillUpdateView,
        DrillDeleteView, DrillLikeToggleView, DrillSaveToggleView,
        DrillSavedListView, DrillMyDrillsView,
    )

# Site Chat imports
from members.chat_views import (
    SiteChatConfigView, SiteChatAskView,
    SiteChatSessionView, SiteChatHealthView,
    AdminSiteChatConfigView, AdminSiteChatFAQListView,
    AdminSiteChatFAQDetailView, AdminSiteChatUnansweredView,
)

# Avatar Assistant imports
from members.avatar_views import (
    AvatarTokenView, AvatarSaveConversationView,
    AvatarConversationHistoryView, AvatarEndSessionView,
    AvatarConversationsForShowView, AvatarGuestInfoView,
    AvatarPastConversationsView,
)

from members.blog_views import (
    BlogPostPublicListView, BlogPostPublicDetailView,
    BlogPostAdminListView, BlogPostAdminDetailView,
    BlogCommentCreateView, BlogCommentAdminListView,
    BlogCommentApproveView, BlogCommentDeleteView,
    BlogCategoriesView, BlogFeaturedPostView,
    BlogPostLikeToggleView, BlogPostLikeStatusView,
    BlogPostImageListCreateView, BlogPostImageDetailView
)
from members.streaming_views import (
    StreamingPlatformViewSet, StreamingSessionViewSet,
    StreamingStatusView, StreamingControlView,
    StreamingStatisticsView, LiveKitRoomStatusView, WHIPIngressView
)
from members.webrtc_views import (
    WebRTCRoomViewSet, WebRTCParticipantViewSet, WebRTCSignalViewSet,
    LiveKitIngressView, LiveKitStreamKeyView, LiveKitEgressView,
    LiveKitConnectionCheckView, GuestRTMPEgressView, RoomStatusByNameView,
)
from members.webauthn_views import (
    register_passkey_begin, register_passkey_complete,
    authenticate_passkey_begin, authenticate_passkey_complete,
    manage_passkeys,
)
from backend.custom_jwt import CustomTokenObtainPairView

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'guest-requests', GuestRequestViewSet, basename='guestrequest')
router.register(r'streaming-platforms', StreamingPlatformViewSet, basename='streamingplatform')
router.register(r'streaming-sessions', StreamingSessionViewSet, basename='streamingsession')
router.register(r'shows', ShowViewSet, basename='show')

# LiveKit WebRTC ViewSets
router.register(r'webrtc/rooms', WebRTCRoomViewSet, basename='webrtc-room')
router.register(r'webrtc/participants', WebRTCParticipantViewSet, basename='webrtc-participant')
router.register(r'webrtc/signals', WebRTCSignalViewSet, basename='webrtc-signal')

admin_url = getattr(settings, 'ADMIN_URL', 'admin/').rstrip('/')

urlpatterns = [
    # Redirect root to API docs or frontend
    path('', RedirectView.as_view(url='/api/', permanent=False), name='api-root'),
    path(f'{admin_url}/', admin.site.urls),

    # Authentication
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Profiles
    path('api/profile/', ProfileUpdateView.as_view(), name='profile_update'),
    path('api/profiles/', ProfileListView.as_view(), name='profiles_list'),
    path('api/profiles/<str:username>/', ProfileDetailView.as_view(), name='profile_detail'),

    # Shows
    path('api/shows/<int:pk>/', ShowDetailView.as_view(), name='show_detail'),
    path('api/shows/live-status/', LiveStatusView.as_view(), name='live_status'),
    path('api/shows/public/', PublicShowListView.as_view(), name='public_shows_list'),

    # Media Assets
    path('api/media-assets/', MediaAssetListView.as_view(), name='media_assets_list'),
    path('api/media/', MediaAssetPublicListView.as_view(), name='media_public_list'),
    path('api/media/<int:pk>/', MediaAssetDetailView.as_view(), name='media_detail'),
    path('api/media/<int:media_id>/like/', MediaAssetLikeToggleView.as_view(), name='media_like_toggle'),
    path('api/media/upload/', MediaAssetUploadView.as_view(), name='media_upload'),
    path('api/media/upload/<int:media_id>/', MediaAssetUploadView.as_view(), name='media_upload_delete'),

    # Guest & Contact
    path('api/contact/', ContactInquiryView.as_view(), name='contact_inquiry'),

    # Admin Dashboard
    path('api/admin/media/', AdminMediaAssetListView.as_view(), name='admin_media_list'),
    path('api/admin/media/<int:media_id>/', AdminMediaAssetListView.as_view(), name='admin_media_delete'),
    path('api/admin/profiles/', AdminProfileManagementView.as_view(), name='admin_profiles_management'),
    path('api/admin/profiles/<str:username>/edit/', AdminProfileEditView.as_view(), name='admin_profile_edit'),
    path('api/admin/profiles/<str:username>/', AdminProfileDetailView.as_view(), name='admin_profile_detail'),

    # Streaming Status
    path('api/streaming-status/', StreamingStatusView.as_view(), name='streaming_status'),
    path('api/streaming-control/', StreamingControlView.as_view(), name='streaming_control'),
    path('api/streaming-statistics/', StreamingStatisticsView.as_view(), name='streaming_statistics'),
    path('api/livekit/room-status/', LiveKitRoomStatusView.as_view(), name='livekit_room_status'),

    # WHIP Ingress for OBS Studio
    path('api/streaming/whip-ingress/', WHIPIngressView.as_view(), name='whip_ingress'),

    # Speed Test
    path('api/speedtest/ip/', SpeedTestIPView.as_view(), name='speedtest_ip'),

    # LiveKit WebRTC Endpoints (Non-ViewSet)
    path('api/webrtc/ingress/', LiveKitIngressView.as_view(), name='livekit_ingress'),
    path('api/webrtc/stream-key/', LiveKitStreamKeyView.as_view(), name='livekit_stream_key'),
    path('api/webrtc/egress/', LiveKitEgressView.as_view(), name='livekit_egress'),
    path('api/webrtc/guest-egress/', GuestRTMPEgressView.as_view(), name='guest_rtmp_egress'),
    path('api/webrtc/connection-check/', LiveKitConnectionCheckView.as_view(), name='livekit_connection_check'),
    path('api/webrtc/token/', LiveKitTokenView.as_view(), name='livekit_token'),
    path('api/webrtc/guest-token/', LiveKitGuestTokenView.as_view(), name='livekit_guest_token'),
    path('api/room-status/<str:room_name>/', RoomStatusByNameView.as_view(), name='room_status_by_name'),

    # Host token endpoint
    path('api/host-token/', HostTokenView.as_view(), name='host_token'),
    path('api/livekit/token/', HostTokenView.as_view(), name='livekit_token'),

    # Custom API Password Reset
    path('api/password-reset/', APIPasswordResetView.as_view(), name='api_password_reset'),
    path('api/password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='registration/password_reset_done.html'
    ), name='password_reset_done'),
    path('api/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='registration/password_reset_confirm.html',
        success_url='/api/reset/done/'
    ), name='password_reset_confirm'),
    path('api/reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='registration/password_reset_complete.html'
    ), name='password_reset_complete'),

    # Blog
    path('api/blog/posts/', BlogPostPublicListView.as_view(), name='blog_posts_list'),
    path('api/blog/posts/<slug:slug>/', BlogPostPublicDetailView.as_view(), name='blog_post_detail'),
    path('api/blog/posts/<slug:slug>/comments/', BlogCommentCreateView.as_view(), name='blog_comment_create'),
    path('api/blog/posts/<slug:slug>/like/', BlogPostLikeToggleView.as_view(), name='blog_post_like'),
    path('api/blog/posts/<slug:slug>/like-status/', BlogPostLikeStatusView.as_view(), name='blog_post_like_status'),
    path('api/blog/categories/', BlogCategoriesView.as_view(), name='blog_categories'),
    path('api/blog/featured/', BlogFeaturedPostView.as_view(), name='blog_featured_post'),

    # Blog Admin
    path('api/admin/blog/posts/', BlogPostAdminListView.as_view(), name='admin_blog_posts'),
    path('api/admin/blog/posts/<int:pk>/', BlogPostAdminDetailView.as_view(), name='admin_blog_post_detail'),
    path('api/admin/blog/comments/', BlogCommentAdminListView.as_view(), name='admin_blog_comments'),
    path('api/admin/blog/comments/<int:comment_id>/approve/', BlogCommentApproveView.as_view(), name='admin_blog_comment_approve'),
    path('api/admin/blog/comments/<int:comment_id>/delete/', BlogCommentDeleteView.as_view(), name='admin_blog_comment_delete'),

    # Blog Admin — Image Management
    path('api/admin/blog/posts/<int:post_id>/images/', BlogPostImageListCreateView.as_view(), name='admin_blog_images'),
    path('api/admin/blog/images/<int:image_id>/', BlogPostImageDetailView.as_view(), name='admin_blog_image_detail'),

    # Media Track View (lightweight)
    path('api/media/<int:pk>/track-view/', MediaTrackView.as_view(), name='media_track_view'),

    # Media Tag System
    path('api/media/<int:media_id>/tags/', MediaTagListView.as_view(), name='media_tags_list'),
    path('api/media/<int:media_id>/tags/add/', MediaTagCreateView.as_view(), name='media_tags_add'),
    path('api/media/tags/<int:tag_id>/delete/', MediaTagDeleteView.as_view(), name='media_tags_delete'),

    # COPPA AGE GATE
    path('api/age-gate/check/', AgeGateCheckView.as_view(), name='age_gate_check'),
    path('api/age-gate/parent-consent/', ParentConsentInitiateView.as_view(), name='parent_consent_initiate'),
    path('api/age-gate/parent-consent/status/', ParentConsentStatusView.as_view(), name='parent_consent_status'),
    path('api/age-gate/parent-consent/confirm/', ParentConsentConfirmView.as_view(), name='parent_consent_confirm'),
    path('api/age-gate/parent-consent/video-token/', ParentConsentVideoTokenView.as_view(), name='parent_consent_video_token'),
    path('api/age-gate/parent-consent/revoke/', ParentConsentRevokeView.as_view(), name='parent_consent_revoke'),

    # CONTENT REPORTING
    path('api/reports/create/', ContentReportCreateView.as_view(), name='content_report_create'),
    path('api/admin/reports/', ContentReportAdminListView.as_view(), name='admin_content_reports'),
    path('api/admin/reports/<int:report_id>/resolve/', ContentReportResolveView.as_view(), name='admin_content_report_resolve'),

    # COPPA ADMIN
    path('api/admin/coppa/logs/', COPPAAdminListView.as_view(), name='admin_coppa_logs'),
    path('api/admin/coppa/consent-requests/', COPPAConsentRequestAdminListView.as_view(), name='admin_coppa_consent_requests'),

    # REGISTRATION & EMAIL VERIFICATION
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/join-request/', JoinRequestView.as_view(), name='join_request'),
    path('api/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),

    # Include router URLs
    path('api/', include(router.urls)),

    # AVATAR ASSISTANT
    path('api/avatar/token/', AvatarTokenView.as_view(), name='avatar_token'),
    path('api/avatar/save-message/', AvatarSaveConversationView.as_view(), name='avatar_save_message'),
    path('api/avatar/conversation/', AvatarConversationHistoryView.as_view(), name='avatar_conversation'),
    path('api/avatar/end-session/', AvatarEndSessionView.as_view(), name='avatar_end_session'),
    path('api/avatar/guest-info/', AvatarGuestInfoView.as_view(), name='avatar_guest_info'),
    path('api/avatar/past-conversations/', AvatarPastConversationsView.as_view(), name='avatar_past_conversations'),
    path('api/admin/avatar/conversations/', AvatarConversationsForShowView.as_view(), name='admin_avatar_conversations'),

    # SITE CHAT
    # WEBAUTHN / PASSKEYS — Biometric Authentication
    path('api/webauthn/register/begin/', register_passkey_begin, name='webauthn_register_begin'),
    path('api/webauthn/register/complete/', register_passkey_complete, name='webauthn_register_complete'),
    path('api/webauthn/auth/begin/', authenticate_passkey_begin, name='webauthn_auth_begin'),
    path('api/webauthn/auth/complete/', authenticate_passkey_complete, name='webauthn_auth_complete'),
    path('api/webauthn/passkeys/', manage_passkeys, name='manage_passkeys'),

    # SITE CHAT
    path('api/site-chat/config/', SiteChatConfigView.as_view(), name='site_chat_config'),
    path('api/site-chat/ask/', SiteChatAskView.as_view(), name='site_chat_ask'),
    path('api/site-chat/session/', SiteChatSessionView.as_view(), name='site_chat_session'),
    path('api/site-chat/session/<str:session_id>/', SiteChatSessionView.as_view(), name='site_chat_session_detail'),
    path('api/site-chat/health/', SiteChatHealthView.as_view(), name='site_chat_health'),

    # Site Chat Admin
    path('api/admin/site-chat/config/', AdminSiteChatConfigView.as_view(), name='admin_site_chat_config'),
    path('api/admin/site-chat/faqs/', AdminSiteChatFAQListView.as_view(), name='admin_site_chat_faqs'),
    path('api/admin/site-chat/faqs/<int:faq_id>/', AdminSiteChatFAQDetailView.as_view(), name='admin_site_chat_faq_detail'),
    path('api/admin/site-chat/unanswered/', AdminSiteChatUnansweredView.as_view(), name='admin_site_chat_unanswered'),
    path('api/admin/site-chat/unanswered/<int:unanswered_id>/promote/', AdminSiteChatUnansweredView.as_view(), name='admin_site_chat_unanswered_promote'),
]

# ================================================================
# SPORTS MODULE — conditionally registered
# ================================================================
if getattr(settings, 'SPORTS_MODULE_ENABLED', False):
    urlpatterns += [
        # Elite Athlete Stats System
        path('api/sports/', SportListView.as_view(), name='sports_list'),
        path('api/sports/attributes/', SportAttributeListView.as_view(), name='sport_attributes'),
        path('api/stats/update/', StatUpdateView.as_view(), name='stat_update'),
        path('api/stats/history/<str:stat_type>/', StatHistoryView.as_view(), name='stat_history'),
        path('api/leaderboard/<str:stat_type>/', LeaderboardView.as_view(), name='leaderboard'),
        path('api/stats/verifications/', VerificationsStatView.as_view(), name='stat_verifications'),

        # Coach & Athlete Drill Library
        path('api/drills/', DrillListView.as_view(), name='drills_list'),
        path('api/drills/trending/', TrendingDrillsView.as_view(), name='drills_trending'),
        path('api/drills/recent/', RecentDrillsView.as_view(), name='drills_recent'),
        path('api/drills/<int:pk>/', DrillDetailView.as_view(), name='drill_detail'),
        path('api/drills/create/', DrillCreateView.as_view(), name='drill_create'),
        path('api/drills/<int:pk>/update/', DrillUpdateView.as_view(), name='drill_update'),
        path('api/drills/<int:pk>/delete/', DrillDeleteView.as_view(), name='drill_delete'),
        path('api/drills/<int:pk>/like/', DrillLikeToggleView.as_view(), name='drill_like'),
        path('api/drills/<int:pk>/save/', DrillSaveToggleView.as_view(), name='drill_save'),
        path('api/drills/saved/', DrillSavedListView.as_view(), name='drills_saved'),
        path('api/drills/my-drills/', DrillMyDrillsView.as_view(), name='drills_mine'),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
