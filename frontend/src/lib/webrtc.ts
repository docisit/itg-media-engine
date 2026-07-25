/**
 * WebRTC utility functions for guest interviews
 */

export interface ICE_SERVER {
  urls: string;
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  iceServers: ICE_SERVER[];
  iceCandidatePoolSize?: number;
}

export interface Participant {
  id: string;
  displayName: string;
  role: 'host' | 'guest' | 'viewer';
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  isConnected: boolean;
}

export interface SignalMessage {
  type: 'signal' | 'join' | 'leave' | 'chat' | 'control' | 'connection_established' | 'participant_joined' | 'participant_left' | 'participant_info' | 'control_update';
  [key: string]: any;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomId: string;
  private participantId: string;
  private config: WebRTCConfig;
  
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onConnectionState: ((state: string) => void) | null = null;
  private onParticipants: ((participants: Participant[]) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  
  constructor(roomId: string, participantId: string, config: WebRTCConfig) {
    this.roomId = roomId;
    this.participantId = participantId;
    this.config = config;
  }
  
  // Event handlers
  setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStream = callback;
  }
  
  setOnConnectionState(callback: (state: string) => void) {
    this.onConnectionState = callback;
  }
  
  setOnParticipants(callback: (participants: Participant[]) => void) {
    this.onParticipants = callback;
  }
  
  setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }
  
  // Initialize WebRTC connection
  async initialize(wsUrl: string, displayName: string, role: 'host' | 'guest' = 'guest') {
    try {
      // Initialize WebSocket connection
      await this.initializeWebSocket(wsUrl, displayName, role);
      
      // Initialize PeerConnection
      this.pc = new RTCPeerConnection(this.config);
      
      // Set up event handlers for PeerConnection
      this.setupPeerConnectionHandlers();
      
      // Get local media (for host or if guest wants to share)
      if (role === 'host') {
        await this.getLocalMedia();
      }
      
      return true;
    } catch (error) {
      this.handleError(`Failed to initialize WebRTC: ${error}`);
      return false;
    }
  }
  
  // Initialize WebSocket connection
  private async initializeWebSocket(wsUrl: string, displayName: string, role: 'host' | 'guest') {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Send join message
        this.sendMessage({
          type: 'join',
          display_name: displayName,
          role: role,
          has_audio: true,
          has_video: true
        });
        
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };
      
      this.ws.onerror = (error) => {
        this.handleError(`WebSocket error: ${error}`);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.onConnectionState?.('disconnected');
      };
    });
  }
  
  // Set up PeerConnection event handlers
  private setupPeerConnectionHandlers() {
    if (!this.pc) return;
    
    // Handle incoming tracks (remote stream)
    this.pc.ontrack = (event) => {
      console.log('Received remote track');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream);
      }
    };
    
    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'signal',
          signal_type: 'candidate',
          target: 'host', // Send to host
          payload: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      console.log(`Connection state: ${state}`);
      this.onConnectionState?.(state || 'unknown');
    };
    
    // Handle ICE connection state
    this.pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state: ${this.pc?.iceConnectionState}`);
    };
  }
  
  // Get local media (camera and microphone)
  async getLocalMedia(constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add tracks to PeerConnection
      if (this.pc) {
        this.localStream.getTracks().forEach(track => {
          this.pc?.addTrack(track, this.localStream!);
        });
      }
      
      return this.localStream;
    } catch (error) {
      this.handleError(`Failed to get local media: ${error}`);
      throw error;
    }
  }
  
  // Create and send offer (host initiates connection)
  async createOffer(targetParticipantId: string) {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      this.sendMessage({
        type: 'signal',
        signal_type: 'offer',
        target: targetParticipantId,
        payload: offer
      });
      
      return offer;
    } catch (error) {
      this.handleError(`Failed to create offer: ${error}`);
      throw error;
    }
  }
  
  // Handle incoming offer (guest receives offer)
  async handleOffer(offer: RTCSessionDescriptionInit, senderId: string) {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      this.sendMessage({
        type: 'signal',
        signal_type: 'answer',
        target: senderId,
        payload: answer
      });
    } catch (error) {
      this.handleError(`Failed to handle offer: ${error}`);
      throw error;
    }
  }
  
  // Handle incoming answer
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      this.handleError(`Failed to handle answer: ${error}`);
      throw error;
    }
  }
  
  // Handle ICE candidate
  async handleCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      this.handleError(`Failed to handle ICE candidate: ${error}`);
      throw error;
    }
  }
  
  // Handle WebSocket messages
  private handleWebSocketMessage(message: SignalMessage) {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'connection_established':
        console.log('Connection established:', message);
        this.onConnectionState?.('connected');
        break;
        
      case 'signal':
        this.handleSignalMessage(message);
        break;
        
      case 'participant_joined':
        console.log('Participant joined:', message);
        break;
        
      case 'participant_left':
        console.log('Participant left:', message);
        break;
        
      case 'participant_info':
        console.log('Participant info:', message);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  // Handle signaling messages
  private handleSignalMessage(message: any) {
    const { signal_type, sender, payload } = message;
    
    switch (signal_type) {
      case 'offer':
        this.handleOffer(payload, sender);
        break;
        
      case 'answer':
        this.handleAnswer(payload);
        break;
        
      case 'candidate':
        this.handleCandidate(payload);
        break;
        
      default:
        console.log('Unknown signal type:', signal_type);
    }
  }
  
  // Send message via WebSocket
  private sendMessage(message: SignalMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.handleError('WebSocket not connected');
    }
  }
  
  // Handle errors
  private handleError(error: string) {
    console.error('WebRTC error:', error);
    this.onError?.(error);
  }
  
  // Clean up resources
  disconnect() {
    // Send leave message
    this.sendMessage({
      type: 'leave',
      reason: 'user_disconnect'
    });
    
    // Close PeerConnection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    console.log('WebRTC disconnected');
  }
  
  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
  
  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  // Toggle audio
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      
      this.sendMessage({
        type: 'control',
        action: 'mute_audio',
        value: !enabled
      });
    }
  }
  
  // Toggle video
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      
      this.sendMessage({
        type: 'control',
        action: 'mute_video',
        value: !enabled
      });
    }
  }
}

// Utility function to get ICE servers from Django API
export async function getICEServers(): Promise<ICE_SERVER[]> {
  try {
    const response = await fetch('/api/webrtc/credentials/');
    const data = await response.json();
    return data.ice_servers || [];
  } catch (error) {
    console.error('Failed to get ICE servers:', error);
    // Fallback to public STUN servers
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }
}