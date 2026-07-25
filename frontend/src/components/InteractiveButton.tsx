'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface InteractiveButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'sport' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  soundEffect?: string;
  vibrationPattern?: number[];
  loading?: boolean;
  fullWidth?: boolean;
  pulse?: boolean;
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function InteractiveButton({
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  loading = false,
  fullWidth = false,
  pulse = false,
  glow = false,
  icon,
  iconPosition = 'left',
}: InteractiveButtonProps) {
  const baseStyles = 'rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 inline-flex items-center justify-center gap-2';
  
  const variantStyles: Record<string, string> = {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500',
    secondary: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700',
    ghost: 'bg-transparent text-zinc-400 hover:text-white',
    success: 'bg-green-600 text-white hover:bg-green-500',
    sport: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size]} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${fullWidth ? 'w-full' : ''} ${pulse ? 'animate-pulse' : ''} ${
        glow ? 'shadow-[0_0_15px_rgba(245,158,11,0.5)]' : ''
      } ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
    </motion.button>
  );
}
