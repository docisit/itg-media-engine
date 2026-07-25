"""
LiveKit Avatar Agent — FULL VOICE PIPELINE (for AVX2-capable CPUs)
==================================================================
⚠️  THIS FILE IS A BACKUP for when you upgrade to a CPU with AVX2 support.
   The Xeon E5-2670 lacks AVX2, so onnxruntime (Silero VAD, Whisper) crashes
   with SIGILL (exit code -4). On a modern CPU (Xeon Silver/Gold, AMD EPYC,
   or any consumer Intel 8th-gen+ / AMD Ryzen), this will work perfectly.

To use: copy this over avatar_agent.py, then:
  pm2 restart avatar-agent --update-env

Components:
- Ollama LLM      → http://localhost:11434  (llama3.2:1b)
- Silero VAD      → livekit.plugins.silero (voice activity detection)
- Whisper STT     → http://localhost:9000/asr (whisper-asr-webservice Docker)
- NoopTTS         → Browser SpeechSynthesis on client device
- VoicePipelineAgent → Full duplex voice conversation
"""

import os
import sys
import json
import struct
import socket
import base64
import asyncio
import logging
import multiprocessing
import uuid

# Force spawn start method — fixes fork/forkserver EOF crash under PM2 / Python 3.12
try:
    multiprocessing.set_start_method("spawn", force=True)
except RuntimeError:
    pass

import requests
from pathlib import Path
from typing import AsyncIterable, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
os.environ.setdefault("DJANGO_ENV", "production")

import django
django.setup()

from django.conf import settings
from livekit import agents as lk_agents
from livekit import rtc
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    inference,
    room_io,
    TurnHandlingOptions,
    llm as agent_llm,
    tts as agent_tts,
    stt as agent_stt,
    APIConnectOptions,
    VoicePipelineAgent,
)
from livekit.agents.llm import (
    ChatContext,
    ChatMessage,
    ChatRole,
    ChatChunk,
    ChoiceDelta,
    CompletionUsage,
    Tool,
)
from livekit.agents.tts import TTSCapabilities, SynthesizedAudio, ChunkedStream
from livekit.agents.stt import STT as AgentSTT, STTCapabilities, SpeechEvent, SpeechEventType, SpeechData
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, NOT_GIVEN
from livekit.plugins import silero

