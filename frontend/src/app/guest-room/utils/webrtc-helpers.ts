// WebRTC utility functions for guest room

/**
 * Generate TURN credentials for vdo.ninja
 * In a real implementation, this would call your backend API
 */
export async function generateTurnCredentials(): Promise<{
  username: string;
  credential: string;
  ttl: number;
}> {
  // This is a placeholder - in production, you would call your backend
  // which would generate time-limited TURN credentials using your coturn secret
  const timestamp = Math.floor(Date.now() / 1000);
  const username = `${timestamp}:guest`;
  const credential = 'placeholder-credential'; // Should be HMAC hash in production
  
  return {
    username,
    credential,
    ttl: 86400 // 24 hours
  };
}

/**
 * Create WebRTC configuration with TURN servers
 */
export function createWebRTCConfig(
  turnServer?: string,
  turnUsername?: string,
  turnCredential?: string
): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:global.stun.twilio.com:3478'
    }
  ];

  // Add TURN server if all required parameters are provided
  if (turnServer && turnUsername && turnCredential) {
    iceServers.unshift({
      urls: turnServer,
      username: turnUsername,
      credential: turnCredential
    });
  }

  return {
    iceServers,
    iceTransportPolicy: 'all', // Use both STUN and TURN
    iceCandidatePoolSize: 10
  };
}

/**
 * Get media constraints for camera and microphone
 */
export function getMediaConstraints(
  videoEnabled: boolean = true,
  audioEnabled: boolean = true
): MediaStreamConstraints {
  return {
    video: videoEnabled ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
      facingMode: 'user'
    } : false,
    audio: audioEnabled ? {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 2
    } : false
  };
}

/**
 * Calculate connection quality metrics from WebRTC stats
 */
export async function getConnectionMetrics(
  peerConnection: RTCPeerConnection
): Promise<{
  latency: number;
  packetLoss: number;
  jitter: number;
  bandwidth: number;
}> {
  try {
    const stats = await peerConnection.getStats();
    let latency = 0;
    let packetLoss = 0;
    let jitter = 0;
    let bandwidth = 0;
    
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
      }
      
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        packetLoss = report.packetsLost && report.packetsReceived 
          ? (report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100 
          : 0;
        jitter = report.jitter ? report.jitter * 1000 : 0;
      }
      
      if (report.type === 'remote-inbound-rtp' && report.mediaType === 'video') {
        bandwidth = report.bytesReceived ? (report.bytesReceived * 8) / 1000000 : 0; // Mbps
      }
    });
    
    return {
      latency: Math.round(latency),
      packetLoss: parseFloat(packetLoss.toFixed(2)),
      jitter: Math.round(jitter),
      bandwidth: parseFloat(bandwidth.toFixed(2))
    };
  } catch (error) {
    console.error('Error getting connection metrics:', error);
    return {
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      bandwidth: 0
    };
  }
}

/**
 * Check browser WebRTC support
 */
export function checkWebRTCSupport(): {
  supported: boolean;
  features: {
    getUserMedia: boolean;
    RTCPeerConnection: boolean;
    RTCDataChannel: boolean;
    screenCapture: boolean;
  };
} {
  const navigator = window.navigator as any;
  
  return {
    supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    features: {
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      RTCPeerConnection: !!window.RTCPeerConnection,
      RTCDataChannel: !!window.RTCDataChannel,
      screenCapture: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
    }
  };
}

/**
 * Format connection quality for display
 */
export function formatQualityLevel(
  latency: number,
  packetLoss: number,
  bandwidth: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (latency < 50 && packetLoss < 1 && bandwidth > 2) return 'excellent';
  if (latency < 100 && packetLoss < 3 && bandwidth > 1) return 'good';
  if (latency < 200 && packetLoss < 5 && bandwidth > 0.5) return 'fair';
  return 'poor';
}

/**
 * Generate WebRTC connection URL for your system
 */
export function generateWebRTCUrl(
  roomId: string,
  guestId: string,
  username: string
): string {
  // This would be your WebRTC connection endpoint
  // In production, this would connect to your Django WebSocket
  return `wss://api.yourdomain.com/ws/webrtc/${roomId}/${guestId}/?username=${encodeURIComponent(username)}`;
}
