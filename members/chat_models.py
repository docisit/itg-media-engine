"""
Site Chat Assistant — Models
=============================
FAQ-driven chat assistant for the homepage. Uses Ollama (1B model) for
semantic matching and answering. Lightweight — no RAG, no embeddings.

Key design principles:
1. FAQ-first: matched against stored Q&A before hitting Ollama
2. Session context: last 6 exchanges preserved in prompt
3. Edge case answering: model handles novel questions, adds to FAQ after admin review
4. Admin sets mood/tone/restrictions per SiteChatConfig
"""

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


class SiteChatConfig(models.Model):
    """
    Singleton config for the homepage chat assistant.
    Controls mood, tone, restrictions, and the system prompt.
    """
    mood_choices = [
        ('friendly', 'Friendly 🤗'),
        ('professional', 'Professional 🎙️'),
        ('enthusiastic', 'Enthusiastic ⚡'),
        ('calm', 'Calm 🧘'),
        ('coach', 'Coach 🏆'),
    ]
    tone_choices = [
        ('warm', 'Warm'),
        ('formal', 'Formal'),
        ('conversational', 'Conversational'),
        ('excited', 'Excited'),
    ]

    # ── Identity & Personality ──
    assistant_name = models.CharField(
        max_length=100, default="Lil' Dawg",
        help_text="Name of the chat assistant"
    )
    mood = models.CharField(
        max_length=20, choices=mood_choices, default='friendly',
        help_text="Overall mood/personality of the assistant"
    )
    tone = models.CharField(
        max_length=20, choices=tone_choices, default='conversational',
        help_text="Communication tone"
    )

    # ── System Prompt ──
    system_prompt = models.TextField(
        default=(
            "You are a helpful assistant for 'IN the GAME with DOC' — a sports broadcast platform. "
            "You answer questions about becoming a guest, watching live shows, joining as a parent, "
            "data security, privacy, and general use of the platform at yourdomain.com. "
            "Be concise (2-3 sentences). If you don't know, say so."
        ),
        help_text="Base system prompt for the Ollama model"
    )

    # ── Content Restriction ──
    restricted_topics = models.TextField(
        blank=True, default='',
        help_text="Comma-separated topics the assistant should NOT discuss (e.g. 'politics, religion, NSFW')"
    )
    max_tokens = models.IntegerField(
        default=150,
        help_text="Maximum tokens per response (keep low for 1B model)"
    )
    temperature = models.FloatField(
        default=0.7,
        help_text="Model temperature (0.0 = deterministic, 1.0 = creative)"
    )

    # ── Business Contact Info ──
    contact_email = models.EmailField(
        blank=True, default='',
        help_text="Business contact email shown to visitors (e.g. doc@yourdomain.com)"
    )
    contact_form_url = models.CharField(
        max_length=300, blank=True, default='',
        help_text="URL to the contact form page (e.g. /contact)"
    )
    video_submission_info = models.TextField(
        blank=True, default='',
        help_text="Instructions for guests on how/where to submit videos or media. "
                  "This is injected into the system prompt so the model can answer accurately."
    )
    business_hours = models.CharField(
        max_length=200, blank=True, default='',
        help_text="Optional: Business hours shown to visitors"
    )
    social_links = models.TextField(
        blank=True, default='',
        help_text="Optional: Comma-separated social media links (e.g. 'Twitter: https://twitter.com/doc, YouTube: https://youtube.com/@doc')"
    )

    # ── Rate Limiting (configurable from admin) ──
    rate_limit_per_minute = models.IntegerField(
        default=10,
        help_text="Max chat requests per IP per minute"
    )
    rate_limit_block_minutes = models.IntegerField(
        default=5,
        help_text="Minutes to block IP after exceeding limit"
    )

    # ── Matched FAQ Behavior ──
    prefer_faq_exact = models.BooleanField(
        default=True,
        help_text="If enabled, always serve exact FAQ matches (no model inference)"
    )

    # ── Metadata ──
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        verbose_name = "Chat Config"
        verbose_name_plural = "Chat Config"

    def save(self, *args, **kwargs):
        """Enforce singleton — only one active config."""
        if self.is_active:
            SiteChatConfig.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.assistant_name} ({self.get_mood_display()})"


class SiteChatFAQ(models.Model):
    """
    Frequently Asked Questions — stored Q&A pairs.
    When a user asks a question, we first try to match it against these FAQs
    before hitting Ollama. This keeps the 1B model load low and answers snappy.
    """
    question = models.CharField(
        max_length=500,
        unique=True,
        help_text="The question (used for matching)"
    )
    answer = models.TextField(
        help_text="The answer to display"
    )
    keywords = models.CharField(
        max_length=500, blank=True, default='',
        help_text="Comma-separated keywords for basic matching (e.g. 'guest, become guest, sign up')"
    )
    category = models.CharField(
        max_length=100, blank=True, default='',
        help_text="Category like 'Guest Info', 'Privacy', 'Technical', 'Parent', 'General'"
    )
    is_published = models.BooleanField(
        default=True,
        help_text="Unpublished FAQs won't appear in exact matches"
    )
    priority = models.IntegerField(
        default=0,
        help_text="Higher = shown first in FAQ list"
    )
    times_asked = models.IntegerField(
        default=0,
        help_text="How many times this FAQ has been matched"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"
        ordering = ['-priority', 'category', 'question']

    def __str__(self):
        return f"[{self.category}] {self.question[:60]}"

    def increment_asked(self):
        self.times_asked = models.F('times_asked') + 1
        self.save(update_fields=['times_asked'])


class SiteChatSession(models.Model):
    """
    A chat session. Preserves conversation across page refreshes.
    Stored in localStorage primarily, but DB copy survives for analytics.
    """
    session_id = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    messages = models.JSONField(
        default=list,
        help_text="List of {role, content} messages"
    )
    message_count = models.IntegerField(default=0)
    user_agent = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Chat Session"
        verbose_name_plural = "Chat Sessions"
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat {self.session_id[:12]}... ({self.message_count} msgs)"


class SiteChatUnanswered(models.Model):
    """
    Tracks questions the model couldn't answer well.
    Admin reviews these and can promote them to FAQs.
    Low overhead — just text storage.
    """
    question = models.TextField(
        help_text="The unanswered question"
    )
    answer_given = models.TextField(
        blank=True, default='',
        help_text="What the model answered (if anything)"
    )
    session = models.ForeignKey(
        SiteChatSession, on_delete=models.SET_NULL, null=True, blank=True
    )
    asked_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Unanswered Question"
        verbose_name_plural = "Unanswered Questions"
        ordering = ['-asked_at']

    def __str__(self):
        return self.question[:80]
