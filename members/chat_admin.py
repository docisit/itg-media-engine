"""
Site Chat Admin — Django Admin Registration
"""
from django.contrib import admin
from django.utils.html import format_html
from .chat_models import SiteChatConfig, SiteChatFAQ, SiteChatSession, SiteChatUnanswered


@admin.register(SiteChatConfig)
class SiteChatConfigAdmin(admin.ModelAdmin):
    list_display = ['assistant_name', 'mood', 'tone', 'is_active', 'contact_email', 'updated_at']
    list_editable = ['is_active']
    fieldsets = (
        ('Identity', {
            'fields': ('assistant_name', 'mood', 'tone'),
        }),
        ('System Prompt', {
            'fields': ('system_prompt',),
            'description': 'Base prompt for the Ollama model. Keep concise.',
        }),
        ('Business Contact Info', {
            'fields': ('contact_email', 'contact_form_url', 'video_submission_info', 'business_hours', 'social_links'),
            'description': 'This info is injected into the system prompt so the model can answer accurately about contacting you, submitting videos, etc.',
        }),
        ('Rate Limiting', {
            'fields': ('rate_limit_per_minute', 'rate_limit_block_minutes'),
            'description': 'Max chat requests per IP per minute, and how long (minutes) to block after exceeding.',
        }),
        ('Content Restrictions', {
            'fields': ('restricted_topics', 'prefer_faq_exact'),
            'description': 'Restrict the model from discussing certain topics.',
        }),
        ('Model Settings', {
            'fields': ('max_tokens', 'temperature'),
            'classes': ('collapse',),
        }),
        ('Status', {
            'fields': ('is_active', 'updated_by'),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.updated_by_id:
            obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SiteChatFAQ)
class SiteChatFAQAdmin(admin.ModelAdmin):
    list_display = ['question_preview', 'category', 'priority', 'times_asked', 'is_published', 'updated_at']
    list_filter = ['category', 'is_published']
    list_editable = ['priority', 'is_published']
    search_fields = ['question', 'answer', 'keywords']
    fieldsets = (
        ('Q&A', {
            'fields': ('question', 'answer'),
        }),
        ('Matching', {
            'fields': ('keywords', 'category'),
            'description': 'Keywords help match similar questions. Category groups FAQs in the frontend.',
        }),
        ('Status', {
            'fields': ('is_published', 'priority'),
        }),
        ('Stats', {
            'fields': ('times_asked',),
            'classes': ('collapse',),
        }),
    )
    actions = ['publish_faqs', 'unpublish_faqs', 'reset_counters']

    def question_preview(self, obj):
        return obj.question[:80] + ('...' if len(obj.question) > 80 else '')
    question_preview.short_description = 'Question'

    def publish_faqs(self, request, queryset):
        queryset.update(is_published=True)
    publish_faqs.short_description = "Publish selected FAQs"

    def unpublish_faqs(self, request, queryset):
        queryset.update(is_published=False)
    unpublish_faqs.short_description = "Unpublish selected FAQs"

    def reset_counters(self, request, queryset):
        queryset.update(times_asked=0)
    reset_counters.short_description = "Reset times_asked counters"


@admin.register(SiteChatSession)
class SiteChatSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id_short', 'user', 'message_count', 'created_at', 'updated_at']
    list_filter = ['created_at']
    search_fields = ['session_id', 'user__username']
    readonly_fields = ['session_id', 'user', 'messages', 'message_count', 'created_at', 'updated_at']

    def session_id_short(self, obj):
        return obj.session_id[:16] + '...'
    session_id_short.short_description = 'Session ID'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SiteChatUnanswered)
class SiteChatUnansweredAdmin(admin.ModelAdmin):
    list_display = ['question_preview', 'reviewed', 'asked_at']
    list_filter = ['reviewed', 'asked_at']
    search_fields = ['question', 'answer_given']
    readonly_fields = ['question', 'answer_given', 'session', 'asked_at']
    actions = ['mark_reviewed', 'mark_unreviewed']

    def question_preview(self, obj):
        return obj.question[:80] + ('...' if len(obj.question) > 80 else '')
    question_preview.short_description = 'Question'

    def mark_reviewed(self, request, queryset):
        queryset.update(reviewed=True)
    mark_reviewed.short_description = "Mark as reviewed"

    def mark_unreviewed(self, request, queryset):
        queryset.update(reviewed=False)
    mark_unreviewed.short_description = "Mark as unreviewed"
