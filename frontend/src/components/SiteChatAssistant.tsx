'use client';
/**
 * SiteChatAssistant — Floating Chat Bubble for Homepage
 * ======================================================
 * FAQ-driven chat with Ollama backend. Matches FAQs first,
 * then falls back to the 1B model. Lightweight, no RAG.
 * 
 * Features:
 * - Floating bubble in bottom-right corner
 * - FAQ-first matching (instant answers, no model load)
 * - Session persistence via localStorage
 * - Mobile-responsive
 * - Desktop/mobile unique sessions (via userAgent)
 * - Admin-configurable mood/tone
 * - Auto-pauses during live shows with link to broadcast page
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  keywords: string;
}

interface ChatConfig {
  assistantName: string;
  mood: string;
  tone: string;
  moodLabel: string;
  toneLabel: string;
  preferFaqExact: boolean;
  faqs: FAQ[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  matchedFaq?: boolean;
  faqId?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const SESSION_KEY = 'site_chat_session_id';
const MESSAGES_KEY = 'site_chat_messages';

// Pre-built quick questions for first-time visitors
const QUICK_QUESTIONS = [
  'How do I become a guest?',
  'How can parents watch?',
  'Is my data secure?',
  'What equipment do I need?',
  'Tell me about the platform',
];

export default function SiteChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [showIsLive, setShowIsLive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load config on mount & check live status ──
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/api/site-chat/config/`);
        setConfig(resp.data);
      } catch (err) {
        console.warn('Failed to load chat config:', err);
      }
    };
    loadConfig();
    
    // Check if show is live
    const checkLiveStatus = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/api/shows/live-status/`);
        setShowIsLive(resp.data.is_live === true);
      } catch (err) {
        // Ignore errors, assume not live
      }
    };
    checkLiveStatus();
    
    // Poll every 30 seconds to detect live status changes
    const interval = setInterval(checkLiveStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Restore session from localStorage ──
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      setSessionId(newId);
      localStorage.setItem(SESSION_KEY, newId);
    }

    // Restore messages from localStorage
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setShowQuickQuestions(false);
        }
      }
    } catch {}
  }, []);

  // ── Save messages to localStorage ──
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setAnimateIn(true);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  // ── Sync session to server every 30s ──
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    const interval = setInterval(() => {
      axios.post(`${API_BASE}/api/site-chat/session/`, {
        sessionId,
        messages: messages.slice(-20), // last 20
        userAgent: navigator.userAgent,
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId, messages]);

  // ── Send Message ──
  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setShowQuickQuestions(false);

    const userMsg: Message = {
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const resp = await axios.post(`${API_BASE}/api/site-chat/ask/`, {
        question: q,
        sessionId,
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: resp.data.answer,
        timestamp: Date.now(),
        matchedFaq: resp.data.matchedFaq,
        faqId: resp.data.faqId,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  // ── Handle Enter key ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Clear conversation ──
  const handleNewChat = () => {
    setMessages([]);
    setShowQuickQuestions(true);
    localStorage.removeItem(MESSAGES_KEY);
    const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    setSessionId(newId);
    localStorage.setItem(SESSION_KEY, newId);
  };

  // ── Render ──

  return (
    <>
      {/* ── Chat Bubble Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-cyan-600 rotate-45 scale-90'
            : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-110 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]'
        }`}
        aria-label="Toggle chat assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {messages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {messages.filter(m => m.role === 'user').length}
          </span>
        )}
      </button>

      {/* ── Chat Panel ── */}
      <div
        className={`fixed bottom-24 right-6 z-[9998] w-[380px] max-w-[calc(100vw-48px)] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
        style={{ maxHeight: 'min(600px, calc(100vh - 160px))' }}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
              🎙️
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {config?.assistantName || "Lil' Dawg"}
              </h3>
              <p className="text-xs text-cyan-200">
                {config?.moodLabel || 'Assistant'} · {config?.toneLabel || 'Conversational'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-white/10 rounded-lg transition text-cyan-200 hover:text-white"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ height: '380px' }}>
          {/* Live Show Banner */}
          {showIsLive && (
            <div className="bg-gradient-to-r from-red-600/20 to-red-900/20 border border-red-500/40 rounded-xl p-5 text-center mb-2 animate-pulse">
              <div className="text-3xl mb-2">🔴</div>
              <h4 className="text-red-400 font-bold text-sm mb-1 uppercase tracking-wider">
                Show is Live!
              </h4>
              <p className="text-zinc-300 text-sm mb-3">
                Lil' Dawg is taking a break while the show is on air.
              </p>
              <a
                href="/broadcast"
                className="inline-block bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-2 rounded-lg font-bold text-xs hover:from-red-500 hover:to-red-600 transition shadow-lg shadow-red-500/20"
              >
                📡 Watch Live Broadcast
              </a>
              <p className="text-zinc-500 text-xs mt-3">
                Return after the show for any questions!
              </p>
            </div>
          )}

          {/* Welcome message */}
          {messages.length === 0 && !showIsLive && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">👋</div>
              <h4 className="text-white font-bold mb-1">
                Hey there! I'm {config?.assistantName || "Lil' Dawg"}!
              </h4>
              <p className="text-zinc-400 text-sm">
                Ask me anything about the platform — how to be a guest, parent viewing,
                data security, or anything else!
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                }`}
              >
                {msg.content}

                {msg.matchedFaq && (
                  <div className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Answered from FAQ
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl rounded-bl-md p-4">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Questions ── */}
        {showQuickQuestions && !isLoading && !showIsLive && (
          <div className="px-4 pb-2">
            <p className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wider font-bold">Quick Questions</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-full border border-zinc-700 hover:border-cyan-500/50 transition whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div className="p-3 border-t border-zinc-800">
          {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !isLoading && !showIsLive && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-full border border-zinc-700/50 hover:border-cyan-500/30 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={showIsLive ? "Chat paused while show is live..." : "Ask me anything..."}
              disabled={isLoading || showIsLive}
              className="flex-1 bg-zinc-800 text-white text-sm rounded-xl px-4 py-2.5 border border-zinc-700 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder-zinc-500 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading || showIsLive}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white p-2.5 rounded-xl transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
