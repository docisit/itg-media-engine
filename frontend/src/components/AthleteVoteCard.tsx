'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound, sounds } from '@/lib/sounds';
import InteractiveButton from './InteractiveButton';

interface AthleteProfile {
  id: number;
  username: string;
  role: string;
  school_name: string;
  position: string;
  total_votes: number;
  profile_image?: string;
  is_voted?: boolean;
}

interface AthleteVoteCardProps {
  athlete: AthleteProfile;
  onVote: (athleteId: number) => Promise<void>;
  onRemoveVote?: (athleteId: number) => Promise<void>;
  showDetails?: boolean;
  rank?: number;
  compact?: boolean;
}

const AthleteVoteCard: React.FC<AthleteVoteCardProps> = ({
  athlete,
  onVote,
  onRemoveVote,
  showDetails = true,
  rank,
  compact = false
}) => {
  const { playSound } = useSound();
  const [isVoted, setIsVoted] = useState(athlete.is_voted || false);
  const [voteCount, setVoteCount] = useState(athlete.total_votes);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setIsAnimating(true);
    
    try {
      if (isVoted && onRemoveVote) {
        // Remove vote
        await onRemoveVote(athlete.id);
        setIsVoted(false);
        setVoteCount(prev => Math.max(0, prev - 1));
        playSound('buzzer', { vibration: true });
      } else {
        // Add vote
        await onVote(athlete.id);
        setIsVoted(true);
        setVoteCount(prev => prev + 1);
        playSound('vote', { vibration: true });
        
        // Play additional celebration sounds
        setTimeout(() => {
          if (voteCount % 10 === 9) { // Every 10th vote
            playSound('levelUp', { vibration: true });
          } else if (voteCount % 5 === 4) { // Every 5th vote
            playSound('cheer', { vibration: true });
          }
        }, 200);
      }
    } catch (error) {
      console.error('Vote error:', error);
      playSound('error', { vibration: true });
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!isAnimating) {
      playSound('click', { volume: 0.2, vibration: false });
    }
  };

  const getRankBadge = (rank?: number) => {
    if (!rank) return null;
    
    const colors = [
      'bg-yellow-500 text-yellow-900', // 1st
      'bg-gray-400 text-gray-900',     // 2nd
      'bg-amber-700 text-amber-900',   // 3rd
      'bg-blue-400 text-blue-900',     // 4th+
    ];
    
    const colorIndex = Math.min(rank - 1, 3);
    
    return (
      <motion.div
        className={`absolute -top-2 -left-2 z-20 flex h-8 w-8 items-center justify-center rounded-full font-bold shadow-lg ${colors[colorIndex]}`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {rank}
      </motion.div>
    );
  };

  const getSportIcon = (position: string) => {
    const icons: Record<string, string> = {
      'QB': '🏈',
      'RB': '🏃',
      'WR': '✋',
      'TE': '🤾',
      'OL': '🛡️',
      'DL': '💪',
      'LB': '⚔️',
      'DB': '🦅',
      'K': '👟',
      'P': '🦵',
      'default': '⭐'
    };
    
    return icons[position] || icons.default;
  };

  return (
    <motion.div
      className={`relative rounded-xl border-2 bg-gradient-to-br from-white to-gray-50 p-4 shadow-lg transition-all duration-300 ${
        isVoted 
          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50' 
          : 'border-gray-200'
      } ${compact ? 'p-3' : 'p-4'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      animate={{
        scale: isAnimating ? 1.05 : 1,
        boxShadow: isHovered 
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.3)' 
          : '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Rank badge */}
      {rank && getRankBadge(rank)}

      {/* Celebration particles when voted */}
      <AnimatePresence>
        {isAnimating && !isVoted && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-2 w-2 rounded-full bg-purple-500"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  opacity: 1
                }}
                animate={{
                  x: `calc(50% + ${Math.cos(i * 45 * (Math.PI / 180)) * 60}px)`,
                  y: `calc(50% + ${Math.sin(i * 45 * (Math.PI / 180)) * 60}px)`,
                  scale: [0, 1, 0],
                  opacity: [1, 0.5, 0]
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
        {/* Profile image */}
        <div className="relative">
          <motion.div
            className={`relative overflow-hidden rounded-full border-4 ${
              isVoted ? 'border-purple-500' : 'border-gray-300'
            }`}
            animate={{
              scale: isHovered ? 1.1 : 1,
              rotate: isHovered ? [0, 5, -5, 0] : 0
            }}
            transition={{ duration: 0.5 }}
          >
            <div className={`${compact ? 'h-16 w-16' : 'h-20 w-20'} bg-gradient-to-br from-blue-400 to-purple-500`}>
              {athlete.profile_image ? (
                <img
                  src={athlete.profile_image}
                  alt={athlete.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                  {athlete.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </motion.div>

          {/* Sport icon badge */}
          <motion.div
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg shadow-md"
            animate={{
              scale: isHovered ? 1.2 : 1,
              rotate: isHovered ? 360 : 0
            }}
            transition={{ duration: 0.5 }}
          >
            {getSportIcon(athlete.position)}
          </motion.div>
        </div>

        {/* Athlete info */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <motion.h3 
                className={`font-bold ${compact ? 'text-lg' : 'text-xl'} text-gray-900`}
                animate={{ 
                  color: isVoted ? '#8b5cf6' : '#111827',
                  textShadow: isHovered ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {athlete.username}
              </motion.h3>
              <p className="text-sm text-gray-600">
                {athlete.position} • {athlete.school_name}
              </p>
            </div>

            {/* Vote count */}
            <motion.div
              className="text-center"
              animate={{ scale: isAnimating ? 1.2 : 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="text-2xl font-bold text-purple-600">{voteCount}</div>
              <div className="text-xs text-gray-500">VOTES</div>
            </motion.div>
          </div>

          {showDetails && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">Role: {athlete.role}</span>
                <motion.div
                  className="h-2 flex-1 rounded-full bg-gray-200"
                  initial={false}
                  animate={{ scaleX: isHovered ? 1.05 : 1 }}
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(voteCount / 10, 100)}%` }}
                    transition={{ duration: 1 }}
                  />
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vote button */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <InteractiveButton
          onClick={handleVote}
          variant={isVoted ? 'success' : 'sport'}
          size={compact ? 'sm' : 'md'}
          soundEffect={isVoted ? 'buzzer' : 'vote'}
          vibrationPattern={isVoted ? [100, 50, 100] : [50, 30, 50]}
          loading={isLoading}
          fullWidth
          pulse={!isVoted && isHovered}
          glow={isVoted}
          icon={
            <motion.span
              animate={{ 
                scale: isAnimating ? [1, 1.5, 1] : 1,
                rotate: isAnimating ? [0, 180, 360] : 0
              }}
              transition={{ duration: 0.5 }}
            >
              {isVoted ? '❤️' : '🤍'}
            </motion.span>
          }
        >
          {isVoted ? 'VOTED!' : `VOTE FOR ${athlete.username.split(' ')[0].toUpperCase()}`}
        </InteractiveButton>
      </motion.div>

      {/* Confetti effect on successful vote */}
      <AnimatePresence>
        {isAnimating && isVoted && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-3 w-3"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{
                  x: `calc(50% + ${Math.cos(i * 18 * (Math.PI / 180)) * 100}px)`,
                  y: `calc(50% + ${Math.sin(i * 18 * (Math.PI / 180)) * 100}px + ${i * 10}px)`,
                  scale: [0, 1, 0],
                  rotate: 360,
                  opacity: [1, 0.8, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.05
                }}
              >
                <div className="h-full w-full rounded-full bg-gradient-to-r from-yellow-400 to-pink-500" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AthleteVoteCard;