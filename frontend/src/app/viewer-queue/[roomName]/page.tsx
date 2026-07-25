'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LiveKitRoom, useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteTrack, RemoteParticipant, RemoteTrackPublication } from 'livekit-client';
import '@livekit/components-styles';

export const dynamic = 'force-dynamic';

// ---- Host ID matcher (same logic as guest-room) ----
function isHostParticipant(identity?: string): boolean {
  if (!identity) return false;
  const lower = identity.toLowerCase();
  return (
    identity === 'whip_ingress_host' ||
    identity === 'host-user' ||
    identity === 'host' ||
    lower.includes('whip') ||
    lower.includes('ingress') ||
    lower === 'obs' ||
    (lower.includes('host') && !lower.includes('guest') && !lower.includes('viewer'))
  );
}

/** Attach host video to a <video> element */
function HostVideo() {
  const room = useRoomContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachedTrackRef = useRef<RemoteTrack | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind !== 'video') return;
      if (attachedTrackRef.current === track) return;
      if (attachedTrackRef.current) {
        try { attachedTrackRef.current.detach(el); } catch (_) {}
      }
      track.attach(el);
      attachedTrackRef.current = track;
    };

    const detachTrack = (track: RemoteTrack) => {
      if (track.kind !== 'video') return;
      if (attachedTrackRef.current === track) {
        try { track.detach(el); } catch (_) {}
        attachedTrackRef.current = null;
      }
    };

    const subscribeAndAttach = () => {
      room.remoteParticipants.forEach((p) => {
        if (isHostParticipant(p.identity)) {
          p.videoTrackPublications.forEach((pub) => {
            if (!pub.isSubscribed) pub.setSubscribed(true);
            if (pub.track) attachTrack(pub.track);
          });
        }
      });
    };

    const handleTrackSubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (_track.kind === 'video' && isHostParticipant(participant.identity)) {
        attachTrack(_track);
      }
    };

    const handleTrackUnsubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (_track.kind === 'video' && isHostParticipant(participant.identity)) {
        detachTrack(_track);
      }
    };

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (!isHostParticipant(participant.identity)) return;
      subscribeAndAttach();
      participant.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'video') attachTrack(track);
      });
    };

    const handleConnected = () => subscribeAndAttach();

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    if (room.state === 'connected') handleConnected();

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      if (attachedTrackRef.current) {
        try { attachedTrackRef.current.detach(el); } catch (_) {}
      }
    };
  }, [room]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-contain bg-black"
    />
  );
}

/** Show waiting overlay when no host video is detected */
function WaitingOverlay() {
  const room = useRoomContext();
  const [hostHasVideo, setHostHasVideo] = useState(false);

  useEffect(() => {
    const checkHostVideo = () => {
      const found = Array.from(room.remoteParticipants.values()).some((p) =>
        isHostParticipant(p.identity) &&
        Array.from(p.videoTrackPublications.values()).some(
          (pub) => pub.isSubscribed && pub.track
        )
      );
      setHostHasVideo(found);
    };

    const handleTrackSubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (_track.kind === 'video' && isHostParticipant(participant.identity)) {
        setHostHasVideo(true);
      }
    };

    const handleTrackUnsubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (_track.kind === 'video' && isHostParticipant(participant.identity)) {
        checkHostVideo();
      }
    };

    const handleConnected = () => checkHostVideo();

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    if (room.state === 'connected') checkHostVideo();

    const pollInterval = setInterval(() => {
      if (!hostHasVideo) checkHostVideo();
    }, 3000);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      clearInterval(pollInterval);
    };
  }, [room, hostHasVideo]);

  if (hostHasVideo) return null;

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
      <div className="text-center">
        <div className="text-6xl mb-4">📺</div>
        <h3 className="text-xl font-bold text-white mb-2">Broadcast will begin soon</h3>
        <p className="text-gray-400">Waiting for the show to start...</p>
      </div>
    </div>
  );
}

