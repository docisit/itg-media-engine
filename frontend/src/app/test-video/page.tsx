'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, useTracks, useRoomContext } from '@livekit/components-react';
import { Track, RoomEvent, RemoteTrackPublication } from 'livekit-client';
import { useSession } from 'next-auth/react';
import '@livekit/components-styles';

export const dynamic = 'force-dynamic';

// Simplified video display - NO LiveKit layout components!
function SimpleHostVideo() {
  const room = useRoomContext();
  const videoTracks = useTracks([Track.Source.Camera]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Get the host's video track (any participant that's not the local user)
  const hostVideoTrack = videoTracks.find(
    track => track.participant.identity !== room.localParticipant.identity
  );

  // Directly attach the video track to a raw video element
  useEffect(() => {
    if (videoRef.current && hostVideoTrack?.publication?.track) {
      const track = hostVideoTrack.publication.track;
      track.attach(videoRef.current);
      
      // Log the actual video dimensions
      videoRef.current.onloadedmetadata = () => {
        console.log('Video natural size:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
      };
      
      return () => {
        track.detach(videoRef.current!);
      };
    }
  }, [hostVideoTrack]);

  // === CRITICAL: Subscribe to ALL audio tracks via room events ===
  // WHIP bypass mode tracks may have source=Unknown, so useTracks with Source.Microphone won't catch them
  // We listen to every TrackPublished/TrackSubscribed event and attach if it's audio
  useEffect(() => {
    if (!room) return;

    const onTrackPublished = (pub: RemoteTrackPublication, participant: any) => {
      if (!pub.track || pub.kind !== 'audio') return;
      if (audioRef.current) {
        console.log('🎤 test-video: Attaching audio track:', pub.trackSid, 'source:', pub.source);
        pub.track.attach(audioRef.current);
      }
    };

    const onTrackSubscribed = (track: any, pub: RemoteTrackPublication, participant: any) => {
      if (track.kind !== 'audio') return;
      if (audioRef.current) {
        console.log('🎤 test-video: Attaching subscribed audio track:', pub.trackSid, 'source:', pub.source);
        track.attach(audioRef.current);
      }
    };

    // Check for already-published audio tracks
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.kind === 'audio' && audioRef.current) {
          console.log('🎤 test-video: Attaching existing audio track:', pub.trackSid, 'source:', pub.source);
          pub.track.attach(audioRef.current);
        }
      });
    });

    room.on(RoomEvent.TrackPublished, onTrackPublished);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed as any);

    return () => {
      room.off(RoomEvent.TrackPublished, onTrackPublished);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed as any);
    };
  }, [room]);

  if (!hostVideoTrack) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <h3 className="text-xl font-bold text-white mb-2">Waiting for host...</h3>
          <p className="text-gray-400">The broadcast will begin shortly</p>
        </div>
      </div>
    );
  }

  // RAW VIDEO ELEMENT + HIDDEN AUDIO ELEMENT
  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black',
        }}
      />
      <audio ref={audioRef} autoPlay playsInline />
    </>
  );
}

export default function GuestRoomPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const params = useParams();
  const roomName = (params?.roomName as string) || 'Broadcast_Studio_A1';
  
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    // Observer role — no login required, video-only
    const joinAsObserver = async () => {
      setIsJoining(true);
      try {
        const response = await fetch(
          `/api/connection-details?roomName=${encodeURIComponent(roomName)}&role=observer&participantName=Viewer`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
          throw new Error(`Failed to get connection details: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.participantToken && data.serverUrl) {
          setToken(data.participantToken);
          setServerUrl(data.serverUrl);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (err) {
        console.error('Error joining:', err);
        setError(err instanceof Error ? err.message : 'Failed to join broadcast');
      } finally {
        setIsJoining(false);
      }
    };

    joinAsObserver();
  }, [status, router, roomName]);

  if (status === 'loading' || isJoining) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining broadcast...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black">
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={false}
        video={false}
      >
        <SimpleHostVideo />
      </LiveKitRoom>

      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-50 bg-black/60 text-white px-4 py-2 rounded-lg font-bold hover:bg-black/80 transition backdrop-blur-sm"
      >
        ← Back
      </button>
    </div>
  );
}
