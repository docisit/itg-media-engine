'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCConfig } from '../types/webrtc-types';

interface WebRTCConnectionProps {
  config: WebRTCConfig;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionState?: (state: string) => void;
  onLocalStream?: (stream: MediaStream) => void;
}

export default function WebRTCConnectionWHIP({ 
  config, 
  onRemoteStream, 
  onConnectionState,
  onLocalStream 
}: WebRTCConnectionProps) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);

  const updateConnectionState = useCallback((state: string) => {
    console.log('WHIP State:', state);
    if (onConnectionState) onConnectionState(state);
  }, [onConnectionState]);

  const startWHIPConnection = async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    updateConnectionState('connecting');

    try {
      // 1. Get user media (Optimized for Portrait Streaming)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1080 }, // Portrait Width
          height: { ideal: 1920 }, // Portrait Height
          aspectRatio: 9/16,
          facingMode: 'user'
        },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      localStreamRef.current = stream;
      if (onLocalStream) onLocalStream(stream);

      // 2. Setup Peer Connection
      const pc = new RTCPeerConnection({ 
        iceServers: config.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
        iceCandidatePoolSize: 0 
      });
      peerRef.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 3. Create and set Local Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4. POST the SDP to your Next.js WHIP API
      updateConnectionState('sending-offer');
      const response = await fetch('/api/whip', {
        method: 'POST',
        body: pc.localDescription?.sdp,
        headers: { 
          'Content-Type': 'application/sdp',
          'x-room-id': config.roomId 
        }
      });

      if (!response.ok) throw new Error('WHIP Server rejected offer');

      // 5. Set the Remote Answer from OBS/Server
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      updateConnectionState('connected');

    } catch (error) {
      console.error('WHIP Connection Error:', error);
      updateConnectionState('error');
      isConnectingRef.current = false;
    }
  };

  const cleanup = useCallback(() => {
    if (peerRef.current) peerRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    isConnectingRef.current = false;
    updateConnectionState('disconnected');
  }, [updateConnectionState]);

  useEffect(() => {
    startWHIPConnection();
    return cleanup;
  }, [config.roomId]); // Re-run only if room changes

  return null;
}