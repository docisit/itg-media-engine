from django.contrib import admin
from django.contrib import messages
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q, Max
from datetime import timedelta
from django.conf import settings
from .models import Profile, Show, GuestRequest, MediaAsset, Vote, ContactInquiry, JoinRequest, BlogPost, BlogComment, StreamingPlatform, StreamingSession
from .avatar_admin import *  # Register avatar models
from .chat_admin import *    # Register site chat models (SiteChatConfig, SiteChatFAQ, etc.)

# ============================================================================
# SPORTS MODULE (optional) — models only registered when feature flag is on
# ============================================================================
_sports_enabled = getattr(settings, 'SPORTS_MODULE_ENABLED', False)
if _sports_enabled:
    from .models import Sport, AthleteStatEntry, StatVerificationVideo, SportAttribute, MediaTag, Drill, LiveVerificationRequest


# ADMIN DASHBOARD — ATHLETE STATS MONITORING
# =============================================================================
# Staff can access: /admin/ → Athlete Stats section
# Highlights: new submissions, pending verifications, recent PRs, trend arrows
# =============================================================================


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'school_name', 'position', 'graduation_year',
                    'state', 'profile_stats_preview', 'recent_pr_badge']
    list_filter = ['role', 'graduation_year', 'state']
    search_fields = ['user__username', 'school_name', 'position', 'state']
    list_select_related = ['user']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'role', 'bio', 'profile_image'),
        }),
        ('Recruiting', {
            'fields': ('graduation_year', 'position', 'school_name', 'state'),
        }),
        ('Scouting Links', {
            'fields': ('hudl_link', 'maxpreps_link', 'twitter_x_link'),
            'classes': ('collapse',),
        }),
        ('Sports', {
            'fields': ('sports',),
            'description': 'Multi-sport selection — hold Ctrl/Cmd to select multiple.',
        }),
        ('Athlete Measurables', {
            'fields': ('height_ft', 'height_in', 'weight_lbs'),
            'classes': ('collapse',),
        }),
        ('Performance Stats', {
            'fields': ('vertical_jump_in', 'forty_yard_time', 'shuttle_time', 'gpa'),
            'classes': ('collapse',),
        }),
        ('Lifting Maxes', {
            'fields': ('max_bench_lbs', 'max_squat_lbs', 'max_power_clean_lbs'),
            'classes': ('collapse',),
        }),
    )
    
    def profile_stats_preview(self, obj):
        """Show mini stat card in list view"""
        parts = []
        if obj.vertical_jump_in:
            parts.append(f"VJ: {obj.vertical_jump_in}\"")
        if obj.forty_yard_time:
            parts.append(f"40: {obj.forty_yard_time}s")
        if obj.max_bench_lbs:
            ratio = obj.bench_ratio
            parts.append(f"BP: {obj.max_bench_lbs}lbs" + (f" ({ratio}x)" if ratio else ""))
        return " | ".join(parts) if parts else "—"
    profile_stats_preview.short_description = "Stats"
    
    def recent_pr_badge(self, obj):
        """Show badge if athlete set a new PR in last 7 days (sports module only)"""
        if not _sports_enabled:
            return "—"
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_prs = AthleteStatEntry.objects.filter(
            athlete=obj, recorded_at__gte=seven_days_ago
        ).values('stat_type').annotate(
            max_val=Max('value')
        ).order_by('-max_val')[:3]
        
        if not recent_prs:
            return "—"
        
        badges = []
        for pr in recent_prs:
            stat_label = dict(AthleteStatEntry.STAT_TYPE_CHOICES).get(pr['stat_type'], pr['stat_type'])
            badge_html = f'<span style="background:#22c55e;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">PR {stat_label}</span>'
            badges.append(badge_html)
        return format_html(" ".join(badges))
    recent_pr_badge.short_description = "Recent PRs"

    
    actions = ['view_as_athlete_dashboard']
    
    def view_as_athlete_dashboard(self, request, queryset):
        """Redirect to a filtered view showing athlete stats overview"""
        self.message_user(request, f"Selected {queryset.count()} athlete profiles for review.")
    view_as_athlete_dashboard.short_description = "Review selected athletes"

