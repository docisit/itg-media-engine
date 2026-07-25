'use client';

import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import AnimatedAvatar from '@/components/AnimatedAvatar';
import { Room, RoomEvent } from 'livekit-client';

// ── VoiceSelector Component ─────────────────────────────────────────────
function speakLocally(textToSay: string, voice: SpeechSynthesisVoice | null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(textToSay);
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

function VoiceSelector({ onVoiceChange }: { onVoiceChange: (v: SpeechSynthesisVoice) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en-'));
      setVoices(englishVoices);
      if (englishVoices.length > 0 && !selectedVoiceName) {
        const defaultVoice = englishVoices.find(v => v.default) || englishVoices[0];
        setSelectedVoiceName(defaultVoice.name);
        onVoiceChange(defaultVoice);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [onVoiceChange, selectedVoiceName]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedVoiceName(name);
    const selectedObj = voices.find(v => v.name === name);
    if (selectedObj) onVoiceChange(selectedObj);
  };

  if (voices.length === 0) return null;

  return (
    <div className="voice-selector-container flex items-center justify-center gap-2 mt-2">
      <label htmlFor="avatar-voice" className="text-xs text-gray-400">🎙️ Avatar Voice:</label>
      <select
        id="avatar-voice"
        value={selectedVoiceName}
        onChange={handleSelect}
        className="p-1 border rounded bg-slate-800 text-white text-xs max-w-[200px] border-gray-600"
      >
        {voices.map(voice => (
          <option key={voice.name} value={voice.name}>
            {voice.name} ({voice.lang}){voice.localService ? ' — Local' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────

interface AvatarSession {
  token: string;
  serverUrl: string;
  roomName: string;
  sessionId: string;
  mainRoomName: string;
  guestName: string;
  welcomeMessage: string;
  prompt?: {
    systemPrompt: string;
    guestInfo: string;
    guestName: string;
    modelName: string;
    temperature: number;
    maxTokens: number;
  };
}

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
  icon: string;
}

// ── Push-to-Talk Hook ────────────────────────────────────────────────────

function usePushToTalk(room: Room | null) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const isPushActiveRef = useRef(false);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser");
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      // Send text over data channel to the agent
      if (roomRef.current) {
        const encoder = new TextEncoder();
        const payload = JSON.stringify({ type: "coach_chat", text });
        roomRef.current.localParticipant.publishData(encoder.encode(payload), { reliable: true });
        console.log("Sent coach_chat:", text);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.warn("SpeechRecognition error:", event.error);
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try { rec.abort(); } catch {}
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isPushActiveRef.current) return;
    isPushActiveRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("SpeechRecognition start failed:", e);
      isPushActiveRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    isPushActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  return { isListening, startListening, stopListening, transcript };
}

// ── Avatar Room Content ──────────────────────────────────────────────────

function AvatarRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const guestName = searchParams.get('name') || searchParams.get('guestName') || 'Guest';
  const guestEmail = searchParams.get('email') || '';
  const showId = searchParams.get('showId') || '';

  const [step, setStep] = useState<'connecting' | 'welcoming' | 'chatting' | 'checklist' | 'ready'>('connecting');
  const [session, setSession] = useState<AvatarSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Array<{role: string; content: string; timestamp: string}>>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [chosenVoice, setChosenVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const chosenVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  useEffect(() => { chosenVoiceRef.current = chosenVoice; }, [chosenVoice]);

  const isFetchingRef = useRef(false);
  const initStartedRef = useRef(false);

  // ── Push-to-Talk ──
  const { isListening, startListening, stopListening, transcript } = usePushToTalk(room);

  // ── Checklist ──
  const [checklist, setChecklist] = useState<CheckItem[]>([
    { id: 'headphones', label: 'Wearing headphones for clear audio', checked: false, icon: '🎧' },
    { id: 'connection', label: 'Stable internet connection', checked: false, icon: '📶' },
    { id: 'quiet', label: 'Quiet, well-lit space', checked: false, icon: '🔇' },
    { id: 'camera', label: 'Camera positioned at eye level', checked: false, icon: '📷' },
    { id: 'mic', label: 'Microphone working and not too close', checked: false, icon: '🎙️' },
  ]);

  // ── Connect to LiveKit ──
  useEffect(() => {
    if (isFetchingRef.current || initStartedRef.current) return;
    isFetchingRef.current = true;
    initStartedRef.current = true;

    let mounted = true;

    async function init() {
      try {
        setStep('connecting');

        const response = await fetch('/api/avatar/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName,
            guestEmail,
            showId: showId ? parseInt(showId) : undefined,
          }),
        });

        if (!response.ok) throw new Error('Failed to get avatar token');
        const sessionData: AvatarSession = await response.json();
        if (!mounted) return;

        setSession(sessionData);
        setCurrentMessage(sessionData.welcomeMessage);

        // Speak welcome after 2s
        setTimeout(() => {
          if (mounted) speakLocally(sessionData.welcomeMessage, chosenVoiceRef.current);
        }, 2000);

        // Connect to LiveKit room (data-only — no audio/video published)
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        // Listen for agent data
        newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
          if (!participant) return;
          try {
            const text = new TextDecoder().decode(payload as unknown as ArrayBuffer);
            const data = JSON.parse(text);
            handleAgentData(data);
          } catch {}
        });

        newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === 'video' && participant?.identity.startsWith('AVATAR_AGENT')) {
            const videoEl = document.getElementById('agent-video') as HTMLVideoElement;
            if (videoEl && track.mediaStreamTrack) {
              videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);
              videoEl.play().catch(console.warn);
            }
          }
        });

        newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
          if (state === 'disconnected' && mounted) {
            setConnectionError('Connection lost. Please refresh to rejoin.');
          }
        });

        // Connect — no audio/video published from guest side
        await newRoom.connect(sessionData.serverUrl, sessionData.token);

        if (!mounted) return;
        setRoom(newRoom);

        setTimeout(() => {
          if (mounted) {
            setStep('welcoming');
            setTimeout(() => {
              if (mounted) setStep('chatting');
            }, 3000);
          }
        }, 1500);

      } catch (err: any) {
        console.error('Avatar connection error:', err);
        if (mounted) setConnectionError(err.message || 'Connection failed');
      }
    }

    init();

    return () => {
      mounted = false;
      if (room) room.disconnect();
      fetch('/api/avatar/end-session/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session?.sessionId }),
      }).catch(() => {});
    };
  }, []);

  function handleAgentData(data: any) {
    if (data.type === 'speaking') {
      setIsAiSpeaking(data.speaking);
    }
    if (data.type === 'message' && data.content) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
      }]);
      setCurrentMessage(data.content);
      setIsAiSpeaking(true);
      // Speak via browser SpeechSynthesis
      speakLocally(data.content, chosenVoiceRef.current);
      // Set speaking false after estimated time
      const wordCount = data.content.split(' ').length;
      const estimatedMs = Math.max(wordCount * 150, 1000);
      setTimeout(() => setIsAiSpeaking(false), estimatedMs);
    }
    if (data.type === 'ready') {
      setStep('checklist');
    }
  }

  const sendTextMessage = async () => {
    if (!textInput.trim() || !session || !room) return;
    const msg = textInput.trim();
    setTextInput('');

    setMessages(prev => [...prev, {
      role: 'user', content: msg, timestamp: new Date().toISOString(),
    }]);

    // Send over data channel
    const encoder = new TextEncoder();
    const payload = JSON.stringify({ type: "coach_chat", text: msg });
    room.localParticipant.publishData(encoder.encode(payload), { reliable: true });

    try {
      await fetch('/api/avatar/save-message/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, role: 'user', content: msg }),
      });
    } catch {}
  };

  const handleProceed = () => {
    if (room) room.disconnect();
    const roomName = session?.mainRoomName || 'Broadcast_Studio_A1';
    // Pass guest name and fromAvatar flag — the broadcast room page
    // will skip login requirement and use this name when coming from avatar
    router.push(`/guest-room/${encodeURIComponent(roomName)}?name=${encodeURIComponent(guestName)}&fromAvatar=true`);
  };

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const allChecked = checklist.every(item => item.checked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">

          {step === 'connecting' && (
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20">
              <motion.div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-6"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
              <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Connecting to your pre-show assistant...
              </p>
              <p className="text-gray-500 mt-2">One moment please</p>
            </motion.div>
          )}

          {(step === 'welcoming' || step === 'chatting') && (
            <motion.div key="avatar-chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <div className="mb-4">
                <AnimatedAvatar
                  isSpeaking={isAiSpeaking}
                  isListening={isListening}
                  volumeLevel={isListening ? 0.7 : 0}
                />
              </div>

              <motion.div className="relative mx-auto max-w-lg bg-gray-800/60 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
                {currentMessage && (
                  <motion.p key={currentMessage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-lg text-gray-200 leading-relaxed">{currentMessage}</motion.p>
                )}
                {isListening && (
                  <div className="flex justify-center gap-1 mt-3">
                    {[1,2,3].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-green-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
                    ))}
                  </div>
                )}
              </motion.div>

              <div className="mt-4 text-sm text-gray-500">
                {isAiSpeaking ? '🎙️ Lil\' Dawg is talking...' : isListening ? '👂 Listening...' : '💬 Hold the mic button to talk'}
              </div>

              <VoiceSelector onVoiceChange={setChosenVoice} />

              <button onClick={handleProceed}
                className="mt-3 px-5 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 text-sm border border-gray-600/30">
                🚪 Continue to Green Room
              </button>

              <video id="agent-video" className="hidden" playsInline />

              <div className="flex justify-center gap-4 mt-6">
                {/* Push-to-Talk Button */}
                <motion.button
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onMouseLeave={stopListening}
                  onTouchStart={(e) => { e.preventDefault(); startListening(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-full transition-all ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </motion.button>

                {/* Text Input Toggle */}
                <motion.button
                  onClick={() => setShowTextInput(!showTextInput)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-4 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </motion.button>
              </div>

              {showTextInput && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 max-w-md mx-auto">
                  <div className="flex gap-2">
                    <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-800/80 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400" />
                    <button onClick={sendTextMessage}
                      className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
                      Send
                    </button>
                  </div>
                </motion.div>
              )}

              {messages.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-lg mx-auto">
                  <details className="text-left">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300">
                      Conversation history ({messages.length} messages)
                    </summary>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {messages.map((msg, i) => (
                        <div key={i} className={`text-sm p-2 rounded-lg ${
                          msg.role === 'assistant' ? 'bg-cyan-500/10 text-cyan-300 ml-4' : 'bg-purple-500/10 text-purple-300 mr-4'
                        }`}>
                          <span className="font-bold text-xs block mb-1">
                            {msg.role === 'assistant' ? '🤖 Lil\' Dawg' : '👤 You'}
                          </span>
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  </details>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'checklist' && (
            <motion.div key="checklist" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Almost Ready!</h2>
                <p className="text-gray-400 mt-2">Let's make sure everything is set for a great broadcast.</p>
              </div>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <motion.button key={item.id} onClick={() => toggleChecklist(item.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      item.checked ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800/40 border-gray-600/30 text-gray-300 hover:border-cyan-400/30'
                    }`}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${item.checked ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
                      {item.checked ? '✅' : item.icon}
                    </div>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.checked && <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </motion.button>
                ))}
              </div>
              <motion.button onClick={handleProceed} disabled={!allChecked}
                className={`w-full mt-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  allChecked ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                whileHover={allChecked ? { scale: 1.02 } : {}} whileTap={allChecked ? { scale: 0.98 } : {}}>
                {allChecked ? '🔴 Enter Broadcast Room' : 'Complete all checks to continue'}
              </motion.button>
            </motion.div>
          )}

          {step === 'ready' && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 0.9 }} className="text-center max-w-lg mx-auto">
              <motion.div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">You're All Set!</h2>
              <p className="text-gray-400 mt-4 text-lg">Lil' Dawg has you prepped and ready. Let's go live!</p>
              <motion.button onClick={handleProceed}
                className="mt-8 px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                🎬 Join Broadcast Now
              </motion.button>
            </motion.div>
          )}

          {connectionError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-lg mx-auto">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-400">Connection Error</h2>
              <p className="text-gray-400 mt-2">{connectionError}</p>
              <button onClick={() => window.location.reload()}
                className="mt-6 px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30">
                Try Again
              </button>
              <button onClick={() => router.push('/guest-room')}
                className="mt-3 ml-3 px-6 py-3 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50">
                Skip to Broadcast
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AvatarRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-xl font-bold">Loading pre-show assistant...</p>
        </div>
      </div>
    }>
      <AvatarRoomContent />
    </Suspense>
  );
}
