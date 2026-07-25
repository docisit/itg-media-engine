"""
Avatar Assistant Models — Green Room Talking Avatar.
Admins configure prompts per guest, conversations are stored in PostgreSQL.
Includes auto-summary and automatic cleanup of old conversations.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class GreenRoomPrompt(models.Model):
    """Admin-editable prompts for the talking avatar agent."""

    # Optional: link to a specific show
    show = models.ForeignKey(
        'Show', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='avatar_prompts',
        help_text="Optional: Link to a specific show"
    )

    # Optional: link to a specific guest user
    guest = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='avatar_prompts',
        help_text="Optional: Link to a specific guest user"
    )

    # The system prompt that defines the avatar's personality
    system_prompt = models.TextField(
        default=(
            "You are a friendly, warm assistant named 'Lil\' Dawg' who helps guests "
            "feel comfortable before going live on a broadcast. Your job is to:\n"
            "1. Greet them warmly by name\n"
            "2. Remind them to use headphones for clear audio\n"
            "3. Remind them to have a stable internet connection\n"
            "4. Remind them to find a quiet, well-lit space\n"
            "5. Answer any questions they have about the show\n"
            "6. Let them know they can proceed when ready\n"
            "Be concise, friendly, and encouraging. Keep responses under 3 sentences."
        ),
        help_text="The system prompt that defines the avatar's personality and behavior"
    )

    # Guest-specific info for personalization
    guest_name = models.CharField(
        max_length=200, blank=True,
        help_text="Override: guest's name for the avatar to use"
    )
    guest_info = models.TextField(
        blank=True,
        help_text="Extra info about the guest (background, topic, etc.) that the avatar should know"
    )
    welcome_message = models.TextField(
        blank=True,
        help_text="Custom welcome message to play when the guest enters the avatar room"
    )

    # Model selection
    model_name = models.CharField(
        max_length=100, default='llama3.2:1b',
        help_text="Ollama model to use (e.g., llama3.2:1b, llama3.1:8b)"
    )
    temperature = models.FloatField(
        default=0.7,
        help_text="Response creativity (0.0 = deterministic, 1.0 = creative)"
    )
    max_tokens = models.IntegerField(
        default=256,
        help_text="Maximum tokens per response"
    )

    # TTS voice
    piper_voice = models.CharField(
        max_length=100, default='en_US-lessac-medium',
        help_text="Piper TTS voice model"
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Enable/disable this avatar prompt configuration"
    )

    # Priority: higher = used first when matching
    priority = models.IntegerField(
        default=0,
        help_text="Higher priority prompts are used first"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-updated_at']
        verbose_name = "Green Room Avatar Prompt"
        verbose_name_plural = "Green Room Avatar Prompts"
        indexes = [
            models.Index(fields=['show', 'is_active']),
            models.Index(fields=['guest', 'is_active']),
        ]

    def __str__(self):
        parts = []
        if self.show:
            parts.append(f"Show: {self.show.title}")
        if self.guest:
            parts.append(f"Guest: {self.guest.username}")
        if self.guest_name:
            parts.append(f"({self.guest_name})")
        return " | ".join(parts) if parts else f"Prompt #{self.id}"


class GuestConversationManager(models.Manager):
    """Manager with cleanup helper for old conversation data."""

    def prune_old(self, days: int = 90):
        """
        Delete conversations ended more than `days` ago.
        Their summaries are preserved in guest_notes for future context.
        Returns the number of deleted records.
        """
        cutoff = timezone.now() - timedelta(days=days)
        old = self.filter(ended_at__lt=cutoff)
        count, _ = old.delete()
        return count

    def prune_old_without_end(self, days: int = 90):
        """
        Delete conversations that never ended and were created more than `days` ago
        (stale/abandoned sessions).
        """
        cutoff = timezone.now() - timedelta(days=days)
        old = self.filter(ended_at__isnull=True, created_at__lt=cutoff)
        count, _ = old.delete()
        return count


class GuestConversation(models.Model):
    """Stores conversation history between a guest and the avatar agent."""

    guest = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True,
        related_name='avatar_conversations',
        help_text="The guest user (null for anonymous)"
    )
    guest_name = models.CharField(
        max_length=200, blank=True,
        help_text="The guest's display name"
    )
    guest_email = models.EmailField(
        blank=True,
        help_text="The guest's email (for identification)"
    )
    show = models.ForeignKey(
        'Show', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='avatar_conversations',
        help_text="The show this conversation is for"
    )
    prompt_used = models.ForeignKey(
        GreenRoomPrompt, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Which prompt configuration was used"
    )
    room_name = models.CharField(
        max_length=200, blank=True,
        help_text="LiveKit room name used for this session"
    )

    # Conversation data stored as JSON array of {role, content, timestamp}
    messages = models.JSONField(
        default=list, blank=True,
        help_text="Array of message objects: [{role, content, timestamp}]"
    )

    # Session metadata
    session_id = models.CharField(
        max_length=100, unique=True,
        help_text="Unique session identifier"
    )
    message_count = models.IntegerField(default=0)
    duration_seconds = models.IntegerField(
        default=0,
        help_text="How long the conversation lasted"
    )
    guest_ready = models.BooleanField(
        default=False,
        help_text="Guest indicated they're ready to proceed"
    )

    # Auto-generated summary (2-3 sentences via Ollama when session ends)
    auto_summary = models.TextField(
        blank=True,
        help_text="Auto-generated 2-3 sentence summary of this conversation (generated at session end)"
    )

    # Admin notes about this guest from the conversation
    guest_notes = models.TextField(
        blank=True,
        help_text="Admin notes about this guest from the conversation"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    objects = GuestConversationManager()

    class Meta:
        ordering = ['-updated_at']
        verbose_name = "Guest Avatar Conversation"
        verbose_name_plural = "Guest Avatar Conversations"
        indexes = [
            models.Index(fields=['guest', '-updated_at']),
            models.Index(fields=['show', '-updated_at']),
            models.Index(fields=['session_id']),
            models.Index(fields=['ended_at']),
        ]

    def __str__(self):
        name = self.guest_name or self.guest.username if self.guest else "Anonymous"
        return f"{name} - {self.show.title if self.show else 'No Show'} ({self.created_at.date()})"

    def add_message(self, role: str, content: str):
        """Add a message to the conversation, capping at MAX_MESSAGES."""
        MAX_MESSAGES = 100
        if not isinstance(self.messages, list):
            self.messages = []
        self.messages.append({
            'role': role,
            'content': content,
            'timestamp': timezone.now().isoformat(),
        })
        # Cap the stored messages — oldest get trimmed
        if len(self.messages) > MAX_MESSAGES:
            self.messages = self.messages[-MAX_MESSAGES:]
        self.message_count = len(self.messages)
        self.save(update_fields=['messages', 'message_count', 'updated_at'])

    def get_messages_for_context(self, limit: int = 10) -> list:
        """
        Get recent messages formatted for AI context.
        Default limit reduced to 10 (was 20) — the 1B model has limited context,
        and pre-show chats are short so 10 exchanges is more than enough.
        """
        msgs = self.messages[-limit:] if self.messages else []
        return [{
            'role': m['role'],
            'content': m['content'],
        } for m in msgs]

    def get_summary_for_context(self) -> str:
        """
        Get the auto_summary if available, otherwise fall back to guest_notes.
        This is what gets injected into the agent's prompt for cross-session memory.
        """
        if self.auto_summary:
            return self.auto_summary
        if self.guest_notes:
            return self.guest_notes
        # Fallback: create a minimal summary from the last 3 messages
        recent = self.get_messages_for_context(limit=3)
        if recent:
            summary_parts = [f"{m['role']}: {m['content']}" for m in recent]
            return " | ".join(summary_parts)
        return ""
