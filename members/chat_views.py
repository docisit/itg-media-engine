"""
Site Chat — API Views
=====================
FAQ-driven homepage chat assistant. Ollama-backed with FAQ-first matching.
Lightweight — no RAG, no embeddings.

Endpoints:
  GET  /api/site-chat/config/        → Get active config + published FAQs
  POST /api/site-chat/ask/           → Ask a question (FAQ match first, then Ollama)
  POST /api/site-chat/session/       → Create/update a session
  GET  /api/site-chat/session/<id>/  → Get session history
  POST /api/site-chat/unanswered/    → Flag an unanswered question

Admin:
  GET  /api/admin/site-chat/config/                  → Get/Set config
  GET/POST /api/admin/site-chat/faqs/                → List/Create FAQs
  PUT/DELETE /api/admin/site-chat/faqs/<id>/         → Update/Delete FAQ
  GET  /api/admin/site-chat/unanswered/              → List unanswered
  POST /api/admin/site-chat/unanswered/<id>/promote/ → Promote to FAQ
"""

import json
import secrets
import logging
import requests
from urllib.parse import urljoin

from django.utils import timezone
from django.db.models import Q
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser

from .chat_models import SiteChatConfig, SiteChatFAQ, SiteChatSession, SiteChatUnanswered

logger = logging.getLogger(__name__)

OLLAMA_URL = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = getattr(settings, 'SITE_CHAT_MODEL', 'llama3.2:1b')


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_active_config() -> SiteChatConfig:
    """Get the active config, returning defaults if none exists."""
    config = SiteChatConfig.objects.filter(is_active=True).first()
    if not config:
        config = SiteChatConfig.objects.create(
            assistant_name="Lil' Dawg",
            system_prompt=(
                "You are a helpful assistant for 'IN the GAME with DOC' — a sports broadcast platform. "
                "You answer questions about becoming a guest, watching live shows, joining as a parent, "
                "data security, privacy, and general use of the platform. Be concise (2-3 sentences)."
            ),
        )
    return config


def _build_mood_instruction(config: SiteChatConfig) -> str:
    """Build a mood/tone instruction string from config."""
    mood_map = {
        'friendly': 'Be warm and approachable like a friendly host.',
        'professional': 'Be polished and professional like a broadcast producer.',
        'enthusiastic': 'Be high-energy and excited about sports and broadcasting!',
        'calm': 'Be calm and reassuring, like a trusted guide.',
        'coach': 'Be direct and encouraging, like a sports coach.',
    }
    tone_map = {
        'warm': 'Use warm, inviting language.',
        'formal': 'Use proper, formal language.',
        'conversational': 'Speak naturally and conversationally.',
        'excited': 'Use exclamation points and show enthusiasm!',
    }
    mood_str = mood_map.get(config.mood, 'Be friendly and helpful.')
    tone_str = tone_map.get(config.tone, 'Speak naturally.')
    return f"{mood_str} {tone_str}"


def _build_business_info(config: SiteChatConfig) -> str:
    """Build business contact info block from config fields."""
    parts = []
    if config.contact_email:
        parts.append(f"Contact email: {config.contact_email}")
    if config.contact_form_url:
        parts.append(f"Contact form: {config.contact_form_url}")
    if config.video_submission_info:
        parts.append(f"Video/media submission instructions: {config.video_submission_info}")
    if config.business_hours:
        parts.append(f"Business hours: {config.business_hours}")
    if config.social_links:
        parts.append(f"Social media: {config.social_links}")
    if parts:
        return "Here is the business contact information you can share:\n" + "\n".join(parts)
    return ""


def _build_restriction_instruction(config: SiteChatConfig) -> str:
    """Build restriction instruction from config."""
    if config.restricted_topics:
        topics = [t.strip() for t in config.restricted_topics.split(',') if t.strip()]
        if topics:
            return f"ABSOLUTELY DO NOT discuss: {', '.join(topics)}. If asked, politely say you can't discuss that."
    return ""


