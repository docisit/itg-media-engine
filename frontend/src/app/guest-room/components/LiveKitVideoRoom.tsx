'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  LiveKitRoom, 
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  TrackReferenceOrPlaceholder,
  GridLayout,
  ParticipantTile,
  useToken
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import axios from 'axios';

interface LiveKitVideoRoomProps {
  roomName?: string;
  participantName?: string;
  isHost?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export default function LiveKitVideoRoom({
  roomName = 'Broadcast_Studio_A1',
  participantName = 'Guest',
  isHost = false,
  onConnected,
  onDisconnected,
  onError
}: LiveKitVideoRoomProps) {
  const [token, setToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [error, setError] = useState<string>('');

  // Fetch LiveKit token
  const fetchToken = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError('');
      
      if (isHost) {
        // Host gets token from authenticated endpoint
        const response = await axios.get('/api/livekit/token/');
        if (response.data.success) {
          setToken(response.data.token);
        } else {
          throw new Error(response.data.error || 'Failed to get host token');
        }
      } else {
        // Guest gets token from guest endpoint
        const response = await axios.post('/api/livekit/guest-token/', {
          participant_name: participantName
        });
        if (response.data.success) {
          setToken(response.data.token);
        } else {
          throw new Error(response.data.error || 'Failed to get guest token');
        }
      }
    } catch (err: any) {
      console.error('Error fetching LiveKit token:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to connect to video room';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [isHost, participantName, onError]);

  // Initial token fetch
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: any) => {
    console.log('LiveKit connection state:', state);
    setConnectionState(state);
    
    if (state === 'connected' && onConnected) {
      onConnected();
    } else if (state === 'disconnected' && onDisconnected) {
      onDisconnected();
    }
  }, [onConnected, onDisconnected]);

  // Handle connection error
  const handleConnectionError = useCallback((err: any) => {
    console.error('LiveKit connection error:', err);
    const errorMessage = err.message || 'Connection failed';
    setError(errorMessage);
    if (onError) onError(errorMessage);
  }, [onError]);

  // Get LiveKit URL from environment
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://vdo.yourdomain.com';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black rounded-xl p-8">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-red-400 mb-2">HOLD UP FAM! Connection Error</h3>
        <p className="text-zinc-400 text-center mb-6">{error}</p>
        <button
          onClick={fetchToken}
          className="bg-cyan-600 text-black px-6 py-3 rounded-lg font-bold hover:bg-cyan-400 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (isConnecting || !token) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black rounded-xl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-cyan-400 font-mono uppercase tracking-widest">
            {isConnecting ? 'Connecting to Video Room...' : 'Initializing...'}
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            Room: {roomName} • {isHost ? 'Host' : 'Guest'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        audio={isHost}  // Only host needs audio
        video={isHost}  // Only host needs video
        onConnected={() => handleConnectionStateChange('connected')}
        onDisconnected={() => handleConnectionStateChange('disconnected')}
        onError={handleConnectionError}
        options={{
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            videoCodec: 'vp8',
            videoEncoding: {
              maxBitrate: 2_500_000, // 2.5 Mbps for 1080p
              maxFramerate: 30,
            },
            // audioEncoding property removed - not supported in TrackPublishDefaults type
          },
        }}
      >
        {/* Custom video layout */}
        <div className="relative w-full h-full">
          {/* Connection status indicator */}
          <div className="absolute top-4 left-4 z-10">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-sm ${
              connectionState === 'connected' ? 'text-green-400' :
              connectionState === 'connecting' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                connectionState === 'connected' ? 'bg-green-500' :
                connectionState === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <span className="text-xs font-bold uppercase tracking-widest">
                {connectionState === 'connected' ? 'LIVE' :
                 connectionState === 'connecting' ? 'CONNECTING' :
                 'DISCONNECTED'}
              </span>
            </div>
          </div>

          {/* Room info */}
          <div className="absolute top-4 right-4 z-10">
            <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-sm text-zinc-300">
              <span className="text-xs font-bold uppercase tracking-widest">
                {roomName} • {isHost ? 'HOST' : 'GUEST'}
              </span>
            </div>
          </div>

          {/* Video grid */}
          <CustomVideoGrid isHost={isHost} />

          {/* Audio renderer */}
          <RoomAudioRenderer />

          {/* Control bar (only for host) */}
          {isHost && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <ControlBar 
                controls={{ 
                  microphone: true, 
                  camera: true, 
                  screenShare: false,
                  leave: false 
                }}
                variation='minimal'
              />
            </div>
          )}
        </div>
      </LiveKitRoom>
    </div>
  );
}

// Custom video grid component
function CustomVideoGrid({ isHost }: { isHost: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  // Filter tracks based on role
  const filteredTracks = tracks.filter((trackRef) => {
    // If host, show all tracks
    // If guest, only show host tracks (not guest's own camera)
    return isHost || trackRef.participant.identity.includes('host');
  });

  if (filteredTracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-4">📹</div>
          <p className="text-cyan-400 font-mono uppercase tracking-widest">
            Waiting for video feed...
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            {isHost ? 'Start your camera to begin broadcasting' : 'Waiting for host to start broadcast'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <GridLayout
      tracks={filteredTracks}
      className="h-full"
    >
      <ParticipantTile />
    </GridLayout>
  );
}