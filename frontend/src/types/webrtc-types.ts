// WebRTC TypeScript definitions for guest room dashboard

export interface MediaDevice {
  deviceId: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  label: string;
  groupId: string;
}

export interface ConnectionQuality {
  latency: number; // ms
  packetLoss: number; // percentage
  bandwidth: number; // Mbps
  jitter: number; // ms
  connectionType: 'direct' | 'relay' | 'unknown';
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage?: string;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  peerConnectionState: RTCPeerConnectionState;
}

export interface WebRTCConfig {
  roomId: string;           // Required
  guestId: string;          // Required
  iceServers: RTCIceServer[]; // Required (Crucial for Port 443)
  
  // These are now OPTIONAL (Added '?') to stop the build errors
  roomPassword?: string;
  turnServer?: string;
  turnUsername?: string;
  turnCredential?: string;
  username?: string;
  label?: string;
  wsUrl?: string;
  token?: string; 
}

export interface StreamingPlatform {
  id: number;
  name: string;
  platform_type: 'youtube' | 'facebook' | 'tiktok' | 'owncast' | 'custom';
  is_active: boolean;
  is_enabled: boolean;
  test_status: boolean;
}

export interface StreamingStatus {
  status: string;
  platforms: StreamingPlatform[];
  current_session: {
    session_id: string;
    started_at: string;
    duration: number;
    viewer_count: number;
    bitrate: number;
    platform_count: number;
  } | null;
  total_platforms: number;
  active_platforms: number;
  timestamp: string;
}

export interface GuestRoomState {
  // Media state
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
  
  // Connection state
  connectionStatus: ConnectionStatus;
  connectionQuality: ConnectionQuality;
  
  // Room state
  webrtcConfig: WebRTCConfig | null;
  isInRoom: boolean;
  joinedAt: Date | null;
  
  // UI state
  isSettingsOpen: boolean;
  isDeviceSelectorOpen: boolean;
}

export interface WebRTCSignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'join' | 'leave' | 'error';
  data: unknown;
  sender: string;
  timestamp: number;
}

export interface DevicePermissions {
  hasCameraPermission: boolean;
  hasMicrophonePermission: boolean;
  cameraPermissionError?: string;
  microphonePermissionError?: string;
}

export interface ConnectionMetrics {
  timestamp: number;
  quality: ConnectionQuality;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
}

// Event types for the WebRTC connection
export type WebRTCEvent =
  | { type: 'CONNECTION_STATE_CHANGE'; payload: ConnectionStatus }
  | { type: 'QUALITY_UPDATE'; payload: ConnectionQuality }
  | { type: 'MEDIA_STREAM_READY'; payload: MediaStream }
  | { type: 'ERROR'; payload: string }
  | { type: 'ICE_CANDIDATE'; payload: RTCIceCandidate }
  | { type: 'SIGNALING_MESSAGE'; payload: WebRTCSignalingMessage }
  | { type: 'DEVICE_LIST_UPDATE'; payload: MediaDevice[] }
  | { type: 'PERMISSIONS_UPDATE'; payload: DevicePermissions }
  | { type: 'METRICS_UPDATE'; payload: ConnectionMetrics };

// Hook return types
export interface UseWebRTCReturn {
  // State
  state: GuestRoomState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Actions
  connect: (config: WebRTCConfig) => Promise<void>;
  disconnect: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  selectAudioDevice: (deviceId: string) => void;
  selectVideoDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  
  // Status
  isLoading: boolean;
  error: string | null;
}

export interface UseMediaDevicesReturn {
  devices: MediaDevice[];
  audioInputs: MediaDevice[];
  videoInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  selectedAudioInput: string | null;
  selectedVideoInput: string | null;
  selectedAudioOutput: string | null;
  permissions: DevicePermissions;
  
  setAudioInput: (deviceId: string) => void;
  setVideoInput: (deviceId: string) => void;
  setAudioOutput: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  requestPermissions: () => Promise<DevicePermissions>;
}

export interface UseConnectionQualityReturn {
  quality: ConnectionQuality;
  metrics: ConnectionMetrics[];
  history: ConnectionMetrics[];
  startMonitoring: (peerConnection: RTCPeerConnection) => void;
  stopMonitoring: () => void;
  getQualityLevel: () => 'excellent' | 'good' | 'fair' | 'poor' | 'unstable';
}