'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteTrack, RemoteParticipant, RemoteTrackPublication } from 'livekit-client';
import { useSession } from 'next-auth/react';
import QualityMonitor from '../components/QualityMonitor';
import GuestBottomBar from '../components/GuestBottomBar';
import { SettingsMenu } from '../components/SettingsMenu';
import '@livekit/components-styles';
import { useLowCPUOptimizer } from '../hooks/useLowCPUOptimizer';

export const dynamic = 'force-dynamic';

// ---- Host ID matcher ----
function isHostParticipant(identity?: string): boolean {
  return identity === 'whip_ingress_host' || identity === 'host-user';
}

/**
 * Event-driven host video attachment.
 *
 * Avoids the useTracks hook which causes re-renders (and thus flicker)
 * whenever the Room emits any event (e.g. active speaker changes).
 *
 * Instead, we:
 *  1. Set autoSubscribe: false on the LiveKitRoom so no tracks are
 *     auto-subscribed (avoids silent subscription without events).
 *  2. After connecting, manually call pub.setSubscribed(true) for the
 *     host's tracks – this fires a clean TrackSubscribed event.
 *  3. Attach the track to the <video> element only on TrackSubscribed
 *     and detach on TrackUnsubscribed.
 *  4. Use refs (not state) to track the attached track – updating a
 *     ref does NOT trigger a React re-render.
 */
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
      // Detach previous track if present
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

    const subscribeHostTracks = () => {
      room.remoteParticipants.forEach((p) => {
        if (isHostParticipant(p.identity)) {
          p.videoTrackPublications.forEach((pub) => {
            if (!pub.isSubscribed) {
              pub.setSubscribed(true);
            }
          });
        }
      });
    };

    // RoomEvent.TrackSubscribed passes (track, publication, participant)
    const handleTrackSubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (!isHostParticipant(participant.identity)) return;
      attachTrack(_track);
    };

    // RoomEvent.TrackUnsubscribed passes (track, publication, participant)
    const handleTrackUnsubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (!isHostParticipant(participant.identity)) return;
      detachTrack(_track);
    };

    const handleConnected = () => {
      subscribeHostTracks();
      // Also grab any tracks that were already subscribed before we set up listeners
      room.remoteParticipants.forEach((p) => {
        if (isHostParticipant(p.identity)) {
          p.videoTrackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track);
          });
        }
      });
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // If room already connected (e.g. re-render), subscribe immediately
    if (room.state === 'connected') {
      handleConnected();
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      if (attachedTrackRef.current) {
        try { attachedTrackRef.current.detach(el); } catch (_) {}
        attachedTrackRef.current = null;
      }
    };
  }, [room]);

  return (
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
  );
}

/**
 * Event-driven host audio attachment – same pattern as HostVideo above.
 */
function HostAudio() {
  const room = useRoomContext();
  const audioRef = useRef<HTMLAudioElement>(null);
  const attachedTrackRef = useRef<RemoteTrack | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind !== 'audio') return;
      if (attachedTrackRef.current === track) return;
      if (attachedTrackRef.current) {
        try { attachedTrackRef.current.detach(el); } catch (_) {}
      }
      track.attach(el);
      attachedTrackRef.current = track;
    };

    const detachTrack = (track: RemoteTrack) => {
      if (track.kind !== 'audio') return;
      if (attachedTrackRef.current === track) {
        try { track.detach(el); } catch (_) {}
        attachedTrackRef.current = null;
      }
    };

    const subscribeHostTracks = () => {
      room.remoteParticipants.forEach((p) => {
        if (isHostParticipant(p.identity)) {
          p.audioTrackPublications.forEach((pub) => {
            if (!pub.isSubscribed) {
              pub.setSubscribed(true);
            }
          });
        }
      });
    };

    // RoomEvent.TrackSubscribed passes (track, publication, participant)
    const handleTrackSubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (!isHostParticipant(participant.identity)) return;
      attachTrack(_track);
    };

    // RoomEvent.TrackUnsubscribed passes (track, publication, participant)
    const handleTrackUnsubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (!isHostParticipant(participant.identity)) return;
      detachTrack(_track);
    };

    const handleConnected = () => {
      subscribeHostTracks();
      room.remoteParticipants.forEach((p) => {
        if (isHostParticipant(p.identity)) {
          p.audioTrackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track);
          });
        }
      });
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    if (room.state === 'connected') {
      handleConnected();
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      if (attachedTrackRef.current) {
        try { attachedTrackRef.current.detach(el); } catch (_) {}
        attachedTrackRef.current = null;
      }
    };
  }, [room]);

  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
}

