//guest-room/component/LiveKitConnection.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';

interface LiveKitConnectionProps {
  config: {
    roomId: string;
    guestName: string;
    token: string;
    serverUrl: string;
    iceServers?: RTCIceServer[];  // Add ICE servers support
  };
  onConnectionState: (state: string) => void;
  onRemoteStream?: (stream: MediaStream | null) => void;
  portraitMode?: boolean;
}

export default function LiveKitConnection({ config, onConnectionState, onRemoteStream, portraitMode = true }: LiveKitConnectionProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Connect to LiveKit room
  useEffect(() => {
    if (!config.token || !config.serverUrl) return;
    
    const connectToRoom = async () => {
      try {
        onConnectionState('connecting');
        
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: portraitMode ? { width: 720, height: 1280 } : { width: 1280, height: 720 }
          },
          // Pass ICE servers if provided
          ...(config.iceServers && { iceServers: config.iceServers })
        });
		
        
        // Set up event listeners
        room
          .on(RoomEvent.Connected, () => {
            console.log('Connected to LiveKit room');
            setIsConnected(true);
            onConnectionState('connected');
            setRoom(room);

            // AUTO-PIN the Director/OBS feed immediately upon connection
            const director = Array.from(room.remoteParticipants.values()).find(p => 
              p.identity.toLowerCase().includes('director') || 
              p.identity.toLowerCase().includes('host')
            );

            if (director) {
              const publication = director.getTrackPublication('camera' as any);
              if (publication?.track) {
                const mediaStream = new MediaStream([publication.track.mediaStreamTrack!]);
                if (onRemoteStream) onRemoteStream(mediaStream);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = mediaStream;
              }
            }
          })
          .on(RoomEvent.Disconnected, () => {
            console.log('Disconnected from LiveKit room');
            setIsConnected(false);
            onConnectionState('disconnected');
            setRoom(null);
          })
          .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log('Participant connected:', participant.identity);
            setRemoteParticipants(prev => [...prev, participant]);
            
            // Listen for track subscriptions
            participant.on('trackSubscribed', (track) => {
              if (track.kind === 'video') {
                const mediaStream = new MediaStream([track.mediaStreamTrack!]);
                if (onRemoteStream) onRemoteStream(mediaStream);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = mediaStream;
              }
            });
          })
          .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log('Participant disconnected:', participant.identity);
            setRemoteParticipants(prev => prev.filter(p => p !== participant));
            if (onRemoteStream) {
              onRemoteStream(null);
            }
          })
          .on(RoomEvent.LocalTrackPublished, (publication, participant) => {
            console.log('Local track published:', publication.kind);
          })
          .on(RoomEvent.TrackMuted, (publication, participant) => {
            console.log('Track muted:', publication.kind);
          })
          .on(RoomEvent.TrackUnmuted, (publication, participant) => {
            console.log('Track unmuted:', publication.kind);
          });
        
        // Connect to the room
        // 1. Connect to the room (This was already there)
		await room.connect(config.serverUrl, config.token, {
		  autoSubscribe: true,
		});

		// 2. NEW: Hook participants who were ALREADY in the room (like OBS)
		room.remoteParticipants.forEach((participant) => {
		  console.log('Existing participant found:', participant.identity);
		  
		  // Look at their existing tracks
		  participant.trackPublications.forEach((publication) => {
			if (publication.track && publication.kind === 'video') {
			  const mediaStream = new MediaStream([publication.track.mediaStreamTrack!]);
			  if (onRemoteStream) onRemoteStream(mediaStream);
			  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = mediaStream;
			}
		  });

		  // Also set up the listener for their FUTURE tracks
		  participant.on('trackSubscribed', (track) => {
			if (track.kind === 'video') {
			  const mediaStream = new MediaStream([track.mediaStreamTrack!]);
			  if (onRemoteStream) onRemoteStream(mediaStream);
			  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = mediaStream;
			}
		  });
		});

        
        // Get local media and publish
        try {
          const localMedia = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: portraitMode ? 720 : 1280 },
              height: { ideal: portraitMode ? 1280 : 720 },
              frameRate: { ideal: 30 },
              facingMode: 'user'
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          
          // Publish local tracks
          // Publish video track
          const videoTrack = localMedia.getVideoTracks()[0];
          if (videoTrack) {
            await room.localParticipant.publishTrack(videoTrack, { source: 0 as any });
          }
          
          // Publish audio track
          const audioTrack = localMedia.getAudioTracks()[0];
          if (audioTrack) {
            await room.localParticipant.publishTrack(audioTrack, { source: 0 as any });
          }
          
          // Set up local video preview
          if (videoRef.current) {
            videoRef.current.srcObject = localMedia;
          }
          
        } catch (mediaError) {
          console.error('Error accessing media devices:', mediaError);
        }
        
      } catch (error) {
        console.error('Error connecting to LiveKit:', error);
        onConnectionState('failed');
      }
    };
    
    connectToRoom();
    
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [config.token, config.serverUrl]);
  
  // Handle fullscreen for remote video
  const handleFullscreen = () => {
    if (remoteVideoRef.current) {
      if (!document.fullscreenElement) {
        remoteVideoRef.current.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };
  
  return (
    <div className="livekit-connection">
      {/* Hidden video elements */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />
      
      <video
		ref={remoteVideoRef}
		  autoPlay
		  playsInline
		  muted  // <--- Add this! (Athletes can unmute once it loads)
		  className={`${portraitMode ? 'portrait-video' : 'landscape-video'} remote-video`}
		  style={{
			width: '100%',
			height: '100%',
			objectFit: 'cover',
			backgroundColor: '#000'
		  }}
		/>

      
      {/* Floating controls */}
      {isConnected && remoteVideoRef.current && (
        <div className="floating-controls">
          <button
            onClick={handleFullscreen}
            className="control-btn fullscreen-btn"
            title="Toggle fullscreen"
          >
            ⛶
          </button>
          
          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span className="status-text">
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .livekit-connection {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .portrait-video {
          aspect-ratio: 9/16;
          max-width: 100%;
          max-height: 100vh;
        }
        
        .landscape-video {
          aspect-ratio: 16/9;
          max-width: 100%;
          max-height: 100vh;
        }
        
        .floating-controls {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 100;
        }
        
        .control-btn {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s ease;
        }
        
        .control-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          border-color: rgba(255, 255, 255, 0.6);
          transform: scale(1.1);
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.7);
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: bold;
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
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .hidden {
          display: none;
        }
      `}</style>
    </div>
  );
}