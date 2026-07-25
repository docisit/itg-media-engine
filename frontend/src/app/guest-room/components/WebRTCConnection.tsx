'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCConfig } from '../types/webrtc-types';

interface WebRTCConnectionProps {
  config: WebRTCConfig;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionState?: (state: string) => void;
  onLocalStream?: (stream: MediaStream) => void;
}

// Professional WebRTC connection with proper signaling
export default function WebRTCConnection({ 
  config, 
  onRemoteStream, 
  onConnectionState,
  onLocalStream 
}: WebRTCConnectionProps) {
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);
  const signalingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const participantIdRef = useRef<string | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Update connection state and notify parent
  const updateConnectionState = useCallback((state: string) => {
    setConnectionState(state);
    if (onConnectionState) {
      onConnectionState(state);
    }
  }, [onConnectionState]);

  // Connect to signaling API
  const connectToSignalingAPI = async () => {
    try {
      const response = await fetch(`/api/ws/webrtc/${config.roomId}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: config.label || config.username }),
      });

      if (!response.ok) throw new Error('Failed to register as guest');
      
      const data = await response.json();
      participantIdRef.current = data.participant_id;
      console.log('Registered as guest:', data.participant_id);
      updateConnectionState('registered');
      
      return data.participant_id;
    } catch (error) {
      console.error('Error connecting to signaling API:', error);
      throw error;
    }
  };

  // Poll for host connection
  const pollForHost = async (participantId: string) => {
    try {
      const response = await fetch(`/api/ws/webrtc/${config.roomId}/guest`);
      const data = await response.json();
      
      if (data.room_status.has_host) {
        console.log('Host found, starting WebRTC connection');
        await startWebRTCConnection(participantId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error polling for host:', error);
      return false;
    }
  };

  // Poll for WebRTC answers and ICE candidates
  const pollForSignals = async (participantId: string) => {
    if (!peerRef.current) return;
    
    try {
      // Poll for any pending signals (answers or candidates)
      const response = await fetch(`/api/ws/webrtc/${config.roomId}/guest?participant_id=${participantId}&signals=true`);
      if (!response.ok) return;
      
      const data = await response.json();
      
      if (data.signals && Array.isArray(data.signals)) {
        for (const signal of data.signals) {
          await handleIncomingSignal(signal);
        }
      }
    } catch (error) {
      console.error('Error polling for signals:', error);
    }
  };

  // Handle incoming WebRTC signals (answers and ICE candidates)
  const handleIncomingSignal = async (signal: any) => {
    if (!peerRef.current) return;
    
    try {
      if (signal.signal_type === 'answer') {
        console.log('Received WebRTC answer from host');
        const answer = new RTCSessionDescription(signal.payload);
        await peerRef.current.setRemoteDescription(answer);
        updateConnectionState('answer-received');
        
      } else if (signal.signal_type === 'candidate') {
        console.log('Received ICE candidate from host');
        const candidate = new RTCIceCandidate(signal.payload);
        await peerRef.current.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling incoming signal:', error);
    }
  };

  // Start WebRTC connection with proper signaling
  const startWebRTCConnection = async (participantId: string) => {
    try {
      updateConnectionState('connecting');
      
      // Get user media with mobile-friendly constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          frameRate: { ideal: 30, min: 15, max: 60 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2
        }
      });

      localStreamRef.current = stream;
      audioTrackRef.current = stream.getAudioTracks()[0];
      videoTrackRef.current = stream.getVideoTracks()[0];
      
      // Notify parent about local stream for preview
      if (onLocalStream) {
        onLocalStream(stream);
      }

      // Use configured ICE servers
      const iceServers: RTCIceServer[] = config.iceServers || [
        {
          urls: config.turnServer,
          username: config.turnUsername,
          credential: config.turnCredential
        },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      // Create RTCPeerConnection with mobile optimization
      const peer = new RTCPeerConnection({ 
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      peerRef.current = peer;

      // Add local tracks to connection
      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
      });

      // Handle incoming remote stream
      peer.ontrack = (event) => {
        console.log('Received remote stream from host');
        if (onRemoteStream) {
          onRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      peer.onicecandidate = (event) => {
        if (event.candidate && participantIdRef.current) {
          fetch(`/api/ws/webrtc/${config.roomId}/guest`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participant_id: participantIdRef.current,
              target_role: 'host',
              signal_type: 'candidate',
              payload: event.candidate
            }),
          }).catch(err => console.error('Error sending ICE candidate:', err));
        }
      };

      // Handle connection state changes
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log('Peer connection state:', state);
        updateConnectionState(state);
        
        if (state === 'connected') {
          console.log('WebRTC fully connected to host');
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          console.log('WebRTC connection lost, attempting reconnection...');
          setTimeout(() => {
            if (!isConnectingRef.current) {
              initializeConnection();
            }
          }, 3000);
        }
      };

      // Handle ICE connection state
      peer.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peer.iceConnectionState);
      };

      // Create and send offer
      try {
        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await peer.setLocalDescription(offer);
        
        // Send offer to host
        await fetch(`/api/ws/webrtc/${config.roomId}/guest`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_id: participantId,
            target_role: 'host',
            signal_type: 'offer',
            payload: offer
          }),
        });
        
        console.log('WebRTC offer sent to host');
        updateConnectionState('offer-sent');
        
        // Start polling for answers and candidates
        signalingIntervalRef.current = setInterval(() => {
          pollForSignals(participantId);
        }, 1000);
        
      } catch (error) {
        console.error('Error creating/sending offer:', error);
        updateConnectionState('error');
        isConnectingRef.current = false;
      }

    } catch (error) {
      console.error('Error starting WebRTC connection:', error);
      updateConnectionState('error');
      isConnectingRef.current = false;
    }
  };

  // Control audio track
  const toggleAudio = (enabled: boolean) => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = enabled;
      console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  // Control video track
  const toggleVideo = (enabled: boolean) => {
    if (videoTrackRef.current) {
      videoTrackRef.current.enabled = enabled;
      console.log(`Video ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  // Switch camera (front/back on mobile)
  const switchCamera = async () => {
    if (!localStreamRef.current) return;
    
    try {
      const currentTrack = videoTrackRef.current;
      if (!currentTrack) return;
      
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          frameRate: { ideal: 30, min: 15, max: 60 },
          facingMode: currentTrack.getSettings().facingMode === 'user' ? 'environment' : 'user'
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace the video track in the local stream
      if (localStreamRef.current && peerRef.current) {
        const sender = peerRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
        
        // Stop old track
        currentTrack.stop();
        videoTrackRef.current = newVideoTrack;
        
        // Update local stream
        localStreamRef.current.removeTrack(currentTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        
        console.log('Camera switched to:', newVideoTrack.getSettings().facingMode);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  // Main initialization
  const initializeConnection = async () => {
    if (!config || isConnectingRef.current) return;
    
    isConnectingRef.current = true;
    updateConnectionState('initializing');

    try {
      // Register with signaling API
      const participantId = await connectToSignalingAPI();
      
      // Poll for host connection
      const hostFound = await pollForHost(participantId);
      
      if (hostFound) {
        // Host found, connection started in pollForHost
      } else {
        // Keep polling for host
        signalingIntervalRef.current = setInterval(async () => {
          const found = await pollForHost(participantId);
          if (found && signalingIntervalRef.current) {
            clearInterval(signalingIntervalRef.current);
          }
        }, 3000);
      }
      
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      updateConnectionState('error');
      isConnectingRef.current = false;
      
      // Retry after delay
      setTimeout(() => {
        if (!isConnectingRef.current) {
          initializeConnection();
        }
      }, 5000);
    }
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (signalingIntervalRef.current) {
      clearInterval(signalingIntervalRef.current);
      signalingIntervalRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Unregister participant
    if (participantIdRef.current) {
      fetch(`/api/ws/webrtc/${config.roomId}/guest?participant_id=${participantIdRef.current}`, {
        method: 'DELETE',
      }).catch(err => console.error('Error unregistering:', err));
    }
    
    isConnectingRef.current = false;
    updateConnectionState('disconnected');
  }, [config.roomId]);

  useEffect(() => {
    initializeConnection();
    return cleanup;
  }, [config]);

  // This component doesn't render anything visible
  return null;
}
