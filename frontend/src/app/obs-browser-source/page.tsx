'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';

export const dynamic = 'force-dynamic';

interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
}

function OBSBrowserSourceSimpleContent() {
  const searchParams = useSearchParams();
  const roomName = searchParams.get('room') || 'Broadcast_Studio_A1';
  const participantName = searchParams.get('name') || 'OBS_Monitor';
  
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch LiveKit token from our simplified API
  useEffect(() => {
    const connectToLiveKit = async () => {
      setIsConnecting(true);
      setError(null);
      
      try {
        // Fetch connection details from Django backend endpoint
        const response = await fetch(
          `http://localhost:8001/api/webrtc/rooms/${encodeURIComponent(roomName)}/join_token/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identity: participantName,
              metadata: JSON.stringify({ role: 'observer' })
            })
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch token: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.token || !data.url) {
          throw new Error('Invalid response: Missing token or url');
        }
        
        // Convert Django response to expected format
        const connectionDetails: ConnectionDetails = {
          serverUrl: data.url,
          roomName: data.room_name,
          participantToken: data.token,
          participantName: participantName
        };

        // Configure ICE servers (TURN for firewall traversal)
        const iceServers: RTCIceServer[] = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ];
        
        // Add TURN server if credentials are available
        // Note: For production, you should fetch TURN credentials securely
        const turnServer = process.env.NEXT_PUBLIC_TURN_SERVER;
        const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
        const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
        
        if (turnServer && turnUsername && turnCredential) {
          iceServers.push({
            urls: `turn:${turnServer}:3478?transport=udp`,
            username: turnUsername,
            credential: turnCredential
          });
          iceServers.push({
            urls: `turn:${turnServer}:3478?transport=tcp`,
            username: turnUsername,
            credential: turnCredential
          });
        }
        
        // Connect to LiveKit room
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720 }
          }
        });
        
        // Configure RTCConfiguration
        const rtcConfig: RTCConfiguration = {
          iceServers,
          iceTransportPolicy: 'all', // Try relay if direct connection fails
          iceCandidatePoolSize: 10
        };
        
        // Set up event listeners
        room
          .on(RoomEvent.Connected, () => {
            console.log('OBS Browser Source connected to LiveKit');
            setIsConnected(true);
            setRoom(room);
          })
          .on(RoomEvent.Disconnected, () => {
            console.log('OBS Browser Source disconnected from LiveKit');
            setIsConnected(false);
            setRoom(null);
          })
          .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log('Participant connected in OBS:', participant.identity);
            setRemoteParticipants(prev => [...prev, participant]);
            
            // Subscribe to participant's tracks
            participant.trackPublications.forEach((publication, trackSid) => {
              if (publication.isSubscribed && publication.track) {
                if (publication.kind === 'video' && videoRef.current) {
                  const mediaStream = new MediaStream([publication.track.mediaStreamTrack]);
                  videoRef.current.srcObject = mediaStream;
                }
              }
            });
            
            // Listen for new track subscriptions
            participant.on('trackSubscribed', (track, publication) => {
              if (track.kind === 'video' && videoRef.current) {
                const videoTrack = track.mediaStreamTrack;
                if (videoTrack) {
                  const mediaStream = new MediaStream([videoTrack]);
                  videoRef.current.srcObject = mediaStream;
                }
              }
            });
          })
          .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log('Participant disconnected in OBS:', participant.identity);
            setRemoteParticipants(prev => prev.filter(p => p !== participant));
            // Keep showing the last video or clear if no participants
            if (remoteParticipants.length <= 1 && videoRef.current) {
              videoRef.current.srcObject = null;
            }
          });
        
        // Connect with custom RTC configuration
        await room.connect(data.serverUrl, data.participantToken, {
          autoSubscribe: true,
          rtcConfig
        });
        
        setRoom(room);
        
      } catch (err) {
        console.error('Error connecting to LiveKit:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsConnecting(false);
      }
    };
    
    connectToLiveKit();
    
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [roomName, participantName]);
  
  // Handle fullscreen
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };
  
  return (
    <div className="obs-browser-source">
      <style jsx>{`
        .obs-browser-source {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #000 !important;
        }
        
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background-color: #000;
        }
        
        .status-overlay {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .status-dot.connected {
          background: #00ff00;
          animation: pulse 2s infinite;
        }
        
        .status-dot.disconnected {
          background: #ff0000;
        }
        
        .participant-count {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          z-index: 100;
        }
        
        .fullscreen-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          z-index: 100;
          transition: all 0.2s ease;
        }
        
        .fullscreen-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          border-color: rgba(255, 255, 255, 0.6);
        }
        
        .error-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
          text-align: center;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 200;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #00ffff;
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="obs-video"
      />
      
      {/* Status overlay */}
      <div className="status-overlay">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span>{isConnected ? 'LIVE' : isConnecting ? 'CONNECTING' : 'DISCONNECTED'}</span>
      </div>
      
      {/* Participant count */}
      <div className="participant-count">
        Guests: {remoteParticipants.length}
      </div>
      
      {/* Fullscreen button */}
      <button className="fullscreen-btn" onClick={handleFullscreen}>
        ⛶ Fullscreen
      </button>
      
      {/* Loading overlay */}
      {isConnecting && !error && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div>Connecting to LiveKit...</div>
          <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
            Room: {roomName} | Name: {participantName}
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="error-overlay">
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Connection Error</div>
          <div style={{ fontSize: '12px', marginBottom: '16px', opacity: 0.8 }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
}

export default function OBSBrowserSourceSimplePage() {
  return (
    <Suspense fallback={
      <div className="obs-browser-source">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div>Loading OBS Browser Source...</div>
        </div>
      </div>
    }>
      <OBSBrowserSourceSimpleContent />
    </Suspense>
  );
}