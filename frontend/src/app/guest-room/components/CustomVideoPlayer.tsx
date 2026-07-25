'use client';

import { useEffect, useRef, useState } from 'react';

interface CustomVideoPlayerProps {
  remoteStream: MediaStream | null;
  connectionState: string;
  roomId: string;
  guestId: string;
}

export default function CustomVideoPlayer({ 
  remoteStream, 
  connectionState, 
  roomId, 
  guestId 
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [videoStats, setVideoStats] = useState({
    resolution: '0x0',
    frameRate: 0,
    bitrate: 0,
    codec: 'unknown'
  });

  // Update video element when remote stream changes
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(console.error);
      
      // Update stats
      const videoTrack = remoteStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setVideoStats({
          resolution: `${settings.width || 0}x${settings.height || 0}`,
          frameRate: settings.frameRate || 0,
          bitrate: 0, // Would need to calculate from RTCPeerConnection
          codec: 'H.264' // Default assumption
        });
      }
    }
  }, [remoteStream]);

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  const toggleStats = () => {
    setShowStats(!showStats);
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'LIVE';
      case 'connecting':
        return 'CONNECTING';
      case 'disconnected':
        return 'OFFLINE';
      default:
        return connectionState.toUpperCase();
    }
  };

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />

      {/* Connection Status Overlay */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getConnectionStatusColor()} text-white`}>
          {getConnectionStatusText()}
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-cyan-900/80 text-cyan-300">
          {roomId}
        </div>
      </div>

      {/* Guest ID Overlay */}
      <div className="absolute top-4 right-4">
        <div className="px-3 py-1 bg-black/70 rounded-full text-xs font-mono text-amber-300">
          Guest: {guestId}
        </div>
      </div>

      {/* Video Stats Overlay */}
      {showStats && (
        <div className="absolute bottom-4 left-4 bg-black/80 rounded-lg p-3 max-w-xs">
          <div className="text-xs font-bold text-cyan-300 mb-2">VIDEO STATS</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Resolution:</span>
              <span className="font-mono text-white">{videoStats.resolution}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frame Rate:</span>
              <span className="font-mono text-white">{videoStats.frameRate.toFixed(1)} fps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Codec:</span>
              <span className="font-mono text-white">{videoStats.codec}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Connection:</span>
              <span className="font-mono text-green-400">{connectionState}</span>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} animate-pulse`}></div>
            <span className="text-sm text-white">
              {connectionState === 'connected' ? 'Live broadcast from host' : 'Waiting for connection...'}
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={toggleStats}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-lg transition-colors"
            >
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 bg-cyan-800 hover:bg-cyan-700 text-white text-xs rounded-lg transition-colors"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>

      {/* Connection Quality Indicator */}
      {connectionState === 'connected' && (
        <div className="absolute top-16 right-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-black/70 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-mono text-green-300">HD Quality</span>
          </div>
        </div>
      )}

      {/* No Stream Message */}
      {!remoteStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
          <div className="text-center p-8">
            <div className="text-5xl mb-4">📹</div>
            <h3 className="text-xl font-bold text-white mb-2">Waiting for Broadcast</h3>
            <p className="text-zinc-400 mb-4">
              {connectionState === 'connecting' 
                ? 'Connecting to broadcast studio...' 
                : 'The host will start the broadcast soon'}
            </p>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        </div>
      )}
    </div>
  );
}