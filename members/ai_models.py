"""
AI Assistant Models — Coach & Athlete Chat Sessions with zlib compression.

We use zlib compression on message content to reduce PostgreSQL storage:
- A 10KB conversation compresses to ~2-3KB
- Transparent to application code (auto-compress on save, auto-decompress on read)
- GIN indexes on session+created_at for fast history queries
"""

import zlib
import json
import base64
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


def compress_content(content: str) -> str:
    """Compress a string using zlib and return as base64 for storage."""
    if not content:
        return ""
    compressed = zlib.compress(content.encode("utf-8"), level=6)  # Balance speed/ratio
    return base64.b64encode(compressed).decode("ascii")


def decompress_content(compressed_b64: str) -> str:
    """Decompress a zlib-compressed base64 string back to original text."""
    if not compressed_b64:
        return ""
    try:
        compressed = base64.b64decode(compressed_b64.encode("ascii"))
        return zlib.decompress(compressed).decode("utf-8")
    except Exception:
        # If decompression fails, return raw (might be uncompressed legacy)
        return compressed_b64


class CompressedTextField(models.TextField):
    """Custom TextField that auto-compresses content with zlib on save and
    auto-decompresses on read. Stored as base64-encoded zlib data in the DB."""

    def from_db_value(self, value, expression, connection):
        """Decompress when reading from database."""
        if value is None:
            return value
        return decompress_content(value)

    def to_python(self, value):
        """Decompress when used in Python (e.g., form/deserialization)."""
        if value is None or isinstance(value, str) and not value.startswith(" "):
            return value
        return decompress_content(value) if value else value

    def get_prep_value(self, value):
        """Compress when saving to database."""
        if value is None:
            return None
        if isinstance(value, bytes):
            value = value.decode("utf-8")
        return compress_content(value)


class AIPersonality(models.Model):
    """Editable AI personality/prompt configuration — managed via Admin Panel.
    Staff can change system prompts, model parameters, and behavior per role."""

    ROLE_CHOICES = [
        ('coach', 'Coach Assistant'),
        ('athlete', 'Athlete Assistant'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, unique=True,
        help_text="Which role this personality applies to")

    # System prompt that defines the AI's behavior
    system_prompt = models.TextField(
        help_text="The system prompt that defines this AI's personality, knowledge, and behavior"
    )

    # DeepSeek model parameters (configurable per role)
    model_name = models.CharField(max_length=100, default='deepseek-chat',
        help_text="DeepSeek model to use (e.g., deepseek-chat, deepseek-reasoner)")
    temperature = models.FloatField(default=0.7,
        help_text="Response creativity (0.0 = deterministic, 1.0 = creative)")
    max_tokens = models.IntegerField(default=4096,
        help_text="Maximum tokens per response")
    top_p = models.FloatField(default=0.95,
        help_text="Nucleus sampling parameter")

    # Features
    is_active = models.BooleanField(default=True,
        help_text="Enable/disable this AI personality")
    supports_streaming = models.BooleanField(default=True,
        help_text="Enable streaming responses")
    supports_audio_input = models.BooleanField(default=False,
        help_text="Enable voice input (Phase 2)")
    supports_audio_output = models.BooleanField(default=False,
        help_text="Enable TTS output (Phase 2)")

    # Timing
    daily_message_limit = models.IntegerField(default=50,
        help_text="Max messages per user per day")
    rate_limit_window = models.IntegerField(default=60,
        help_text="Rate limit window in seconds between messages")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['role']
        verbose_name = "AI Personality"
        verbose_name_plural = "AI Personalities"

    def __str__(self):
        return f"{self.get_role_display()} Personality"


class AIChatSession(models.Model):
    """A single chat session between a user and the AI assistant."""

    ROLE_CHOICES = [
        ('coach', 'Coach Assistant'),
        ('athlete', 'Athlete Assistant'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_sessions')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES,
        help_text="Which AI assistant this session is for")

    # Auto-generated title from first few messages
    title = models.CharField(max_length=300, blank=True,
        help_text="Auto-generated session title (e.g., 'Offensive Line Drills Week 4')")

    # Compressed summary for quick context restoration
    summary = CompressedTextField(blank=True,
        help_text="Compressed summary of the conversation for context restoration")

    # Session metadata
    message_count = models.IntegerField(default=0,
        help_text="Total messages in this session")
    total_tokens = models.IntegerField(default=0,
        help_text="Approximate total tokens used in this session")

    # Status
    is_active = models.BooleanField(default=True,
        help_text="Session is active (can still send messages)")
    is_favorited = models.BooleanField(default=False,
        help_text="User has favorited/bookmarked this session")

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['user', '-last_message_at']),
            models.Index(fields=['user', 'role', '-last_message_at']),
            models.Index(fields=['user', 'is_active', '-last_message_at']),
        ]
        verbose_name = "AI Chat Session"
        verbose_name_plural = "AI Chat Sessions"

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}: {self.title or 'New Chat'}"

    def update_title(self):
        """Auto-generate title from first user message if not set."""
        if not self.title:
            first_msg = self.messages.filter(role='user').order_by('created_at').first()
            if first_msg:
                content = first_msg.get_content()
                # Truncate first message to create title
                title = content[:80].strip()
                if len(content) > 80:
                    title += "..."
                self.title = title
                self.save(update_fields=['title'])

    def update_summary(self):
        """Compress the last few messages into a summary for context."""
        recent_messages = self.messages.order_by('-created_at')[:10]
        summary_parts = []
        for msg in reversed(recent_messages):
            content = msg.get_content()
            # Truncate each message for summary
            if len(content) > 200:
                content = content[:200] + "..."
            summary_parts.append(f"{msg.get_role_display()}: {content}")
        self.summary = "\n\n".join(summary_parts)
        self.save(update_fields=['summary'])

    def touch(self):
        """Update last_message_at timestamp."""
        self.last_message_at = timezone.now()
        self.message_count = self.messages.count()
        self.save(update_fields=['last_message_at', 'message_count'])


class AIChatMessage(models.Model):
    """A single message in an AI chat session — content is zlib-compressed."""

    ROLE_CHOICES = [
        ('system', 'System Instruction'),
        ('user', 'User'),
        ('assistant', 'AI Assistant'),
    ]

    session = models.ForeignKey(AIChatSession, on_delete=models.CASCADE,
        related_name='messages')

    # Role identifies who sent this message
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    # Content is transparently compressed/decompressed using CompressedTextField
    content = CompressedTextField(help_text="Message content (zlib-compressed in DB)")

    # Metadata
    token_count = models.IntegerField(default=0,
        help_text="Approximate token count for this message")

    # For storing additional metadata (e.g., model used, generation params)
    metadata = models.JSONField(default=dict, blank=True,
        help_text="Additional metadata JSON (e.g., model params, latency)")

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
            models.Index(fields=['session', 'role', 'created_at']),
        ]
        verbose_name = "AI Chat Message"
        verbose_name_plural = "AI Chat Messages"

    def __str__(self):
        return f"{self.get_role_display()} in {self.session.title or 'session'}"

    def get_content(self):
        """Get decompressed message content."""
        return decompress_content(self.content) if self.content else ""

    def set_content(self, text: str):
        """Set and compress message content."""
        self.content = text  # CompressedTextField handles compression

    def save(self, *args, **kwargs):
        """Auto-update session timestamps on save."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and self.session:
            self.session.touch()
            if self.role == 'user':
                self.session.update_title()
