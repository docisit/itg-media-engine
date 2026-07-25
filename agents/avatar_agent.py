"""
LiveKit Avatar Agent — Pure Text Data-Channel Worker
=====================================================
NO audio processing. NO onnxruntime. NO Silero VAD. NO Whisper STT.
This avoids the SIGILL crash (exit code -4) on the Xeon E5-2670.

Flow:
1. Guest uses browser webkitSpeechRecognition → text
2. Frontend sends text via LiveKit data channel ("coach_chat")
3. This agent receives text → calls Ollama LLM → sends response back
4. Frontend uses browser speechSynthesis to speak the response

Cross-session memory in PostgreSQL via Django backend.
"""

import os
import sys
import json
import asyncio
import logging
import multiprocessing
from pathlib import Path

# Force spawn start method — fixes forkserver EOF crash under Python 3.12 + PM2
try:
    multiprocessing.set_start_method("spawn", force=True)
except RuntimeError:
    pass

sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
os.environ.setdefault("DJANGO_ENV", "production")

import django
django.setup()

from django.conf import settings
from livekit.agents import JobContext, WorkerOptions, cli
import aiohttp

logger = logging.getLogger("avatar-agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ── Configuration ────────────────────────────────────────────────────────

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
API_SECRET = getattr(settings, "INTERNAL_API_SECRET", "")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:1b")

# ── Backend API helpers ─────────────────────────────────────────────────

async def _backend_get(session: aiohttp.ClientSession, path: str, params: dict = None) -> dict:
    try:
        headers = {"Authorization": f"Bearer {API_SECRET}"}
        async with session.get(
            f"{BACKEND_URL}{path}", params=params or {}, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            return await resp.json() if resp.status == 200 else {}
    except Exception as e:
        logger.warning(f"GET {path} failed: {e}")
        return {}

async def _backend_post(session: aiohttp.ClientSession, path: str, data: dict = None):
    try:
        headers = {"Authorization": f"Bearer {API_SECRET}"}
        async with session.post(
            f"{BACKEND_URL}{path}", json=data or {}, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            pass
    except Exception as e:
        logger.warning(f"POST {path} failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. ENTRYPOINT — pure text data-channel worker
# ═══════════════════════════════════════════════════════════════════════════

async def entrypoint_fnc(ctx: JobContext):
    logger.info(f"Avatar agent connecting to: {ctx.room.name}")
    await ctx.connect()
    logger.info("Avatar agent connected as data-only participant")

    # ── Parse dispatch metadata ──
    session_id = ""
    guest_name = "Guest"
    guest_email = ""
    show_id = None
    prompt_data = None

    dispatch_meta_str = getattr(ctx.job, 'metadata', '')
    if dispatch_meta_str:
        try:
            dispatch_meta = json.loads(dispatch_meta_str)
            guest_name = dispatch_meta.get("guestName", guest_name)
            guest_email = dispatch_meta.get("guestEmail", guest_email)
            session_id = dispatch_meta.get("sessionId", session_id)
            show_id = dispatch_meta.get("showId", show_id)
            logger.info(f"Dispatch metadata: {guest_name} / {guest_email} / session={session_id}")
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Cannot parse dispatch metadata: {e}")

    # ── Wait for guest ──
    logger.info("Waiting for guest to join...")
    participant = await ctx.wait_for_participant()
    logger.info(f"Guest joined: {participant.name} ({participant.identity})")

    # Fallback to participant attributes
    if not dispatch_meta_str or not session_id:
        guest_name = participant.name or guest_name
        attrs = participant.attributes or {}
        session_id = attrs.get("sessionId", ctx.room.name.replace("avatar_", ""))
        guest_email = attrs.get("guestEmail", guest_email)
        try:
            show_id = int(attrs["showId"]) if attrs.get("showId") else show_id
        except ValueError:
            pass

    # ── HTTP session for Ollama + backend calls ──
    http_session = aiohttp.ClientSession()

    try:
        # Fetch conversation + prompt data from backend
        if session_id:
            conv = await _backend_get(http_session, "/api/avatar/conversation/", {"sessionId": session_id})
            if conv.get("prompt"):
                prompt_data = conv["prompt"]

        # Build system prompt
        system_prompt = _build_system_prompt(
            guest_name=guest_name,
            guest_email=guest_email,
            prompt_data=prompt_data,
            http_session=http_session,
        )

        conversation_messages = [{"role": "system", "content": system_prompt}]

        # Send welcome
        welcome = (
            (prompt_data or {}).get("welcomeMessage")
            or f"Hey {guest_name}! I'm Lil' Dawg. Let's get you ready for the broadcast!"
        )
        await _send_data(ctx, {"type": "message", "content": welcome})
        conversation_messages.append({"role": "assistant", "content": welcome})
        logger.info(f"Sent welcome to {guest_name}")

        # ── Listen for data channel messages ──
        @ctx.room.on("data_received")
        def on_data_received(payload):
            try:
                data = json.loads(payload.data) if isinstance(payload.data, (str, bytes)) else payload
                if isinstance(data, bytes):
                    data = json.loads(data.decode("utf-8"))
                msg_type = data.get("type", "")

                if msg_type == "coach_chat":
                    user_text = data.get("text", "").strip()
                    if not user_text:
                        return
                    logger.info(f"Received from {guest_name}: {user_text[:60]}...")
                    conversation_messages.append({"role": "user", "content": user_text})
                    asyncio.ensure_future(_handle_message(
                        ctx=ctx,
                        http_session=http_session,
                        messages=conversation_messages,
                        prompt_data=prompt_data,
                        session_id=session_id,
                        guest_name=guest_name,
                    ))

                elif msg_type == "ready":
                    logger.info(f"{guest_name} is ready!")
                    asyncio.ensure_future(_send_data(ctx, {
                        "type": "ready",
                        "content": "Great! Let's get you to the broadcast room.",
                    }))

            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Data parse error: {e}")

        logger.info(f"Avatar active for {guest_name} in {ctx.room.name}")

        # Keep alive
        await asyncio.sleep(3600)

    except asyncio.CancelledError:
        pass
    finally:
        # End session — generate summary and save
        await _end_session(
            http_session=http_session,
            session_id=session_id,
            conversation_messages=conversation_messages,
            guest_name=guest_name,
        )
        await http_session.close()

    logger.info(f"Avatar session ended for {guest_name}")


# ═══════════════════════════════════════════════════════════════════════════
# 2. HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def _build_system_prompt(
    guest_name: str,
    guest_email: str = "",
    prompt_data: dict = None,
    http_session: aiohttp.ClientSession = None,
) -> str:
    """Build the system prompt with guest info, custom prompts, and past memory."""
    pd = prompt_data or {}
    lines = []

    custom_prompt = pd.get("systemPrompt", "")
    if custom_prompt:
        lines.append(custom_prompt)
    else:
        lines.append(
            "You are Lil' Dawg, a friendly, enthusiastic pre-show assistant "
            f"for the Don O'Connor Show. Your job is to welcome {guest_name}, "
            "make them feel comfortable, and prepare them for the broadcast."
        )
        lines.append(f"\nGuest name: {guest_name}")

    guest_info = pd.get("guestInfo", "")
    if guest_info:
        lines.append(f"\nAbout this guest:\n{guest_info}")

    lines.append(
        "\nBe concise (2-3 sentences), friendly, and encouraging. "
        "Remind them to use headphones and have a stable connection. "
        "When they say they're ready, tell them to proceed."
    )
    return "\n".join(lines)


async def _send_data(ctx: JobContext, data: dict):
    """Send a JSON message to all participants via data channel."""
    try:
        encoded = json.dumps(data).encode("utf-8")
        await ctx.room.local_participant.publish_data(
            encoded,
            topic="avatar_responses",
        )
    except Exception as e:
        logger.warning(f"Failed to send data: {e}")


async def _ollama_chat(
    http_session: aiohttp.ClientSession,
    messages: list[dict],
    model: str = OLLAMA_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 256,
) -> str:
    """Call Ollama's /api/chat endpoint async."""
    try:
        async with http_session.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                logger.error(f"Ollama error {resp.status}: {error_text}")
                return ""
            result = await resp.json()
            return result.get("message", {}).get("content", "")
    except Exception as e:
        logger.error(f"Ollama request failed: {e}")
        return ""


async def _handle_message(
    ctx: JobContext,
    http_session: aiohttp.ClientSession,
    messages: list[dict],
    prompt_data: dict,
    session_id: str,
    guest_name: str,
):
    """Generate an LLM response and send it via data channel."""
    pd = prompt_data or {}
    model = pd.get("modelName", OLLAMA_MODEL)
    temperature = float(pd.get("temperature", 0.7))
    max_tokens = int(pd.get("maxTokens", 256))

    # Send "speaking" indicator
    await _send_data(ctx, {"type": "speaking", "speaking": True})

    # Generate reply
    content = await _ollama_chat(
        http_session=http_session,
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if not content:
        content = "I didn't quite catch that. Could you say it again?"
    else:
        messages.append({"role": "assistant", "content": content})

    # Save to backend
    if session_id and content:
        await _backend_post(http_session, "/api/avatar/save-message/", {
            "sessionId": session_id,
            "role": "assistant",
            "content": content,
        })

    # Send response
    await _send_data(ctx, {"type": "message", "content": content})
    await _send_data(ctx, {"type": "speaking", "speaking": False})


async def _end_session(
    http_session: aiohttp.ClientSession,
    session_id: str,
    conversation_messages: list[dict],
    guest_name: str,
):
    """Generate summary and save to backend at session end."""
    # Generate summary from last 20 messages
    summary = ""
    if conversation_messages:
        summary_text = ""
        for m in conversation_messages[-20:]:
            role = m.get("role", "unknown")
            content = m.get("content", "")
            summary_text += f"{role}: {content}\n"

        if summary_text.strip():
            summary_prompt = (
                "Summarize the following pre-show chat conversation in 2-3 sentences. "
                "Focus on: who the guest is, what they discussed, their energy/mood, "
                "and any notable details the host should remember for next time.\n\n"
                + summary_text
            )
            summary = await _ollama_chat(
                http_session=http_session,
                messages=[{"role": "user", "content": summary_prompt}],
                model=OLLAMA_MODEL,
                temperature=0.3,
                max_tokens=256,
            )
            logger.info(f"Generated session summary ({len(summary)} chars)")

    await _backend_post(http_session, "/api/avatar/end-session/", {
        "sessionId": session_id,
        "autoSummary": summary,
    })
    logger.info(f"Session ended for {guest_name} (summary: {len(summary)} chars)")


# ═══════════════════════════════════════════════════════════════════════════
# 3. ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint_fnc,
        multiprocessing_context="spawn",
    ))