def _match_faq(question: str, config: SiteChatConfig) -> SiteChatFAQ | None:
    """
    Match a question against published FAQs.
    Uses: exact match, keywords match, substring match.
    Returns the best match or None.
    """
    q_lower = question.lower().strip()
    faqs = SiteChatFAQ.objects.filter(is_published=True)

    # 1. Exact match
    exact = faqs.filter(question__iexact=q_lower).first()
    if exact:
        exact.increment_asked()
        return exact

    # 2. Keyword match — check if any keyword from the question appears in FAQ keywords
    for faq in faqs:
        if faq.keywords:
            keywords = [k.strip().lower() for k in faq.keywords.split(',')]
            if any(kw in q_lower for kw in keywords) or any(kw == q_lower for kw in keywords):
                faq.increment_asked()
                return faq

    # 3. Substring match — FAQ question appears in the user's question or vice versa
    for faq in faqs:
        faq_q = faq.question.lower()
        if faq_q in q_lower or q_lower in faq_q:
            faq.increment_asked()
            return faq

    return None


def _ask_ollama(messages: list[dict], config: SiteChatConfig) -> str | None:
    """
    Send messages to Ollama for a response.
    Returns the text response or None on failure.
    """
    try:
        resp = requests.post(
            urljoin(OLLAMA_URL, '/api/chat'),
            json={
                'model': OLLAMA_MODEL,
                'messages': messages,
                'stream': False,
                'temperature': config.temperature,
                'max_tokens': config.max_tokens,
            },
            timeout=120,
        )
        if resp.status_code == 200:
            result = resp.json()
            return result.get('message', {}).get('content', '').strip()
        logger.error(f"Ollama error {resp.status_code}: {resp.text}")
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot reach Ollama at {OLLAMA_URL}")
    except Exception as e:
        logger.error(f"Ollama request failed: {e}")
    return None


# ── Public Views ─────────────────────────────────────────────────────────