/** Publish audio only (no video) for viewer mode */
function ViewerPublisher() {
  const room = useRoomContext();
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!room || published) return;

    const publish = async () => {
      try {
        // Get only audio (no video)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        for (const track of stream.getTracks()) {
          await room.localParticipant.publishTrack(track);
        }

        setPublished(true);
        console.log('✅ Viewer publishing audio');
      } catch (err) {
        console.error('❌ Could not publish audio:', err);
      }
    };

    publish();
  }, [room, published]);

  return null;
}

/** Raise hand / lower hand controls */
function HandRaiseControls() {
  const room = useRoomContext();
  const [handRaised, setHandRaised] = useState(false);
  const [micMuted, setMicMuted] = useState(true);

  useEffect(() => {
    // Check initial mic state
    const checkMic = async () => {
      const audioEnabled = room.localParticipant.isMicrophoneEnabled;
      setMicMuted(!audioEnabled);
    };

    room.on(RoomEvent.LocalTrackUnpublished, checkMic);
    room.on(RoomEvent.LocalTrackPublished, checkMic);
    
    if (room.state === 'connected') checkMic();

    return () => {
      room.off(RoomEvent.LocalTrackUnpublished, checkMic);
      room.off(RoomEvent.LocalTrackPublished, checkMic);
    };
  }, [room]);

  // Poll every 5s for mic state changes (e.g. director unmuted us)
  useEffect(() => {
    const interval = setInterval(() => {
      setMicMuted(!room.localParticipant.isMicrophoneEnabled);
    }, 5000);
    return () => clearInterval(interval);
  }, [room]);

  const handleRaiseHand = async () => {
    try {
      const newState = !handRaised;
      setHandRaised(newState);
      
      // Update room metadata to signal director
      await room.localParticipant.setMetadata(JSON.stringify({
        role: 'viewer',
        raised_hand: newState,
        status: handRaised ? 'waiting' : 'raised_hand',
      }));
    } catch (err) {
      console.error('Error raising hand:', err);
      setHandRaised(!handRaised); // revert
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Raise Hand Button */}
      <button
        onClick={handleRaiseHand}
        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
          handRaised
            ? 'bg-yellow-500 text-black animate-pulse'
            : 'bg-zinc-800 text-white hover:bg-zinc-700'
        }`}
      >
        {handRaised ? '✋ Hand Raised' : '🤚 Raise Hand'}
      </button>

      {/* Mic Status Indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
        micMuted ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
      }`}>
        <div className={`w-2 h-2 rounded-full ${micMuted ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
        {micMuted ? 'Mic Muted' : 'You\'re Live!'}
      </div>
    </div>
  );
}

export default function ViewerQueuePage() {
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

    if (!session) {
      router.push(`/login?callbackUrl=/viewer-queue/${roomName}`);
      return;
    }

    const joinAsViewer = async () => {
      setIsJoining(true);
      try {
        const viewerName = session.user?.name || session.user?.email?.split('@')[0] || 'Viewer';
        
        const response = await fetch(
          `/api/connection-details-viewer?roomName=${encodeURIComponent(roomName)}&participantName=${encodeURIComponent(viewerName)}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
          throw new Error(`Failed to join: ${response.status}`);
        }

        const data = await response.json();
        if (data.participantToken && data.serverUrl) {
          setToken(data.participantToken);
          setServerUrl(data.serverUrl);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (err) {
        console.error('Error joining:', err);
        setError(err instanceof Error ? err.message : 'Failed to join');
      } finally {
        setIsJoining(false);
      }
    };

    joinAsViewer();
  }, [session, status, router, roomName]);

  if (status === 'loading' || isJoining) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Joining as viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video area */}
      <div className="flex-1 relative">
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true}
          audio={true}
          video={false}
          connectOptions={{ autoSubscribe: false }}
        >
          <HostVideo />
          <WaitingOverlay />
          <ViewerPublisher />
        </LiveKitRoom>
      </div>

      {/* Bottom bar */}
      <div className="h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-4">
        <HandRaiseControls />

        <div className="flex items-center gap-2">
          <div className="text-xs text-zinc-500">Viewer Queue</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-1.5 bg-red-600/70 hover:bg-red-600 text-white rounded text-xs font-bold transition"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
