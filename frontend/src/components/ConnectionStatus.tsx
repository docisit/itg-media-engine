'use client';

import { useState, useEffect } from 'react';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [latency, setLatency] = useState<number | null>(null);

  // Simulate connection status updates
  useEffect(() => {
    // Initial connection
    const timer = setTimeout(() => {
      setStatus('connected');
      setLatency(45);
    }, 2000);

    // Simulate latency updates
    const latencyInterval = setInterval(() => {
      if (status === 'connected') {
        // Random latency between 30-80ms
        setLatency(30 + Math.random() * 50);
      }
    }, 3000);

    // Simulate occasional reconnections
    const statusInterval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance of simulated disconnect
        setStatus('connecting');
        setTimeout(() => setStatus('connected'), 1000);
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(latencyInterval);
      clearInterval(statusInterval);
    };
  }, [status]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'LIVE';
      case 'connecting': return 'CONNECTING';
      case 'disconnected': return 'OFFLINE';
      case 'error': return 'ERROR';
      default: return 'UNKNOWN';
    }
  };

  const getLatencyColor = () => {
    if (!latency) return 'text-gray-400';
    if (latency < 50) return 'text-green-400';
    if (latency < 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
        <span className="text-sm font-bold uppercase tracking-widest">
          {getStatusText()}
        </span>
      </div>

      {/* Latency indicator */}
      {latency && status === 'connected' && (
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
          <span className={`text-xs font-mono ${getLatencyColor()}`}>
            {latency.toFixed(0)}ms
          </span>
        </div>
      )}

      {/* TURN status */}
      {status === 'connected' && (
        <div className="hidden md:flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-purple-500"></div>
          <span className="text-xs text-purple-400 font-mono">TURN ✓</span>
        </div>
      )}
    </div>
  );
}