class SiteChatConfigView(APIView):
    """
    GET /api/site-chat/config/
    Returns: active config + published FAQs for the frontend.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        config = _get_active_config()
        faqs = SiteChatFAQ.objects.filter(is_published=True).order_by('-priority', 'category')

        return Response({
            'assistantName': config.assistant_name,
            'mood': config.mood,
            'tone': config.tone,
            'moodLabel': config.get_mood_display(),
            'toneLabel': config.get_tone_display(),
            'preferFaqExact': config.prefer_faq_exact,
            'faqs': [{
                'id': f.id,
                'question': f.question,
                'answer': f.answer,
                'category': f.category,
                'keywords': f.keywords,
            } for f in faqs],
        })


class SiteChatAskView(APIView):
    """
    POST /api/site-chat/ask/
    Body: { "question": "...", "sessionId": "..." }
    Returns: { "answer": "...", "matchedFaq": bool, "source": "faq|model" }

    FAQ-first: If matched, serves the FAQ answer directly (no model hit).
    Otherwise, asks Ollama with context from config + last 6 exchanges.
    """
    permission_classes = [AllowAny]
    
    def check_rate_limit(self, request) -> bool:
        """Check if the IP has exceeded the rate limit (configurable from admin)."""
        from django.core.cache import cache
        
        config = _get_active_config()
        limit = config.rate_limit_per_minute
        block_seconds = config.rate_limit_block_minutes * 60
        
        ip = request.META.get('REMOTE_ADDR')
        if not ip:
            return True
        
        key = f'chat_rate_{ip}'
        count = cache.get(key, 0)
        
        if count >= limit:
            return False
        
        cache.set(key, count + 1, block_seconds)
        return True

    def post(self, request):
        question = request.data.get('question', '').strip()
        session_id = request.data.get('sessionId', '').strip()

        if not question:
            return Response({'error': 'Question is required'}, status=400)

        # ── RATE LIMIT CHECK ──
        if not self.check_rate_limit(request):
            return Response({
                'error': 'Too many requests. Please wait a moment and try again.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        config = _get_active_config()

        # ── 1. FAQ Match ──
        matched_faq = _match_faq(question, config)
        if matched_faq:
            return Response({
                'answer': matched_faq.answer,
                'matchedFaq': True,
                'source': 'faq',
                'faqId': matched_faq.id,
                'faqQuestion': matched_faq.question,
            })

        # ── 2. Build System Prompt from config ──
        mood = _build_mood_instruction(config)
        restrictions = _build_restriction_instruction(config)
        business_info = _build_business_info(config)

        system_parts = [config.system_prompt, mood]
        if business_info:
            system_parts.append(business_info)
        if restrictions:
            system_parts.append(restrictions)

        # Add FAQ context for model to reference
        faqs = SiteChatFAQ.objects.filter(is_published=True).order_by('-priority')[:10]
        if faqs:
            faq_context = "\n".join([
                f"Q: {f.question}\nA: {f.answer}" for f in faqs
            ])
            system_parts.append(
                f"\nHere are some frequently asked questions and answers you can reference:\n{faq_context}"
            )

        messages = [{'role': 'system', 'content': "\n".join(system_parts)}]

        # ── 3. Add Session Context (last 6 exchanges) ──
        if session_id:
            try:
                session = SiteChatSession.objects.get(session_id=session_id)
                recent = session.messages[-6:] if session.messages else []
                for msg in recent:
                    if msg.get('role') in ('user', 'assistant') and msg.get('content'):
                        messages.append({
                            'role': msg['role'],
                            'content': msg['content'],
                        })
            except SiteChatSession.DoesNotExist:
                pass

        # Add the current question
        messages.append({'role': 'user', 'content': question})

        # ── 4. Ask Ollama ──
        answer = _ask_ollama(messages, config)

        if answer:
            # Track unanswered for admin review
            SiteChatUnanswered.objects.create(
                question=question,
                answer_given=answer[:500],
            )
            return Response({
                'answer': answer,
                'matchedFaq': False,
                'source': 'model',
            })

        # ── 5. Fallback ──
        return Response({
            'answer': (
                f"I'm sorry, I'm having trouble connecting to my brain right now. "
                f"Please check out our FAQ or reach out via the Contact page!"
            ),
            'matchedFaq': False,
            'source': 'fallback',
        })


class SiteChatSessionView(APIView):
    """
    POST /api/site-chat/session/  → Create or update session
    GET /api/site-chat/session/<id>/  → Get session
    """
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        try:
            session = SiteChatSession.objects.get(session_id=session_id)
            return Response({
                'sessionId': session.session_id,
                'messageCount': session.message_count,
                'messages': session.messages,
            })
        except SiteChatSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)

    def post(self, request):
        session_id = request.data.get('sessionId', '').strip() or f"chat_{secrets.token_hex(12)}"
        messages = request.data.get('messages', [])
        user_agent = request.data.get('userAgent', '')

        session, created = SiteChatSession.objects.get_or_create(
            session_id=session_id,
            defaults={'messages': messages, 'message_count': len(messages), 'user_agent': user_agent},
        )

        if not created:
            session.messages = messages
            session.message_count = len(messages)
            session.save(update_fields=['messages', 'message_count', 'updated_at'])

        return Response({
            'sessionId': session.session_id,
            'messageCount': session.message_count,
            'created': created,
        })


class SiteChatHealthView(APIView):
    """
    GET /api/site-chat/health/
    Quick health check — verifies Ollama is reachable.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        ollama_ok = False
        try:
            resp = requests.get(urljoin(OLLAMA_URL, '/api/tags'), timeout=5)
            ollama_ok = resp.status_code == 200
            models = [m['name'] for m in resp.json().get('models', [])] if ollama_ok else []
        except Exception:
            models = []

        config = _get_active_config()
        return Response({
            'ollama': ollama_ok,
            'models': models,
            'config': config.assistant_name if config else None,
            'faqCount': SiteChatFAQ.objects.filter(is_published=True).count(),
        })


# ── Admin Views ──────────────────────────────────────────────────────────