/**
 * "Waiting for broadcast" overlay – uses event-driven state instead of useTracks.
 */
function WaitingOverlay() {
  const room = useRoomContext();
  const [hostHasVideo, setHostHasVideo] = useState(false);

  useEffect(() => {
    const checkHostVideo = () => {
      let found = false;
      room.remoteParticipants.forEach((p) => {
        if (isHostParticipant(p.identity)) {
          p.videoTrackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track) {
              found = true;
            }
          });
        }
      });
      setHostHasVideo(found);
    };

    // RoomEvent.TrackSubscribed passes (track, publication, participant)
    const handleTrackSubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (_track.kind === 'video' && isHostParticipant(participant.identity)) {
        setHostHasVideo(true);
      }
    };

    // RoomEvent.TrackUnsubscribed passes (track, publication, participant)
    const handleTrackUnsubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (_track.kind === 'video' && isHostParticipant(participant.identity)) {
        // Re-check – there could be another video track still active
        checkHostVideo();
      }
    };

    const handleConnected = () => {
      checkHostVideo();
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    if (room.state === 'connected') {
      checkHostVideo();
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room]);

  if (hostHasVideo) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-10">
      <div className="text-center">
        <div className="text-6xl mb-4">👋</div>
        <h3 className="text-xl font-bold text-white mb-2">Waiting for broadcast...</h3>
        <p className="text-gray-400">The show will begin shortly</p>
      </div>
    </div>
  );
}

// ---- Guest publishes camera + mic for OBS Browser Source ----
function GuestPublisher() {
  const room = useRoomContext();
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!room || published) return;

    const publish = async () => {
      try {
        // Request media with audio processing OFF
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });

        // Publish tracks manually
        for (const track of stream.getTracks()) {
          await room.localParticipant.publishTrack(track);
        }

        setPublished(true);
        console.log('✅ Guest publishing camera + mic for OBS (no audio processing)');
      } catch (err) {
        console.error('❌ Could not publish guest media:', err);
      }
    };

    publish();
  }, [room, published]);

  return null;
}

// Performance Manager For Older Devices
function PerformanceManager() {
  const room = useRoomContext();
  const isLowPowerMode = useLowCPUOptimizer(room, {
    reducePublisherVideoQuality: true,  // Guest's own video quality
    reduceSubscriberVideoQuality: true, // Host's video quality
    disableVideoProcessing: false,
  });

  useEffect(() => {
    if (isLowPowerMode) console.log('⚡ Low-power mode active for guest');
  }, [isLowPowerMode]);

  return null;
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
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    const joinAsGuest = async (nameOverride?: string) => {
      setIsJoining(true);
      try {
        const guestName = nameOverride
          || session?.user?.name
          || session?.user?.email?.split('@')[0]
          || 'Guest';

        const response = await fetch(
          `/api/connection-details?roomName=${encodeURIComponent(roomName)}&participantName=${encodeURIComponent(guestName)}`,
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

    if (!session) {
      router.push(`/login?callbackUrl=/guest-room/${roomName}`);
      return;
    }

    joinAsGuest();
  }, [session, status, router, roomName]);

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
        audio={true}
        video={true}
        // Turn off auto-subscribe so we manually subscribe to host tracks,
        // ensuring TrackSubscribed/TrackUnsubscribed events fire cleanly
        // and our event-driven HostVideo / HostAudio components work correctly.
        connectOptions={{ autoSubscribe: false }}
		  options={{
		    adaptiveStream: false,  
		    dynacast: false,        
	  }}
      >
        <PerformanceManager />
        <HostVideo />
        <HostAudio />
        <WaitingOverlay />
        <GuestPublisher />
        <QualityMonitor />

        {/* Bottom Control Bar */}
        <GuestBottomBar onOpenSettings={() => setShowSettings(true)} />

        {/* Slide-up Settings Panel */}
        {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
      </LiveKitRoom>

      {/* Smaller Exit Button - Top Right */}
      <button
        onClick={() => router.push('/dashboard')}
        className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center bg-red-600/70 hover:bg-red-600 text-white rounded-full text-sm backdrop-blur-sm transition-all shadow-lg active:scale-90 hover:scale-105 border border-red-500/30"
        title="Exit broadcast"
      >
        <span className="text-base leading-none">✕</span>
      </button>
    </div>
  );
}
