"""
Admin configuration for Avatar Assistant models.
"""

from django.contrib import admin
from .avatar_models import GreenRoomPrompt, GuestConversation


@admin.register(GreenRoomPrompt)
class GreenRoomPromptAdmin(admin.ModelAdmin):
    list_display = ['id', 'show_link', 'guest_name_display', 'model_name', 'is_active', 'priority', 'updated_at']
    list_filter = ['is_active', 'model_name', 'show']
    search_fields = ['guest_name', 'guest_info', 'system_prompt', 'show__title', 'guest__username']
    list_editable = ['is_active', 'priority']
    list_select_related = ['show', 'guest']

    fieldsets = (
        ('Assignment', {
            'fields': ('show', 'guest', 'guest_name', 'guest_info'),
            'description': 'Link to a specific show or guest (optional). Higher priority prompts are checked first.'
        }),
        ('Personality & Prompt', {
            'fields': ('system_prompt', 'welcome_message'),
            'description': 'The system prompt defines the avatar personality. Welcome message plays on entry.'
        }),
        ('AI Model Settings', {
            'fields': ('model_name', 'temperature', 'max_tokens', 'piper_voice'),
            'classes': ('collapse',),
            'description': 'Ollama model and TTS voice settings.'
        }),
        ('Status', {
            'fields': ('is_active', 'priority'),
        }),
    )

    def show_link(self, obj):
        if obj.show:
            return obj.show.title
        return "—"
    show_link.short_description = "Show"
    show_link.admin_order_field = 'show__title'

    def guest_name_display(self, obj):
        if obj.guest:
            return f"{obj.guest.username} (user)"
        return obj.guest_name or "—"
    guest_name_display.short_description = "Guest"
    guest_name_display.admin_order_field = 'guest_name'


@admin.register(GuestConversation)
class GuestConversationAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'show_link', 'message_count', 'guest_ready', 'duration_display', 'created_at']
    list_filter = ['guest_ready', 'created_at', 'show']
    search_fields = ['guest_name', 'guest_email', 'guest__username', 'session_id', 'guest_notes']
    readonly_fields = ['session_id', 'guest_name', 'guest_email', 'room_name', 'message_count',
                       'duration_seconds', 'guest_ready', 'created_at', 'updated_at', 'ended_at',
                       'messages_preview', 'guest_notes']
    list_select_related = ['guest', 'show', 'prompt_used']

    fieldsets = (
        ('Session Info', {
            'fields': ('session_id', 'guest_name', 'guest_email', 'room_name'),
        }),
        ('Show & Prompt', {
            'fields': ('show', 'prompt_used'),
        }),
        ('Conversation', {
            'fields': ('messages_preview',),
            'description': 'Full conversation stored as JSON.',
            'classes': ('collapse',),
        }),
        ('Status', {
            'fields': ('message_count', 'duration_seconds', 'guest_ready'),
        }),
        ('Notes', {
            'fields': ('guest_notes',),
            'description': 'Admin notes about this guest from the conversation.',
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'ended_at'),
            'classes': ('collapse',),
        }),
    )

    def show_link(self, obj):
        if obj.show:
            return obj.show.title
        return "—"
    show_link.short_description = "Show"

    def duration_display(self, obj):
        if obj.duration_seconds:
            mins, secs = divmod(obj.duration_seconds, 60)
            return f"{mins}m {secs}s"
        return "—"
    duration_display.short_description = "Duration"

    def messages_preview(self, obj):
        if not obj.messages:
            return "No messages"
        preview = []
        for msg in obj.messages[-5:]:  # Show last 5
            role = msg.get('role', '?')
            content = msg.get('content', '')
            if len(content) > 150:
                content = content[:150] + '...'
            preview.append(f"<b>{role}:</b> {content}")
        preview.append(f"<i>... {max(0, obj.message_count - 5)} older message(s)</i>" if obj.message_count > 5 else "")
        return "".join(f"<p style='margin:2px 0;font-size:12px;'>{p}</p>" for p in preview if p)
    messages_preview.short_description = "Recent Messages"
    messages_preview.allow_tags = True
