'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound, sounds } from '@/lib/sounds';
import InteractiveButton from './InteractiveButton';

interface ChatMessage {
  id: number;
  username: string;
  user_role: string;
  content: string;
  display_content: string;
  message_type: 'text' | 'image' | 'video' | 'link';
  media_url?: string;
  thumbnail_url?: string;
  created_at: string;
  is_own?: boolean;
  pinned?: boolean;
}

interface ChatChannel {
  id: number;
  name: string;
  description: string;
  channel_type: string;
  member_count: number;
  last_message_time: string;
}

interface InteractiveChatProps {
  channel: ChatChannel;
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onJoinChannel?: () => Promise<void>;
  onLeaveChannel?: () => Promise<void>;
  isMember?: boolean;
  currentUser?: {
    username: string;
    role: string;
  };
}

const InteractiveChat: React.FC<InteractiveChatProps> = ({
  channel,
  messages,
  onSendMessage,
  onJoinChannel,
  onLeaveChannel,
  isMember = false,
  currentUser
}) => {
  const { playSound } = useSound();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const emojis = ['🔥', '💪', '🏈', '⚡', '🎯', '⭐', '👑', '🚀', '💯', '🙌', '🤩', '🥇'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isScrolledToBottom) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    // Play notification sound for new messages
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.is_own) {
        playSound('notification', { vibration: true });
      }
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    playSound('message', { vibration: true });

    try {
      await onSendMessage(message);
      setMessage('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      playSound('error', { vibration: true });
    } finally {
      setIsSending(false);
    }
  };

  const handleJoinChannel = async () => {
    if (!onJoinChannel || isJoining) return;

    setIsJoining(true);
    playSound('success', { vibration: true });

    try {
      await onJoinChannel();
    } catch (error) {
      console.error('Failed to join channel:', error);
      playSound('error', { vibration: true });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveChannel = async () => {
    if (!onLeaveChannel || isJoining) return;

    setIsJoining(true);
    playSound('buzzer', { vibration: true });

    try {
      await onLeaveChannel();
    } catch (error) {
      console.error('Failed to leave channel:', error);
      playSound('error', { vibration: true });
    } finally {
      setIsJoining(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage(prev => prev + emoji);
    playSound('click', { volume: 0.3, vibration: true });
    setShowEmojiPicker(false);
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsScrolledToBottom(isAtBottom);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      staff: 'bg-red-500 text-white',
      coach: 'bg-blue-500 text-white',
      athlete: 'bg-green-500 text-white',
      premium: 'bg-purple-500 text-white',
      community: 'bg-gray-500 text-white'
    };
    return colors[role] || 'bg-gray-400 text-white';
  };

  const getChannelIcon = (channelType: string) => {
    const icons: Record<string, string> = {
      public: '🌐',
      private: '🔒',
      show: '🎙️',
      athlete: '⭐',
      announcement: '📢'
    };
    return icons[channelType] || '💬';
  };

  return (
    <motion.div
      className="flex h-[600px] flex-col rounded-2xl border-2 border-gray-200 bg-gradient-to-b from-white to-gray-50 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Channel header */}
      <motion.div
        className="rounded-t-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-4"
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {getChannelIcon(channel.channel_type)}
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-white">{channel.name}</h2>
              <p className="text-sm text-white/80">{channel.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.div
              className="rounded-full bg-white/20 px-3 py-1 text-sm text-white"
              whileHover={{ scale: 1.1 }}
            >
              👥 {channel.member_count} members
            </motion.div>
            
            {onJoinChannel && onLeaveChannel && (
              <InteractiveButton
                onClick={isMember ? handleLeaveChannel : handleJoinChannel}
                variant={isMember ? 'danger' : 'success'}
                size="sm"
                soundEffect={isMember ? 'buzzer' : 'success'}
                loading={isJoining}
                icon={isMember ? '👋' : '➕'}
              >
                {isMember ? 'Leave' : 'Join'}
              </InteractiveButton>
            )}
          </div>
        </div>
      </motion.div>

      {/* Messages container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              className={`mb-4 ${msg.is_own ? 'ml-auto' : ''}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className={`flex max-w-[80%] ${msg.is_own ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <motion.div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    msg.is_own ? 'ml-3' : 'mr-3'
                  }`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="h-full w-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                </motion.div>

                {/* Message bubble */}
                <div className={`flex-1 ${msg.is_own ? 'text-right' : ''}`}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-bold text-gray-900">{msg.username}</span>
                    <motion.span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${getRoleColor(msg.user_role)}`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {msg.user_role}
                    </motion.span>
                    {msg.pinned && (
                      <motion.span
                        className="text-yellow-500"
                        animate={{ rotate: [0, 20, -20, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        📌
                      </motion.span>
                    )}
                  </div>

                  <motion.div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.is_own
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                    whileHover={{ 
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      y: -2
                    }}
                  >
                    <p className="whitespace-pre-wrap">{msg.display_content || msg.content}</p>
                    
                    {msg.media_url && (
                      <motion.div
                        className="mt-2 overflow-hidden rounded-lg"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <img
                          src={msg.thumbnail_url || msg.media_url}
                          alt="Media"
                          className="max-h-48 w-full object-cover"
                        />
                      </motion.div>
                    )}
                  </motion.div>

                  <motion.div
                    className="mt-1 text-xs text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      {isMember && (
        <motion.div
          className="border-t border-gray-200 p-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2">
            {/* Emoji picker */}
            <div className="relative">
              <InteractiveButton
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  playSound('click', { vibration: true });
                }}
                variant="secondary"
                size="sm"
                icon="😀"
              >
                😀
              </InteractiveButton>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    className="absolute bottom-full left-0 mb-2 grid grid-cols-4 gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {emojis.map((emoji, index) => (
                      <motion.button
                        key={index}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-gray-100"
                        onClick={() => handleEmojiClick(emoji)}
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Message input */}
            <motion.div
              className="flex-1"
              whileFocus={{ scale: 1.01 }}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Message #${channel.name}...`}
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                disabled={isSending}
              />
            </motion.div>

            {/* Send button */}
            <InteractiveButton
              onClick={handleSendMessage}
              variant="sport"
              size="lg"
              soundEffect="message"
              vibrationPattern={[30, 20, 30]}
              loading={isSending}
              disabled={!message.trim()}
              icon="🚀"
              iconPosition="right"
              glow
            >
              Send
            </InteractiveButton>
          </div>

          {/* Quick actions */}
          <motion.div
            className="mt-3 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {['🔥 Fire!', '💪 Strong!', '🏈 Touchdown!', '🎯 On point!'].map((quickMsg, index) => (
              <motion.button
                key={index}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                onClick={() => {
                  setMessage(quickMsg);
                  playSound('click', { volume: 0.2, vibration: true });
                }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                {quickMsg}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Scroll to bottom button */}
      {!isScrolledToBottom && (
        <motion.button
          className="absolute bottom-24 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg"
          onClick={() => {
            scrollToBottom();
            playSound('click', { vibration: true });
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1, rotate: 360 }}
          whileTap={{ scale: 0.9 }}
        >
          ⬇️
        </motion.button>
      )}

      {/* New message indicator */}
      {!isScrolledToBottom && messages.length > 0 && (
        <motion.div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            y: { type: 'spring', stiffness: 200 },
            opacity: { duration: 0.3 }
          }}
        >
          New messages! 👇
        </motion.div>
      )}
    </motion.div>
  );
};

export default InteractiveChat;