logger = logging.getLogger("avatar-agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
API_SECRET = getattr(settings, "INTERNAL_API_SECRET", "")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:1b")
WHISPER_URL = os.environ.get("WHISPER_URL", "http://localhost:9000/v1")

# Check backend
try:
    r = requests.get(f"{BACKEND_URL}/", timeout=5)
    logger.info(f"Backend reachable at {BACKEND_URL}: HTTP {r.status_code}")
except Exception as e:
    logger.warning(f"Backend at {BACKEND_URL} NOT reachable: {e}")


# ── Backend API helpers ─────────────────────────────────────────────────

def _backend_get(path: str, params: dict = None) -> dict:
    try:
        headers = {"Authorization": f"Bearer {API_SECRET}"}
        resp = requests.get(f"{BACKEND_URL}{path}", params=params or {}, headers=headers, timeout=10)
        return resp.json() if resp.status_code == 200 else {}
    except Exception as e:
        logger.warning(f"GET {path} failed: {e}")
        return {}


def _backend_post(path: str, data: dict = None):
    try:
        headers = {"Authorization": f"Bearer {API_SECRET}"}
        requests.post(f"{BACKEND_URL}{path}", json=data or {}, headers=headers, timeout=10)
    except Exception as e:
        logger.warning(f"POST {path} failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. CUSTOM OLLAMA LLM
# ═══════════════════════════════════════════════════════════════════════════

class OllamaLLMStream(agent_llm.LLMStream):
    """Streams Ollama chat responses chunk by chunk."""

    def __init__(self, llm: "OllamaLLM", *, chat_ctx: ChatContext, tools: list[Tool],
                 conn_options: APIConnectOptions, request_id: str, payload: dict):
        super().__init__(llm, chat_ctx=chat_ctx, tools=tools, conn_options=conn_options)
        self._ollama_llm = llm
        self._request_id = request_id
        self._payload = payload

    async def _run(self) -> None:
        try:
            resp = await asyncio.to_thread(
                requests.post,
                f"{self._ollama_llm._base_url}/api/chat",
                json=self._payload,
                timeout=60,
            )
            if resp.status_code != 200:
                logger.error(f"Ollama error {resp.status_code}: {resp.text}")
                return

            result = resp.json()
            content = result.get("message", {}).get("content", "")
            if content:
                self._event_ch.send_nowait(
                    ChatChunk(id=self._request_id, delta=ChoiceDelta(content=content, role="assistant"))
                )

            self._event_ch.send_nowait(
                ChatChunk(id=self._request_id, usage=CompletionUsage(
                    total_tokens=result.get("eval_count", 0),
                    prompt_tokens=result.get("prompt_eval_count", 0),
                    completion_tokens=result.get("eval_count", 0),
                ))
            )
        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot reach Ollama at {self._ollama_llm._base_url}")
        except Exception as e:
            logger.error(f"Ollama request failed: {e}")


class OllamaLLM(agent_llm.LLM):
    """LLM that calls Ollama's /api/chat endpoint."""

    def __init__(self, *, model: str = OLLAMA_MODEL, base_url: str = OLLAMA_URL,
                 temperature: float = 0.7, max_tokens: int = 256):
        super().__init__()
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._temperature = temperature
        self._max_tokens = max_tokens

    @property
    def model(self) -> str:
        return self._model

    @property
    def provider(self) -> str:
        return "ollama"

    def chat(self, *, chat_ctx: ChatContext, tools: list[Tool] | None = None,
             conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
             parallel_tool_calls=NOT_GIVEN, tool_choice=NOT_GIVEN, extra_kwargs=None):
        request_id = "ollama_" + os.urandom(4).hex()
        messages = []
        for msg in chat_ctx.messages:
            role = msg.role.value if hasattr(msg.role, "value") else str(msg.role)
            content = msg.text if hasattr(msg, "text") else (msg.content or "")
            if content:
                messages.append({"role": role, "content": content})
        extra = extra_kwargs or {}
        if extra.get("system"):
            messages.insert(0, {"role": "system", "content": extra["system"]})
        payload = {
            "model": self._model, "messages": messages, "stream": False,
            "temperature": self._temperature, "max_tokens": self._max_tokens,
        }
        return OllamaLLMStream(self, chat_ctx=chat_ctx, tools=tools or [],
                               conn_options=conn_options, request_id=request_id, payload=payload)


# ═══════════════════════════════════════════════════════════════════════════
# 2. NO-OP TTS (Browser SpeechSynthesis)
# ═══════════════════════════════════════════════════════════════════════════

class NoopTTSStream(ChunkedStream):
    def __init__(self, tts: "NoopTTS", text: str):
        super().__init__(tts=tts, input_text=text, conn_options=DEFAULT_API_CONNECT_OPTIONS)
        self._text = text

    async def _run(self):
        frame = rtc.AudioFrame(
            data=b"\x00\x00" * 240, sample_rate=24000, num_channels=1, samples_per_channel=240,
        )
        self._event_ch.send_nowait(SynthesizedAudio(
            frame=frame, request_id=str(uuid.uuid4()), is_final=True, delta_text=self._text,
        ))


class NoopTTS(agent_tts.TTS):
    def __init__(self):
        super().__init__(capabilities=TTSCapabilities(streaming=False), sample_rate=24000, num_channels=1)
        logger.info("NoopTTS initialized — browser SpeechSynthesis handles voice")

    def synthesize(self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS) -> ChunkedStream:
        return NoopTTSStream(self, text)


# ═══════════════════════════════════════════════════════════════════════════
# 3. LOCAL WHISPER STT
# ═══════════════════════════════════════════════════════════════════════════

class LocalWhisperSTT(AgentSTT):
    def __init__(self, *, base_url: str = WHISPER_URL, model: str = "whisper-1", language: str = "en"):
        super().__init__(capabilities=STTCapabilities(streaming=False, interim_results=False))
        self._base_url = base_url.replace("/v1", "").rstrip("/")
        self._model = model
        self._language = language
        logger.info(f"LocalWhisperSTT initialized: {self._base_url}/asr")

    async def _recognize_impl(self, buffer: "AudioBuffer", *, language: str | None = None,
                               conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS) -> SpeechEvent:
        try:
            data = rtc.combine_audio_frames(buffer).to_wav_bytes()
            resp = await asyncio.get_event_loop().run_in_executor(
                None, lambda: requests.post(
                    f"{self._base_url}/asr",
                    params={"task": "transcribe", "language": language or self._language,
                            "output": "json", "encode": True},
                    files={"audio_file": ("audio.wav", data, "audio/wav")},
                    timeout=30,
                ),
            )
            if resp.status_code != 200:
                logger.error(f"Whisper ASR error {resp.status_code}: {resp.text}")
                return SpeechEvent(type=SpeechEventType.FINAL_TRANSCRIPT,
                                   alternatives=[SpeechData(text="", language=None)])
            result = resp.json()
            text = result.get("text", "") if isinstance(result, dict) else str(result)
            return SpeechEvent(type=SpeechEventType.FINAL_TRANSCRIPT,
                               alternatives=[SpeechData(text=text, language=None)])
        except Exception as e:
            logger.warning(f"Whisper ASR failed: {e}")
            return SpeechEvent(type=SpeechEventType.FINAL_TRANSCRIPT,
                               alternatives=[SpeechData(text="", language=None)])


# ═══════════════════════════════════════════════════════════════════════════
# 4. PRE-SHOW AGENT
# ═══════════════════════════════════════════════════════════════════════════

class PreShowAgent(Agent):
    def __init__(self, session_id: str = "", guest_name: str = "Guest",
                 guest_email: str = "", show_id: int = None, prompt_data: dict = None):
        self._session_id = session_id
        self._guest_name = guest_name
        self._guest_email = guest_email
        self._show_id = show_id
        self._prompt_data = prompt_data or {}
        self._conversation_messages: list[dict] = []
        instructions = self._build_system_prompt()
        super().__init__(instructions=instructions)

    def on_enter(self):
        logger.info(f"PreShowAgent entered for {self._guest_name}")

    def on_leave(self):
        logger.info(f"PreShowAgent leaving for {self._guest_name}")

    async def on_llm_response(self, response: str):
        self.record_message("assistant", response)

    async def on_user_message(self, message: str):
        self.record_message("user", message)

    async def llm_node(self, ctx: ChatContext) -> ChatContext:
        system_prompt = self._build_system_prompt()
        ctx.messages.insert(0, ChatMessage(role=ChatRole.SYSTEM, text=system_prompt))
        return ctx

    def _build_system_prompt(self) -> str:
        pd = self._prompt_data
        lines = []
        custom_prompt = pd.get("systemPrompt", "")
        if custom_prompt:
            lines.append(custom_prompt)
        else:
            lines.append(
                "You are Lil' Dawg, a friendly, enthusiastic pre-show assistant "
                f"for the Don O'Connor Show. Your job is to welcome {self._guest_name}, "
                "make them feel comfortable, and prepare them for the broadcast."
            )
            lines.append(f"\nGuest name: {self._guest_name}")

        guest_info = pd.get("guestInfo", "")
        if guest_info:
            lines.append(f"\nAbout this guest:\n{guest_info}")

        past = _backend_get("/api/avatar/past-conversations/", {
            "guestEmail": self._guest_email, "guestName": self._guest_name,
        }) if self._guest_email or self._guest_name else {}

        past_list = past if isinstance(past, list) else past.get("conversations", [])
        if past_list:
            lines.append("\nThis guest has been on before. Summary of past conversations:")
            for conv in past_list[-3:]:
                summary = conv.get("summary", "")
                if summary:
                    lines.append(f"\n--- {conv['show']} ({conv['date']}) ---")
                    lines.append(summary)
                else:
                    notes = conv.get("guestNotes", "")
                    if notes:
                        lines.append(f"\n--- {conv['show']} ({conv['date']}) ---")
                        lines.append(notes)

        lines.append(
            "\nBe concise (2-3 sentences), friendly, and encouraging. "
            "Remind them to use headphones and have a stable connection. "
            "When they say they're ready, tell them to proceed."
        )
        return "\n".join(lines)

    def record_message(self, role: str, content: str):
        self._conversation_messages.append({"role": role, "content": content})

    async def generate_summary(self, ollama: OllamaLLM) -> str:
        if not self._conversation_messages:
            return ""
        summary_prompt = (
            "Summarize the following pre-show chat conversation in 2-3 sentences. "
            "Focus on: who the guest is, what they discussed, their energy/mood, "
            "and any notable details the host should remember for next time.\n\n"
        )
        for m in self._conversation_messages[-20:]:
            summary_prompt += f"{m['role']}: {m['content']}\n"
        try:
            resp = await asyncio.to_thread(
                requests.post,
                f"{OLLAMA_URL}/api/chat",
                json={"model": OLLAMA_MODEL, "messages": [{"role": "user", "content": summary_prompt}],
                      "stream": False, "temperature": 0.3, "max_tokens": 256},
                timeout=30,
            )
            if resp.status_code == 200:
                result = resp.json()
                summary = result.get("message", {}).get("content", "").strip()
                logger.info(f"Generated session summary ({len(summary)} chars)")
                return summary
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
        return ""


# ═══════════════════════════════════════════════════════════════════════════
# 5. ROOM SESSION — Full VoicePipelineAgent
# ═══════════════════════════════════════════════════════════════════════════

server = AgentServer(multiprocessing_context="spawn")


@server.rtc_session(agent_name="avatar-assistant")
async def avatar_session(ctx: lk_agents.JobContext):
    logger.info(f"Avatar agent joining: {ctx.room.name}")
    room = ctx.room

    # Parse dispatch metadata
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

    # Wait for guest
    logger.info("Waiting for guest to join the room...")
    participant = await ctx.wait_for_participant()
    logger.info(f"Guest joined: {participant.name} ({participant.identity})")

    # Fallback to participant attributes
    if not dispatch_meta_str or not session_id:
        guest_name = participant.name or guest_name
        attrs = participant.attributes or {}
        session_id = attrs.get("sessionId", room.name.replace("avatar_", ""))
        guest_email = attrs.get("guestEmail", guest_email)
        try:
            show_id = int(attrs["showId"]) if attrs.get("showId") else show_id
        except ValueError:
            pass

    # Fetch conversation + prompt data
    if session_id:
        conv = _backend_get("/api/avatar/conversation/", {"sessionId": session_id})
        if conv.get("prompt"):
            prompt_data = conv["prompt"]

    # Build models
    ollama = OllamaLLM(
        model=(prompt_data or {}).get("modelName", OLLAMA_MODEL),
        temperature=float((prompt_data or {}).get("temperature", 0.7)),
        max_tokens=int((prompt_data or {}).get("maxTokens", 256)),
    )
    whisper = LocalWhisperSTT(base_url=WHISPER_URL, language="en")
    tts_engine = NoopTTS()
    vad = silero.VAD.load()

    agent = PreShowAgent(
        session_id=session_id, guest_name=guest_name, guest_email=guest_email,
        show_id=show_id, prompt_data=prompt_data,
    )

    # Use VoicePipelineAgent for full duplex conversation
    voice_agent = VoicePipelineAgent(
        vad=vad,
        stt=whisper,
        llm=ollama,
        tts=tts_engine,
        agent=agent,
        turn_handling=TurnHandlingOptions(allow_interruptions=True),
    )

    await voice_agent.start(room, participant)

    # Send welcome
    welcome = (prompt_data or {}).get("welcomeMessage") or \
        f"Hey {guest_name}! I'm Lil' Dawg. Let's get you ready for the broadcast!"
    await voice_agent.say(welcome)

    logger.info(f"Voice avatar active for {guest_name} in {room.name}")

    # Keep alive
    try:
        await asyncio.sleep(3600)
    except asyncio.CancelledError:
        pass
    finally:
        # Generate summary
        summary = ""
        if hasattr(agent, "_conversation_messages") and agent._conversation_messages:
            logger.info(f"Generating summary for {guest_name} ({len(agent._conversation_messages)} messages)")
            summary = await agent.generate_summary(ollama)
        _backend_post("/api/avatar/end-session/", {
            "sessionId": session_id, "autoSummary": summary,
        })
        logger.info(f"Avatar session ended for {guest_name} (summary: {len(summary)} chars)")


# ═══════════════════════════════════════════════════════════════════════════
# 6. ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    lk_agents.cli.run_app(server)

print("=== AVATAR AGENT VOICE PIPELINE BACKUP ===")
print("This file is a backup for future use with AVX2-capable CPUs.")
print("Copy it over avatar_agent.py and restart when ready.")
