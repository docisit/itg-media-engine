'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveKitRoom, useTracks, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

export const dynamic = 'force-dynamic';

function OBSPreviewContent() {
  const room = useRoomContext();
  const allVideoTracks = useTracks([Track.Source.Camera]);
  
  // Show only remote participants - NOT your own local video
  const remoteTracks = allVideoTracks.filter(
    track => track.participant !== room.localParticipant
  );

  // Prioritize WHIP ingress track (OBS camera via WHIP)
  // If no WHIP ingress, show all remote tracks
  const whipTrack = remoteTracks.find(t => 
    t.participant.identity === 'whip_ingress_host'
  );
  const liveTracks = whipTrack ? [whipTrack] : remoteTracks;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#000',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      {liveTracks.length > 0 ? (
        liveTracks.map((track, index) => (
          <div
            key={track.participant.identity}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: index
            }}
          >
            <video
              ref={el => {
                if (el && track.publication.track) {
                  track.publication.track.attach(el);
                }
              }}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000'
              }}
            />
            
            {/* Optional: Guest name overlay */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold'
            }}>
              {track.participant.identity}
            </div>
          </div>
        ))
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'white',
          fontSize: '24px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>👋</div>
          <div>Waiting for live guests...</div>
        </div>
      )}
    </div>
  );
}

function OBSPreviewPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || 'Broadcast_Studio_A1';
  
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchToken();
  }, [roomId]);

  async function fetchToken() {
    try {
      // Use the working Next.js API endpoint for LiveKit token generation
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(
        `${apiBase}/api/connection-details?roomName=${encodeURIComponent(roomId)}&participantName=OBS_Preview&role=observer`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
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
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <div>{error}</div>
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
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Connecting...
      </div>
    );
  }

  return (
	<LiveKitRoom
	  serverUrl={serverUrl}
	  token={token}
	  connect={true}
	  video={false} 
	  audio={false}
	  options={{
		adaptiveStream: true,
		dynacast: true,
	  }}
	>
      <OBSPreviewContent />
    </LiveKitRoom>
  );
}

export default function OBSPreviewPageWrapper() {
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
        justifyContent: 'center'
      }}>
        Loading...
      </div>
    }>
      <OBSPreviewPage />
    </Suspense>
  );
}