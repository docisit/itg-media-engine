'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCConfig, GuestRoomState, ConnectionStatus } from '../types/webrtc-types';
import { createWebRTCConfig, getMediaConstraints } from '../utils/webrtc-helpers';

export function useWebRTC() {
  const [state, setState] = useState<GuestRoomState>({
    isAudioMuted: false,
    isVideoEnabled: true,
    selectedAudioDevice: null,
    selectedVideoDevice: null,
    connectionStatus: {
      isConnected: false,
      isConnecting: false,
      hasError: false,
      iceConnectionState: 'new',
      signalingState: 'stable',
      peerConnectionState: 'new'
    },
    connectionQuality: {
      latency: 0,
      packetLoss: 0,
      bandwidth: 0,
      jitter: 0,
      connectionType: 'unknown'
    },
    webrtcConfig: null,
    isInRoom: false,
    joinedAt: null,
    isSettingsOpen: false,
    isDeviceSelectorOpen: false
  });

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentConfigRef = useRef<WebRTCConfig | null>(null);
  const isConnectingRef = useRef(false);

  const updateConnectionStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setState(prev => ({
      ...prev,
      connectionStatus: {
        ...prev.connectionStatus,
        ...updates
      }
    }));
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    
    updateConnectionStatus({
      isConnected: false,
      isConnecting: false,
      hasError: false,
      iceConnectionState: 'closed'
    });
    
    setState(prev => ({
      ...prev,
      isInRoom: false,
      joinedAt: null
    }));
  }, [updateConnectionStatus]);

  const connect = useCallback(async (config: WebRTCConfig) => {
    if (isConnectingRef.current) return;
    
    try {
      isConnectingRef.current = true;
      updateConnectionStatus({
        isConnecting: true,
        hasError: false,
        errorMessage: undefined
      });

      currentConfigRef.current = config;

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(true, !state.isAudioMuted)
      );
      
      localStreamRef.current = stream;

      // Create WebRTC configuration
      const rtcConfig = createWebRTCConfig(
        config.turnServer,
        config.turnUsername,
        config.turnCredential
      );

      // Create WebSocket connection to Django backend
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = config.wsUrl || `${wsProtocol}//${window.location.host}/ws/webrtc/${config.roomId}/${config.guestId}/`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected to Django backend');
        
        // Create RTCPeerConnection
        const peer = new RTCPeerConnection({ iceServers: rtcConfig.iceServers });
        peerRef.current = peer;

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          peer.addTrack(track, stream);
        });

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
          if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'candidate',
              candidate: event.candidate
            }));
          }
        };

        // Handle connection state changes
        peer.onconnectionstatechange = () => {
          console.log('Peer connection state:', peer.connectionState);
          updateConnectionStatus({
            iceConnectionState: peer.connectionState as RTCIceConnectionState,
            isConnected: peer.connectionState === 'connected',
            isConnecting: peer.connectionState === 'connecting'
          });
        };

        // Create and send offer
        peer.createOffer()
          .then(offer => {
            return peer.setLocalDescription(offer);
          })
          .then(() => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'offer',
                sdp: peer.localDescription
              }));
            }
          })
          .catch(error => {
            console.error('Error creating offer:', error);
            updateConnectionStatus({
              hasError: true,
              errorMessage: error.message
            });
          });
      };

      // Handle WebSocket messages
      socketRef.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);

          if (!peerRef.current) return;

          if (message.type === 'answer') {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(message.answer));
            updateConnectionStatus({
              isConnected: true,
              isConnecting: false,
              signalingState: 'stable'
            });
            
            setState(prev => ({
              ...prev,
              isInRoom: true,
              joinedAt: new Date(),
              webrtcConfig: config
            }));
          } else if (message.type === 'candidate') {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          updateConnectionStatus({
            hasError: true,
            errorMessage: error instanceof Error ? error.message : 'WebSocket message error'
          });
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus({
          hasError: true,
          errorMessage: 'WebSocket connection error'
        });
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket closed');
        updateConnectionStatus({
          isConnected: false,
          isConnecting: false,
          iceConnectionState: 'closed'
        });
        
        setState(prev => ({
          ...prev,
          isInRoom: false
        }));
        
        isConnectingRef.current = false;
        
        // Attempt reconnection after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isConnectingRef.current && currentConfigRef.current) {
            connect(currentConfigRef.current);
          }
        }, 5000);
      };

    } catch (error: unknown) {
      console.error('Failed to connect:', error);
      isConnectingRef.current = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to establish connection';
      updateConnectionStatus({
        hasError: true,
        errorMessage,
        isConnecting: false
      });
    }
  }, [state.isAudioMuted, updateConnectionStatus]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled;
        audioTracks[0].enabled = newState;
        
        setState(prev => ({
          ...prev,
          isAudioMuted: !newState
        }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !videoTracks[0].enabled;
        videoTracks[0].enabled = newState;
        
        setState(prev => ({
          ...prev,
          isVideoEnabled: newState
        }));
      }
    }
  }, []);

  const selectAudioDevice = useCallback(async (deviceId: string) => {
    // In a real implementation, this would switch audio tracks
    console.log('Switching to audio device:', deviceId);
    setState(prev => ({
      ...prev,
      selectedAudioDevice: deviceId
    }));
  }, []);

  const selectVideoDevice = useCallback(async (deviceId: string) => {
    // In a real implementation, this would switch video tracks
    console.log('Switching to video device:', deviceId);
    setState(prev => ({
      ...prev,
      selectedVideoDevice: deviceId
    }));
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);
    } catch (error) {
      console.error('Error refreshing devices:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    getLocalStream: () => localStreamRef.current,
    getRemoteStream: () => null,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    selectAudioDevice,
    selectVideoDevice,
    refreshDevices,
    isLoading: state.connectionStatus.isConnecting,
    error: state.connectionStatus.errorMessage
  };
}
