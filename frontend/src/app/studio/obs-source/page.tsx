'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveKitRoom, useTracks, useRoomContext } from '@livekit/components-react';
import { Track, RoomEvent, RemoteTrackPublication } from 'livekit-client';
import '@livekit/components-styles';

export const dynamic = 'force-dynamic';

// ✅ NEW: Individual video renderer component
function ParticipantVideo({ track, identity }: { track: Track; identity: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && track) {
      track.attach(videoRef.current);
      return () => {
        track.detach(videoRef.current!);
      };
    }
  }, [track]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '2px solid rgba(255, 255, 255, 0.2)'
    }}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
      
      {/* Participant name overlay */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        fontFamily: 'monospace'
      }}>
        {identity}
      </div>
    </div>
  );
}

// ✅ FIXED: Show ONLY guest video + guest audio (exclude WHIP ingress entirely)
// WHIP ingress = your OBS audio/video coming back - showing it creates a feedback loop
// Guest = remote participant connecting via Guest Room page
function OBSVideoDisplay({ excludeIdentity }: { excludeIdentity?: string }) {
  const room = useRoomContext();
  const videoTracks = useTracks([Track.Source.Camera]);
  
  // Filter to show ONLY remote guest participants (NOT WHIP ingress)
  // WHIP ingress is OBS's own video coming back - showing it creates a feedback loop
  // Only show actual guests who joined via the Guest Room page
  const remoteVideoTracks = videoTracks.filter(track => {
    const isLocalParticipant = track.participant.identity === room.localParticipant.identity;
    const isWhipIngress = track.participant.identity === 'whip_ingress_host';
    const isExcluded = excludeIdentity && track.participant.identity === excludeIdentity;
    return !isLocalParticipant && !isWhipIngress && !isExcluded;
  });

  // Show the first remote guest track (skip WHIP ingress to prevent video feedback loop)
  const guestTrack = remoteVideoTracks[0];

  // Guest audio ref for attaching tracks
  const guestAudioRef = useRef<HTMLAudioElement>(null);

  // === CRITICAL: Subscribe to ALL guest audio tracks via room events ===
  // Guest publishes audio tracks via publishTrack() without specifying a source,
  // so they arrive with source=Unknown — useTracks([Track.Source.Microphone]) misses them.
  // RoomAudioRenderer also only handles Microphone/ScreenShareAudio — misses Unknown.
  // So we listen to TrackPublished/TrackSubscribed events and filter for guest audio.
  useEffect(() => {
    if (!room || !guestAudioRef.current) return;

    const isGuestAudio = (pub: RemoteTrackPublication, participant: any) => {
      if (pub.kind !== 'audio') return false;
      const identity = participant.identity || '';
      // Exclude WHIP ingress (OBS's own audio coming back = feedback loop)
      // and exclude the local observer
      return identity !== 'whip_ingress_host' &&
             identity !== room.localParticipant.identity;
    };

    const onTrackPublished = (pub: RemoteTrackPublication, participant: any) => {
      if (!pub.track || !isGuestAudio(pub, participant)) return;
      if (guestAudioRef.current) {
        console.log('🎤 OBS-source: Attaching guest audio track:', pub.trackSid, 'source:', pub.source);
        pub.track.attach(guestAudioRef.current);
      }
    };

    const onTrackSubscribed = (track: any, pub: RemoteTrackPublication, participant: any) => {
      if (!isGuestAudio(pub, participant)) return;
      if (guestAudioRef.current) {
        console.log('🎤 OBS-source: Attaching subscribed guest audio track:', pub.trackSid, 'source:', pub.source);
        track.attach(guestAudioRef.current);
      }
    };

    // Also check for already-published tracks (guest may have joined before observer)
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.track && isGuestAudio(pub, participant) && guestAudioRef.current) {
          console.log('🎤 OBS-source: Attaching existing guest audio track:', pub.trackSid, 'source:', pub.source);
          pub.track.attach(guestAudioRef.current);
        }
      });
    });

    room.on(RoomEvent.TrackPublished, onTrackPublished);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed as any);

    return () => {
      room.off(RoomEvent.TrackPublished, onTrackPublished);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed as any);
      if (guestAudioRef.current) {
        // Detach all audio tracks from the element
        guestAudioRef.current.srcObject = null;
      }
    };
  }, [room, room.localParticipant.identity]);

  return (
    <>
      <style jsx>{`
        .obs-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #000;
        }
        
        .overlay {
          position: absolute;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          z-index: 100;
        }
        
        .status {
          top: 10px;
          left: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .participant-count {
          top: 10px;
          right: 10px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff00;
          animation: pulse 2s infinite;
        }
        
        .no-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="obs-container">
        {guestTrack ? (
          <>
            {/* Live indicator */}
            <div className="overlay status">
              <div className="status-dot"></div>
              <span>LIVE</span>
            </div>
            
            {/* Guest info overlay */}
            <div className="overlay participant-count">
              Guest: {guestTrack.participant.identity}
            </div>
            
            {/* ✅ Single guest video (full screen) */}
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ParticipantVideo
                key={guestTrack.participant.identity}
                track={guestTrack.publication.track!}
                identity={guestTrack.participant.identity}
              />
            </div>
          </>
        ) : (
          <div className="no-video">
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👋</div>
            <div>Waiting for guest...</div>
            <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.6 }}>
              Room: {room.name}
            </div>
          </div>
        )}
        
        {/* Hidden audio element for guest audio only (excludes WHIP ingress echo) */}
        <audio ref={guestAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      </div>
    </>
  );
}

function OBSBrowserSourceContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'Broadcast_Studio_A1';
  const excludeGuest = searchParams.get('exclude');
  
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchToken();
  }, [roomId]);

  async function fetchToken() {
    try {
      const response = await fetch(
        `/api/connection-details?roomName=${roomId}&participantName=OBS_Monitor&role=observer`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch token');
      
      const data = await response.json();
      
      if (data.participantToken && data.serverUrl) {
        setToken(data.participantToken);
        setServerUrl(data.serverUrl);
      } else {
        throw new Error('Invalid token response');
      }
    } catch (err) {
      console.error('Error fetching token:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Connection Error</div>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '20px' }}>{error}</div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid #00ffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <div>Connecting to LiveKit...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      video={false} 
      // audio=true allows subscribing to remote audio (observer won't publish)
      audio={true}
      options={{
        adaptiveStream: false,
        dynacast: false,
      }}
    >
      <OBSVideoDisplay excludeIdentity={excludeGuest || undefined} />
    </LiveKitRoom>
  );
}

export default function OBSBrowserSourcePage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
      }}>
        Loading OBS Source...
      </div>
    }>
      <OBSBrowserSourceContent />
    </Suspense>
  );
}