class AdminSiteChatConfigView(APIView):
    """GET/PUT the active chat config."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        config = _get_active_config()
        return Response({
            'id': config.id,
            'assistantName': config.assistant_name,
            'mood': config.mood,
            'tone': config.tone,
            'systemPrompt': config.system_prompt,
            'restrictedTopics': config.restricted_topics,
            'maxTokens': config.max_tokens,
            'temperature': config.temperature,
            'preferFaqExact': config.prefer_faq_exact,
            'contactEmail': config.contact_email,
            'contactFormUrl': config.contact_form_url,
            'videoSubmissionInfo': config.video_submission_info,
            'businessHours': config.business_hours,
            'socialLinks': config.social_links,
            'rateLimitPerMinute': config.rate_limit_per_minute,
            'rateLimitBlockMinutes': config.rate_limit_block_minutes,
            'isActive': config.is_active,
            'updatedAt': config.updated_at.isoformat(),
        })

    def put(self, request):
        config = _get_active_config()
        data = request.data

        config.assistant_name = data.get('assistantName', config.assistant_name)
        config.mood = data.get('mood', config.mood)
        config.tone = data.get('tone', config.tone)
        config.system_prompt = data.get('systemPrompt', config.system_prompt)
        config.restricted_topics = data.get('restrictedTopics', config.restricted_topics)
        config.max_tokens = int(data.get('maxTokens', config.max_tokens))
        config.temperature = float(data.get('temperature', config.temperature))
        config.prefer_faq_exact = data.get('preferFaqExact', config.prefer_faq_exact)
        config.contact_email = data.get('contactEmail', config.contact_email)
        config.contact_form_url = data.get('contactFormUrl', config.contact_form_url)
        config.video_submission_info = data.get('videoSubmissionInfo', config.video_submission_info)
        config.business_hours = data.get('businessHours', config.business_hours)
        config.social_links = data.get('socialLinks', config.social_links)
        config.rate_limit_per_minute = int(data.get('rateLimitPerMinute', config.rate_limit_per_minute))
        config.rate_limit_block_minutes = int(data.get('rateLimitBlockMinutes', config.rate_limit_block_minutes))
        config.updated_by = request.user
        config.save()

        return Response({'status': 'ok'})


class AdminSiteChatFAQListView(APIView):
    """GET/POST FAQs for the admin panel."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        faqs = SiteChatFAQ.objects.all().order_by('-priority', 'category', 'question')
        return Response([{
            'id': f.id,
            'question': f.question,
            'answer': f.answer,
            'keywords': f.keywords,
            'category': f.category,
            'isPublished': f.is_published,
            'priority': f.priority,
            'timesAsked': f.times_asked,
            'createdAt': f.created_at.isoformat(),
        } for f in faqs])

    def post(self, request):
        data = request.data
        faq = SiteChatFAQ.objects.create(
            question=data.get('question', '').strip(),
            answer=data.get('answer', '').strip(),
            keywords=data.get('keywords', ''),
            category=data.get('category', ''),
            is_published=data.get('isPublished', True),
            priority=int(data.get('priority', 0)),
        )
        return Response({'id': faq.id, 'status': 'created'}, status=201)


class AdminSiteChatFAQDetailView(APIView):
    """PUT/DELETE an FAQ."""
    permission_classes = [IsAdminUser]

    def put(self, request, faq_id):
        data = request.data
        try:
            faq = SiteChatFAQ.objects.get(id=faq_id)
        except SiteChatFAQ.DoesNotExist:
            return Response({'error': 'FAQ not found'}, status=404)

        faq.question = data.get('question', faq.question)
        faq.answer = data.get('answer', faq.answer)
        faq.keywords = data.get('keywords', faq.keywords)
        faq.category = data.get('category', faq.category)
        faq.is_published = data.get('isPublished', faq.is_published)
        faq.priority = int(data.get('priority', faq.priority))
        faq.save()

        return Response({'status': 'updated'})

    def delete(self, request, faq_id):
        try:
            faq = SiteChatFAQ.objects.get(id=faq_id)
            faq.delete()
            return Response({'status': 'deleted'})
        except SiteChatFAQ.DoesNotExist:
            return Response({'error': 'FAQ not found'}, status=404)


class AdminSiteChatUnansweredView(APIView):
    """GET unanswered questions. POST to promote one to FAQ."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        items = SiteChatUnanswered.objects.filter(reviewed=False).order_by('-asked_at')[:50]
        return Response([{
            'id': u.id,
            'question': u.question,
            'answerGiven': u.answer_given,
            'askedAt': u.asked_at.isoformat(),
        } for u in items])

    def post(self, request, unanswered_id):
        """Promote an unanswered question to FAQ."""
        try:
            uq = SiteChatUnanswered.objects.get(id=unanswered_id)
        except SiteChatUnanswered.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        data = request.data
        answer = data.get('answer', uq.answer_given or '').strip()
        if not answer:
            return Response({'error': 'Answer is required to promote to FAQ'}, status=400)

        # Create FAQ from unanswered question
        SiteChatFAQ.objects.create(
            question=data.get('question', uq.question).strip(),
            answer=answer,
            keywords=data.get('keywords', ''),
            category=data.get('category', 'General'),
            is_published=True,
        )
        uq.reviewed = True
        uq.save(update_fields=['reviewed'])

        return Response({'status': 'promoted'}, status=201)