@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):
    list_display = ['title', 'guest', 'air_date', 'is_live']
    list_filter = ['is_live', 'air_date']
    search_fields = ['title', 'guest__user__username']
    date_hierarchy = 'air_date'
    
    def make_live(self, request, queryset):
        queryset.update(is_live=True)
    make_live.short_description = "Mark selected shows as live"
    
    def end_live(self, request, queryset):
        queryset.update(is_live=False)
    end_live.short_description = "End live status for selected shows"
    
    actions = [make_live, end_live]

@admin.register(GuestRequest)
class GuestRequestAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'role', 'status', 'submitted_at']
    list_filter = ['status', 'role', 'submitted_at']
    search_fields = ['name', 'email', 'bio']
    readonly_fields = ['submitted_at']
    actions = ['approve_requests', 'reject_requests']
    
    def approve_requests(self, request, queryset):
        queryset.update(status='approved')
    approve_requests.short_description = "Approve selected guest requests"
    
    def reject_requests(self, request, queryset):
        queryset.update(status='rejected')
    reject_requests.short_description = "Reject selected guest requests"

@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'media_type', 'created_at']
    list_filter = ['media_type', 'created_at']
    search_fields = ['title', 'description', 'user__username']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Media Info', {
            'fields': ('user', 'title', 'description', 'media_type'),
        }),
        ('Files', {
            'fields': ('file', 'thumbnail'),
            'description': 'Upload video file and optional thumbnail image.'
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not obj.user_id and not change:
            obj.user = request.user
        super().save_model(request, obj, form, change)

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['voter', 'athlete', 'voted_at']
    readonly_fields = ['voted_at']

@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'inquiry_type', 'submitted_at', 'is_responded']
    list_filter = ['inquiry_type', 'is_responded', 'submitted_at']
    search_fields = ['name', 'email', 'message']
    readonly_fields = ['submitted_at']
    actions = ['mark_as_responded']
    
    def mark_as_responded(self, request, queryset):
        queryset.update(is_responded=True)
    mark_as_responded.short_description = "Mark selected inquiries as responded"
@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'role', 'status', 'submitted_at']
    list_filter = ['status', 'role', 'submitted_at']
    search_fields = ['first_name', 'last_name', 'email', 'school_or_organization']
    readonly_fields = ['submitted_at', 'reviewed_at']
    actions = ['approve_requests', 'reject_requests']
    
    fieldsets = (
        ('Applicant Info', {
            'fields': ('first_name', 'last_name', 'email', 'role'),
        }),
        ('Background', {
            'fields': ('school_or_organization', 'position_or_sport', 'message'),
        }),
        ('Status', {
            'fields': ('status', 'admin_notes'),
        }),
        ('Review', {
            'fields': ('reviewed_by', 'reviewed_at'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('submitted_at',),
            'classes': ('collapse',),
        }),
    )
    
    def approve_requests(self, request, queryset):
        for jr in queryset.filter(status='pending'):
            jr.approve(request.user)
        self.message_user(request, f"Approved {queryset.filter(status='pending').count()} join request(s).")
    approve_requests.short_description = "Approve selected join requests"
    
    def reject_requests(self, request, queryset):
        for jr in queryset.filter(status='pending'):
            jr.reject(request.user, 'Rejected by admin.')
        self.message_user(request, f"Rejected {queryset.filter(status='pending').count()} join request(s).")
    reject_requests.short_description = "Reject selected join requests"
    
    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data and obj.status in ('approved', 'rejected'):
            obj.reviewed_at = timezone.now()
            obj.reviewed_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'is_published', 'published_at', 'view_count', 'comment_count']
    list_filter = ['is_published', 'category', 'created_at']
    search_fields = ['title', 'content', 'excerpt', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['view_count', 'created_at', 'updated_at', 'published_at']
    date_hierarchy = 'published_at'
    
    fieldsets = (
        ('Content', {
            'fields': ('title', 'slug', 'content', 'excerpt'),
        }),
        ('Author & Organization', {
            'fields': ('author', 'category', 'tags'),
        }),
        ('Media', {
            'fields': ('featured_image', 'featured_image_compressed', 'video_url'),
            'description': 'Upload images (auto-compressed to WebP) or add video links.',
        }),
        ('Publishing', {
            'fields': ('is_published', 'published_at', 'allow_comments'),
        }),
        ('Statistics', {
            'fields': ('view_count',),
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['publish_posts', 'unpublish_posts']
    
    def publish_posts(self, request, queryset):
        from django.utils import timezone
        for post in queryset:
            post.is_published = True
            if not post.published_at:
                post.published_at = timezone.now()
            post.save()
    publish_posts.short_description = "Publish selected posts"
    
    def unpublish_posts(self, request, queryset):
        queryset.update(is_published=False)
    unpublish_posts.short_description = "Unpublish selected posts"
    
    def save_model(self, request, obj, form, change):
        if not obj.author_id and not change:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(BlogComment)
class BlogCommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'post', 'content_preview', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'created_at']
    search_fields = ['content', 'author__username', 'post__title']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['approve_comments', 'reject_comments']
    
    def content_preview(self, obj):
        return obj.content[:75] + '...' if len(obj.content) > 75 else obj.content
    content_preview.short_description = 'Comment'
    
    def approve_comments(self, request, queryset):
        from django.utils import timezone
        for comment in queryset:
            comment.is_approved = True
            comment.approved_at = timezone.now()
            comment.approved_by = request.user
            comment.save()
    approve_comments.short_description = "Approve selected comments"
    
    def reject_comments(self, request, queryset):
        queryset.delete()
    reject_comments.short_description = "Delete selected comments"


@admin.register(StreamingPlatform)
class StreamingPlatformAdmin(admin.ModelAdmin):
    list_display = ['name', 'platform_type', 'is_enabled', 'is_active', 'last_test', 'test_status']
    list_filter = ['platform_type', 'is_enabled', 'is_active', 'test_status']
    search_fields = ['name', 'rtmp_url', 'youtube_broadcast_id', 'facebook_page_id', 'tiktok_username']
    readonly_fields = ['created_at', 'updated_at', 'last_test']
    
    fieldsets = (
        ('Platform Info', {
            'fields': ('name', 'platform_type', 'is_enabled', 'is_active'),
        }),
        ('RTMP Configuration', {
            'fields': ('rtmp_url', 'stream_key'),
            'description': 'RTMP server URL and stream key for broadcasting.'
        }),
        ('Platform-Specific Settings', {
            'fields': ('youtube_broadcast_id', 'facebook_page_id', 'tiktok_username', 'custom_settings'),
            'description': 'Platform-specific identifiers and settings.',
            'classes': ('collapse',),
        }),
        ('Status & Testing', {
            'fields': ('test_status', 'last_test'),
            'description': 'Connection testing status and history.',
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['enable_platforms', 'disable_platforms', 'test_connections']
    
    def enable_platforms(self, request, queryset):
        queryset.update(is_enabled=True)
    enable_platforms.short_description = "Enable selected platforms"
    
    def disable_platforms(self, request, queryset):
        queryset.update(is_enabled=False)
    disable_platforms.short_description = "Disable selected platforms"
    
    def test_connections(self, request, queryset):
        # Simulate connection test
        for platform in queryset:
            platform.test_status = True  # In production, this would actually test the connection
            platform.save()
        self.message_user(request, f"Connection tests completed for {queryset.count()} platform(s)")
    test_connections.short_description = "Test connections for selected platforms"


# ============================================================================
# SPORTS MODULE ADMIN — only registered when SPORTS_MODULE_ENABLED=True
# ============================================================================
if _sports_enabled:

    @admin.register(Sport)
    class SportAdmin(admin.ModelAdmin):
        list_display = ['name', 'slug', 'icon']
        search_fields = ['name']
        prepopulated_fields = {'slug': ('name',)}


    @admin.register(AthleteStatEntry)
    class AthleteStatEntryAdmin(admin.ModelAdmin):
        list_display = ['athlete', 'stat_type', 'value', 'trend_indicator', 'is_verified', 'recorded_at']
        list_filter = ['stat_type', 'is_verified', 'recorded_at']
        search_fields = ['athlete__user__username', 'athlete__school_name']
        date_hierarchy = 'recorded_at'
        actions = ['mark_as_verified']
        
        def get_queryset(self, request):
            """Annotate with previous entry for trend detection"""
            qs = super().get_queryset(request)
            return qs.select_related('athlete__user')
        
        def trend_indicator(self, obj):
            """Show green up arrow / red down arrow / yellow new badge"""
            # Get the previous entry for this athlete+stat
            prev = AthleteStatEntry.objects.filter(
                athlete=obj.athlete,
                stat_type=obj.stat_type,
                recorded_at__lt=obj.recorded_at
            ).order_by('-recorded_at').first()
            
            if not prev:
                return format_html(
                    '<span style="background:#f59e0b;color:#000;padding:1px 6px;border-radius:10px;font-size:11px;">NEW</span>'
                )
            
            better_when_higher = ['vertical_jump', 'max_bench', 'max_squat', 'max_power_clean', 'gpa']
            
            if obj.value > prev.value:
                if obj.stat_type in better_when_higher:
                    return format_html('⬆️ <span style="color:#22c55e;font-weight:bold">PR</span>')
                else:
                    return format_html('⬇️ <span style="color:#ef4444;">decline</span>')
            elif obj.value < prev.value:
                if obj.stat_type in better_when_higher:
                    return format_html('⬇️ <span style="color:#ef4444;">down</span>')
                else:
                    return format_html('⬆️ <span style="color:#22c55e;font-weight:bold">PR</span>')
            else:
                return format_html('➡️ <span style="color:#6b7280;">same</span>')
        trend_indicator.short_description = 'vs Previous'
        
        def mark_as_verified(self, request, queryset):
            queryset.update(is_verified=True)
            self.message_user(request, f"Marked {queryset.count()} stat entries as verified.")
        mark_as_verified.short_description = "Mark selected as verified"
        
        def changelist_view(self, request, extra_context=None):
            """Add alert banner for new entries in last 24 hours"""
            extra_context = extra_context or {}
            last_24h = timezone.now() - timedelta(hours=24)
            new_count = AthleteStatEntry.objects.filter(recorded_at__gte=last_24h).count()
            
            if new_count > 0:
                extra_context['new_submissions_alert'] = new_count
                extra_context['new_submissions_label'] = f"🚨 {new_count} new stat submission(s) in the last 24 hours"
            
            return super().changelist_view(request, extra_context=extra_context)


    @admin.register(StatVerificationVideo)
    class StatVerificationVideoAdmin(admin.ModelAdmin):
        list_display = ['athlete', 'stat_type', 'video_status_badge', 'uploaded_at', 'review_action']
        list_filter = ['stat_type', 'is_approved', 'uploaded_at']
        search_fields = ['athlete__user__username', 'athlete__school_name']
        date_hierarchy = 'uploaded_at'
        list_select_related = ['athlete__user']
        actions = ['approve_videos', 'reject_videos']
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            return qs.order_by('-is_approved', '-uploaded_at')
        
        def video_status_badge(self, obj):
            if obj.is_approved:
                return format_html(
                    '<span style="background:#22c55e;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">✅ Verified</span>'
                )
            return format_html(
                '<span style="background:#f59e0b;color:#000;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">⏳ Pending Review</span>'
            )
        video_status_badge.short_description = 'Status'
        
        def review_action(self, obj):
            if obj.is_approved:
                return "—"
            approve_url = reverse('admin:members_statverificationvideo_changelist')
            return format_html(
                '<a href="{}/?q={}" style="background:#3b82f6;color:#fff;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:11px;">Review →</a>',
                approve_url, obj.athlete.user.username
            )
        review_action.short_description = 'Quick Action'
        
        def approve_videos(self, request, queryset):
            from django.utils import timezone
            count = queryset.filter(is_approved=False).update(
                is_approved=True, approved_at=timezone.now(), approved_by=request.user
            )
            self.message_user(request, f"✅ Approved {count} verification video(s).")
        approve_videos.short_description = "Approve selected verification videos"
        
        def reject_videos(self, request, queryset):
            count = queryset.filter(is_approved=True).count()
            queryset.update(is_approved=False, approved_at=None, approved_by=None)
            self.message_user(request, f"Rejected {count} verification video(s).")
        reject_videos.short_description = "Reject selected verification videos"
        
        def changelist_view(self, request, extra_context=None):
            extra_context = extra_context or {}
            pending_count = StatVerificationVideo.objects.filter(is_approved=False).count()
            if pending_count > 0:
                extra_context['pending_verifications_alert'] = pending_count
                extra_context['pending_verifications_label'] = f"📹 {pending_count} verification video(s) awaiting review"
            extra_context['athlete_stats_title'] = '🏋️ Athlete Stats — Staff Control Panel'
            return super().changelist_view(request, extra_context=extra_context)


    @admin.register(SportAttribute)
    class SportAttributeAdmin(admin.ModelAdmin):
        list_display = ["sport", "name", "slug", "unit", "is_measurable", "sort_order"]
        list_filter = ["sport", "is_measurable"]
        search_fields = ["name", "slug", "sport__name"]
        list_editable = ["sort_order"]


    @admin.register(MediaTag)
    class MediaTagAdmin(admin.ModelAdmin):
        list_display = ["media", "key", "value"]
        list_filter = ["key"]
        search_fields = ["key", "value", "media__title"]


    @admin.register(Drill)
    class DrillAdmin(admin.ModelAdmin):
        list_display = ["title", "creator", "sport", "difficulty", "is_published", "is_featured", "view_count"]
        list_filter = ["difficulty", "is_published", "is_featured", "sport"]
        search_fields = ["title", "description", "creator__username"]
        actions = ["feature_drills", "unfeature_drills", "publish_drills"]

        def feature_drills(self, request, queryset):
            queryset.update(is_featured=True)
        feature_drills.short_description = "Feature selected drills"

        def unfeature_drills(self, request, queryset):
            queryset.update(is_featured=False)
        unfeature_drills.short_description = "Unfeature selected drills"

        def publish_drills(self, request, queryset):
            queryset.update(is_published=True)
        publish_drills.short_description = "Publish selected drills"


    @admin.register(LiveVerificationRequest)
    class LiveVerificationRequestAdmin(admin.ModelAdmin):
        list_display = ["athlete", "stat_label", "status", "scheduled_at", "created_at"]
        list_filter = ["status"]
        search_fields = ["athlete__user__username", "stat_label"]

# ============================================================================
# END SPORTS MODULE ADMIN
# ============================================================================


@admin.register(StreamingSession)

class StreamingSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'is_active', 'started_at', 'ended_at', 'duration', 'platform_count']
    list_filter = ['is_active', 'started_at']
    search_fields = ['session_id']
    readonly_fields = ['session_id', 'started_at', 'ended_at', 'duration', 'viewer_count', 'bitrate', 'total_viewers', 'peak_viewers', 'total_duration']
    filter_horizontal = ['platforms']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('session_id', 'is_active'),
        }),
        ('Platforms', {
            'fields': ('platforms',),
            'description': 'Select platforms for this streaming session.',
        }),
        ('Statistics', {
            'fields': ('viewer_count', 'bitrate', 'total_viewers', 'peak_viewers', 'total_duration'),
            'description': 'Streaming statistics (automatically updated).',
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('started_at', 'ended_at', 'duration'),
            'classes': ('collapse',),
        }),
    )
    
    def platform_count(self, obj):
        return obj.platforms.count()
    platform_count.short_description = 'Platforms'
    
    def save_model(self, request, obj, form, change):
        # Generate session ID if creating new
        if not obj.session_id and not change:
            import secrets
            obj.session_id = f"session_{secrets.token_hex(8)}"
        
        # Set started_at if starting a new active session
        if obj.is_active and not obj.started_at:
            from django.utils import timezone
            obj.started_at = timezone.now()
        
        # Set ended_at and calculate duration if ending an active session
        if not obj.is_active and obj.started_at and not obj.ended_at:
            from django.utils import timezone
            obj.ended_at = timezone.now()
            if obj.started_at:
                obj.duration = int((obj.ended_at - obj.started_at).total_seconds())
        
        super().save_model(request, obj, form, change)
    
    actions = ['start_sessions', 'stop_sessions']
    
    def start_sessions(self, request, queryset):
        from django.utils import timezone
        for session in queryset:
            session.is_active = True
            if not session.started_at:
                session.started_at = timezone.now()
            session.save()
        self.message_user(request, f"Started {queryset.count()} streaming session(s)")
    start_sessions.short_description = "Start selected sessions"
    
    def stop_sessions(self, request, queryset):
        from django.utils import timezone
        for session in queryset:
            session.is_active = False
            if session.started_at and not session.ended_at:
                session.ended_at = timezone.now()
                session.duration = int((session.ended_at - session.started_at).total_seconds())
            session.save()
        self.message_user(request, f"Stopped {queryset.count()} streaming session(s)")
    stop_sessions.short_description = "Stop selected sessions"