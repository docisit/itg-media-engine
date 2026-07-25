'use client';

import { useEffect, useRef, useState } from 'react';

interface RTMPConnectionProps {
  config: {
    roomId: string;
    guestName: string;
    ingestUrl: string;
    receiveUrl: string;
    streamKey: string;
  };
  onConnectionState: (state: string) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
}

export default function RTMPConnection({ config, onConnectionState, onRemoteStream }: RTMPConnectionProps) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [rtmpPlayer, setRtmpPlayer] = useState<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // RTMP ingest via MediaRecorder API (simulated - in production would use FFmpeg or similar)
  useEffect(() => {
    if (!config.ingestUrl || !config.streamKey) return;
    
    const setupRTMPIngest = async () => {
      try {
        onConnectionState('connecting');
        setConnectionStatus('connecting');
        
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        
        // In a real implementation, you would:
        // 1. Use MediaRecorder API to capture stream
        // 2. Convert to FLV/RTMP format
        // 3. Send to RTMP server via WebSocket or HTTP POST
        
        // For now, we'll simulate successful connection
        setTimeout(() => {
          onConnectionState('connected');
          setConnectionStatus('connected');
          console.log('RTMP ingest configured:', config.ingestUrl);
          console.log('Stream key:', config.streamKey);
        }, 1000);
        
      } catch (error) {
        console.error('Error setting up RTMP ingest:', error);
        onConnectionState('failed');
        setConnectionStatus('failed');
      }
    };
    
    setupRTMPIngest();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      onConnectionState('disconnected');
      setConnectionStatus('disconnected');
    };
  }, [config.ingestUrl, config.streamKey]);
  
  // RTMP playback for receiving virtual cam feed
  useEffect(() => {
    if (!config.receiveUrl || !videoRef.current) return;
    
    const setupRTMPPlayback = () => {
      try {
        // In a real implementation, you would:
        // 1. Use a video player that supports RTMP (like hls.js with RTMP-to-HLS conversion)
        // 2. Or use a WebSocket to receive video frames
        
        // For now, we'll create a mock MediaStream for demonstration
        const mockStream = new MediaStream();
        onRemoteStream(mockStream);
        
        console.log('RTMP playback configured:', config.receiveUrl);
        
      } catch (error) {
        console.error('Error setting up RTMP playback:', error);
      }
    };
    
    setupRTMPPlayback();
    
    return () => {
      onRemoteStream(null);
    };
  }, [config.receiveUrl]);
  
  // Copy RTMP configuration to clipboard
  const copyRTMPConfig = () => {
    const configText = `RTMP Ingest URL: ${config.ingestUrl}\nStream Key: ${config.streamKey}\nRTMP Receive URL: ${config.receiveUrl}`;
    navigator.clipboard.writeText(configText);
    alert('RTMP configuration copied to clipboard');
  };
  
  return (
    <div className="hidden">
      {/* Hidden video element for local stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
      
      {/* Connection status display */}
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}></div>
          <span className="font-mono">
            RTMP: {connectionStatus.toUpperCase()}
          </span>
        </div>
        <div className="mt-2 text-[10px] text-gray-400">
          <div>Ingest: {config.ingestUrl.split('/').pop()}</div>
          <div>Receive: {config.receiveUrl.split('/').pop()}</div>
        </div>
        <button
          onClick={copyRTMPConfig}
          className="mt-2 text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
        >
          Copy Config
        </button>
      </div>
    </div>
  );
}