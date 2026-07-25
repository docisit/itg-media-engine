'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  volumeLevel?: number; // 0-1
  mood?: 'greeting' | 'listening' | 'speaking' | 'idle';
  avatarImageUrl?: string;
}

/**
 * Animated talking avatar for the green room.
 * When no image is provided, shows a cute cartoon mic/mascot character
 * that reacts to voice activity with animations.
 */
export default function AnimatedAvatar({
  isSpeaking,
  isListening,
  volumeLevel = 0,
  mood = 'idle',
  avatarImageUrl,
}: AnimatedAvatarProps) {
  const [displayMood, setDisplayMood] = useState<'idle' | 'listening' | 'speaking' | 'excited'>(mood as any || 'idle');
  const prevSpeakingRef = useRef(false);
  const bounceRef = useRef(0);

  // Map moods and voice activity to display state
  useEffect(() => {
    if (isSpeaking) {
      setDisplayMood('speaking');
    } else if (isListening) {
      setDisplayMood('listening');
    } else {
      setDisplayMood('idle');
    }
    prevSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isListening]);

  // Calculate bounce intensity from volume
  const scale = isSpeaking ? 1 + (volumeLevel * 0.08) : 1;
  const rotation = isSpeaking ? (volumeLevel * 3) - 1.5 : 0;
  const bounceY = isSpeaking ? -(volumeLevel * 4) : 0;

  if (avatarImageUrl) {
    // Custom avatar image mode
    return (
      <motion.div
        className="relative w-48 h-48 md:w-64 md:h-64 mx-auto"
        animate={{
          scale: scale,
          rotate: rotation,
          y: bounceY,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <div className={`relative w-full h-full rounded-full overflow-hidden ring-4 transition-all duration-500 ${
          isSpeaking ? 'ring-cyan-400 shadow-lg shadow-cyan-500/30' :
          isListening ? 'ring-green-400 shadow-lg shadow-green-500/30' :
          'ring-gray-500/50'
        }`}>
          <img
            src={avatarImageUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Speaking indicator rings */}
        <AnimatePresence>
          {isSpeaking && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.15, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/20"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Voice wave bars */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 bg-cyan-400 rounded-full"
              animate={{
                height: isSpeaking
                  ? `${12 + Math.sin(Date.now() / 200 + i) * volumeLevel * 20 + 6}px`
                  : '4px',
                opacity: isSpeaking ? 0.8 : 0.3,
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.08,
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // Default: Cute cartoon character (Lil' Dawg mascot)
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
      {/* Main character body */}
      <motion.div
        className="relative w-full h-full cursor-pointer"
        animate={{
          y: bounceY,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Outer glow ring */}
        <motion.div
          className={`absolute inset-0 rounded-full transition-all duration-700 ${
            isSpeaking ? 'bg-cyan-500/10 blur-xl' :
            isListening ? 'bg-green-500/10 blur-xl' :
            'bg-purple-500/5 blur-xl'
          }`}
          animate={{
            scale: isSpeaking ? 1.2 : 1,
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Inner ring */}
        <motion.div
          className={`absolute inset-2 rounded-full border-2 transition-colors duration-500 ${
            isSpeaking ? 'border-cyan-400/40' :
            isListening ? 'border-green-400/40' :
            'border-gray-500/20'
          }`}
          animate={{
            scale: scale,
            rotate: rotation,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        />

        {/* Character face */}
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
          {/* Background circle */}
          <circle cx="100" cy="100" r="90" fill="url(#avatarGrad)" />
          
          {/* Gradients */}
          <defs>
            <radialGradient id="avatarGrad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </radialGradient>
            <radialGradient id="earGrad">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>
            <radialGradient id="headphoneGrad">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d28d9" />
            </radialGradient>
          </defs>

          {/* Headphones band */}
          <motion.path
            d="M 25 100 A 75 75 0 0 1 175 100"
            fill="none"
            stroke="url(#headphoneGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            animate={{
              stroke: isSpeaking ? '#22d3ee' : isListening ? '#4ade80' : '#8b5cf6',
            }}
          />

          {/* Headphone left ear cup */}
          <circle cx="28" cy="100" r="18" fill="url(#earGrad)" />
          <circle cx="28" cy="100" r="8" fill="#1e293b" />

          {/* Headphone right ear cup */}
          <circle cx="172" cy="100" r="18" fill="url(#earGrad)" />
          <circle cx="172" cy="100" r="8" fill="#1e293b" />

          {/* Eyes */}
          <motion.g
            animate={{
              scaleY: isSpeaking ? [1, 0.3, 1][Math.floor(Date.now() / 300) % 3] || 1 : 1,
            }}
            transition={{ duration: 0.15 }}
          >
            {/* Left eye */}
            <ellipse cx="75" cy="85" rx="8" ry="9" fill="white" />
            <motion.circle
              cx="77" cy="87" r="5" fill="#1e293b"
              animate={{
                r: isListening ? 6 : 5,
              }}
            />
            <circle cx="79" cy="85" r="1.5" fill="white" />

            {/* Right eye */}
            <ellipse cx="125" cy="85" rx="8" ry="9" fill="white" />
            <motion.circle
              cx="127" cy="87" r="5" fill="#1e293b"
              animate={{
                r: isListening ? 6 : 5,
              }}
            />
            <circle cx="129" cy="85" r="1.5" fill="white" />
          </motion.g>

          {/* Eyebrows */}
          <motion.path
            d="M 62 70 Q 75 63 88 70"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{
              d: isSpeaking
                ? "M 62 68 Q 75 75 88 68"
                : "M 62 70 Q 75 63 88 70",
            }}
          />
          <motion.path
            d="M 112 70 Q 125 63 138 70"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{
              d: isSpeaking
                ? "M 112 68 Q 125 75 138 68"
                : "M 112 70 Q 125 63 138 70",
            }}
          />

          {/* Mouth */}
          <motion.path
            d="M 80 120 Q 100 135 120 120"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{
              d: isSpeaking
                ? "M 75 118 Q 100 140 125 118"
                : "M 80 120 Q 100 130 120 120",
              opacity: isSpeaking ? 1 : 0.7,
            }}
            transition={{ duration: 0.2 }}
          />

          {/* Blush */}
          <ellipse cx="58" cy="108" rx="10" ry="5" fill="rgba(244, 63, 94, 0.3)" />
          <ellipse cx="142" cy="108" rx="10" ry="5" fill="rgba(244, 63, 94, 0.3)" />

          {/* Mic icon on chest */}
          <motion.g
            animate={{
              scale: isSpeaking ? [1, 1.1, 1][Math.floor(Date.now() / 400) % 3] || 1 : 1,
            }}
          >
            <rect x="93" y="145" width="14" height="20" rx="7" fill={isSpeaking ? '#22d3ee' : '#64748b'} />
            <rect x="90" y="162" width="20" height="4" rx="2" fill={isSpeaking ? '#22d3ee' : '#64748b'} />
            <line x1="100" y1="166" x2="100" y2="172" stroke={isSpeaking ? '#22d3ee' : '#64748b'} strokeWidth="2" />
          </motion.g>
        </svg>
      </motion.div>

      {/* Voice wave bars at bottom */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-1 h-10">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => {
          const freq = Math.sin(Date.now() / 200 + i * 0.8) * 0.5 + 0.5;
          return (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              style={{
                background: isSpeaking
                  ? 'linear-gradient(to top, #22d3ee, #818cf8)'
                  : isListening
                    ? 'linear-gradient(to top, #4ade80, #22d3ee)'
                    : '#374151',
              }}
              animate={{
                height: isSpeaking
                  ? `${8 + freq * volumeLevel * 28}px`
                  : isListening
                    ? `${4 + freq * 6}px`
                    : '3px',
                opacity: isSpeaking ? 0.9 : isListening ? 0.5 : 0.2,
              }}
              transition={{
                duration: 0.2 + i * 0.03,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* Label */}
      <motion.div
        className="text-center mt-6"
        animate={{ opacity: 1 }}
      >
        <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Lil' Dawg
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {isSpeaking ? '🎙️ Speaking...' : isListening ? '👂 Listening...' : '💤 Waiting...'}
        </p>
      </motion.div>
    </div>
  );
}
