'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LiveKitRoom, useTracks, useRoomContext, RoomAudioRenderer } from '@livekit/components-react';
import { Track, RoomEvent, RemoteTrackPublication } from 'livekit-client';
import SpeedTest from '@/app/components/SpeedTest';
import '@livekit/components-styles';

// ============================================================
// OBSERVER VIDEO PLAYER — Lives inside LiveKitRoom context
// Subscribes to host's camera, shows nice overlays + controls
// ============================================================
function ObserverVideoPlayer({ roomName }: { roomName: string }) {
  const room = useRoomContext();
  const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'failed'
  >('connecting');
  const [showStats, setShowStats] = useState(false);
  const [showSpeedTest, setShowSpeedTest] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [videoStats, setVideoStats] = useState({
    resolution: '0x0',
    frameRate: 0,
    hostName: 'Host',
  });

  // Find host track — host or WHIP ingress
  const hostVideoTrack = videoTracks.find(
    (track) =>
      track.participant.identity.includes('host') ||
      track.participant.identity.includes('whip') ||
      track.participant.identity.includes('ingress') ||
      track.participant.identity.includes('director')
  );

  // Also try first available camera if no host identified
  const fallbackTrack = !hostVideoTrack && videoTracks.length > 0 ? videoTracks[0] : null;
  const activeTrack = hostVideoTrack || fallbackTrack;

  // Attach / detach host video track
  useEffect(() => {
    if (videoRef.current && activeTrack?.publication?.track) {
      const track = activeTrack.publication.track;
      track.attach(videoRef.current);
      setIsLive(true);
      setConnectionState('connected');

      const settings = track.mediaStreamTrack?.getSettings();
      setVideoStats({
        resolution: settings ? `${settings.width}×${settings.height}` : 'unknown',
        frameRate: settings?.frameRate || 0,
        hostName: activeTrack.participant.name || 'Host',
      });

      videoRef.current.onloadedmetadata = () => {
        console.log(
          'Broadcast video:',
          videoRef.current?.videoWidth,
          '×',
          videoRef.current?.videoHeight
        );
      };

      return () => {
        track.detach(videoRef.current!);
      };
    }
  }, [activeTrack]);

  // === CRITICAL: Subscribe to ALL audio tracks via room events ===
  // This catches any audio track regardless of source type (Microphone, Unknown, etc.)
  // WHIP bypass mode may publish tracks with source=Unknown — useTracks filters miss them
  // RoomAudioRenderer also only handles Microphone/ScreenShareAudio — misses Unknown
  // So we listen to EVERY TrackPublished event and check if it's audio
  useEffect(() => {
    if (!room) return;

    const onTrackPublished = (pub: RemoteTrackPublication, participant: any) => {
      if (!pub.track || pub.kind !== 'audio') return;
      if (audioRef.current) {
        console.log('🎤 Attaching audio track via room event:', pub.trackSid, 'source:', pub.source);
        pub.track.attach(audioRef.current);
      }
    };

    const onTrackSubscribed = (track: any, pub: RemoteTrackPublication, participant: any) => {
      if (track.kind !== 'audio') return;
      if (audioRef.current) {
        console.log('🎤 Attaching subscribed audio track via room event:', pub.trackSid, 'source:', pub.source);
        track.attach(audioRef.current);
      }
    };

    // Also check for already-published tracks (host may have joined before our observer)
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.kind === 'audio' && audioRef.current) {
          console.log('🎤 Attaching existing audio track:', pub.trackSid, 'source:', pub.source);
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

  // Room lifecycle events
  useEffect(() => {
    const onDisconnected = () => {
      setIsLive(false);
      setConnectionState('disconnected');
    };
    const onReconnecting = () => setConnectionState('connecting');
    const onReconnected = () => setConnectionState('connected');

    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);

    // Check initial state
    if (room.state === 'connected') {
      setConnectionState('connected');
    }

    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
    };
  }, [room]);

  // Connection status helpers
  const statusColor = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    failed: 'bg-red-500',
  }[connectionState];

  const statusText = {
    connecting: 'CONNECTING',
    connected: isLive ? 'LIVE' : 'ONLINE',
    disconnected: 'OFFLINE',
    failed: 'ERROR',
  }[connectionState];

  // Ref for the video container — used for fullscreen
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Fullscreen toggle — supports standard + WebKit prefixes for mobile
  const toggleFullscreen = useCallback(() => {
    const el = videoContainerRef.current;
    if (!el) return;

    // Check if already fullscreen (standard + webkit for iOS Safari)
    const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

    if (!isFS) {
      // Try standard API first
      if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' })
          .then(() => setIsFullscreen(true))
          .catch((err) => {
            console.error('Fullscreen request failed:', err);
            // On iOS, try video element directly
            const vid = videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
            if (vid && vid.webkitEnterFullscreen) {
              vid.webkitEnterFullscreen();
              setIsFullscreen(true);
            }
          });
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        const vid = videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
        if (vid && vid.webkitEnterFullscreen) {
          // iOS Safari video element hack
          vid.webkitEnterFullscreen();
          setIsFullscreen(true);
        } else {
          console.warn('Fullscreen API not supported on this device');
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  }, []);

  // === CHROME/EDGE AUTOPLAY FIX ===
  // These browsers block autoplay of unmuted audio until user interaction
  // Safari is more permissive and allows it. This handler ensures audio
  // starts playing on the first user click/tap anywhere on the page.
  const [userInteracted, setUserInteracted] = useState(false);
  
  useEffect(() => {
    const handler = () => {
      if (!userInteracted) {
        setUserInteracted(true);
        // Force-resume the audio element after user interaction
        if (audioRef.current) {
          audioRef.current.play().catch((e) => {
            console.log('Audio play after interaction:', e.message);
          });
        }
        // Also try to resume any AudioContext that LiveKit may have created
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctx.resume();
        } catch (_) { /* ignore */ }
      }
    };
    
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [userInteracted]);

  // Follow / Notify
  const handleFollow = () => {
    setIsFollowing((p) => !p);
  };
  const handleNotifications = async () => {
    if (!notificationsEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Share link — check API availability at runtime
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const handleShare = async () => {
    const url = window.location.href;
    if (canShare) {
      await navigator.share({ title: 'Don O\'Connor Live', url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // ===== RENDER =====
  return (
    <>
      <div ref={videoContainerRef} className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 group">
        {/* -- VIDEO ELEMENT -- */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        {/* -- HIDDEN AUDIO ELEMENT (catches ALL audio tracks via room events) -- */}
        <audio ref={audioRef} autoPlay playsInline />

        {/* -- OFFLINE / WAITING OVERLAY -- */}
        {!isLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-xl font-bold text-white mb-2">Stream Offline</h3>
              <p className="text-zinc-400 mb-6 max-w-md">
                The broadcast will return soon. Follow to get notified when we go live!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleFollow}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    isFollowing
                      ? 'bg-cyan-600 text-black hover:bg-cyan-500'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {isFollowing ? 'Following ✓' : 'Follow Stream'}
                </button>
                <button
                  onClick={handleNotifications}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    notificationsEnabled
                      ? 'bg-purple-600 text-white hover:bg-purple-500'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {notificationsEnabled ? 'Notify ✓' : 'Get Notified'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -- CONNECTING OVERLAY -- */}
        {connectionState === 'connecting' && !isLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-cyan-400 font-bold">Connecting to broadcast...</p>
            </div>
          </div>
        )}

        {/* -- TOP-LEFT: STATUS BADGE -- */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white ${statusColor} bg-black/60 backdrop-blur-sm`}
          >
            <div className={`w-2 h-2 rounded-full ${statusColor} ${isLive ? 'animate-pulse' : ''}`} />
            {statusText}
          </div>
          {isLive && (
            <div className="px-3 py-1.5 rounded-full text-xs font-mono text-cyan-300 bg-cyan-900/60 backdrop-blur-sm">
              {videoStats.resolution}
            </div>
          )}
        </div>

        {/* -- TOP-RIGHT: ACTION BUTTONS -- */}
        {isLive && (
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleFollow}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition backdrop-blur-sm ${
                isFollowing
                  ? 'bg-cyan-600 text-black hover:bg-cyan-500'
                  : 'bg-black/60 text-white hover:bg-zinc-800'
              }`}
            >
              {isFollowing ? 'Following ✓' : '+ Follow'}
            </button>
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 text-white hover:bg-zinc-800 backdrop-blur-sm transition"
            >
              {canShare ? '📤 Share' : '🔗 Copy'}
            </button>
          </div>
        )}

        {/* -- BOTTOM CONTROL BAR -- */}
        {isLive && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>LIVE — {videoStats.hostName}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowStats((p) => !p)}
                  className="px-3 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-xs rounded-lg text-zinc-300 transition"
                >
                  {showStats ? 'Hide Stats' : 'Stats'}
                </button>
                <button
                  onClick={() => setShowSpeedTest((p) => !p)}
                  className="px-3 py-1 bg-amber-800/80 hover:bg-amber-700 text-xs rounded-lg text-amber-300 transition"
                >
                  Speed Test
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-xs rounded-lg text-zinc-300 transition"
                >
                  ⛶ Fullscreen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -- STATS OVERLAY -- */}
        {showStats && isLive && (
          <div className="absolute bottom-16 left-4 bg-black/85 backdrop-blur-sm rounded-xl p-4 min-w-[180px] border border-zinc-800">
            <div className="text-xs font-bold text-cyan-300 mb-2 tracking-widest uppercase">
              Video Stats
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                ['Resolution', videoStats.resolution],
                ['Frame Rate', `${videoStats.frameRate.toFixed(1)} fps`],
                ['Host', videoStats.hostName],
                ['Status', isLive ? '🟢 Live' : '🔴 Offline'],
                ['Room', room.name || 'Broadcast_Studio_A1'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-zinc-500">{label as string}</span>
                  <span className="font-mono text-white">{(value as string) || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -- SPEED TEST MODAL -- */}
        {showSpeedTest && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"
            onClick={() => setShowSpeedTest(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <SpeedTest onClose={() => setShowSpeedTest(false)} />
            </div>
          </div>
        )}
      </div>

      {/* -- BELOW VIDEO: Stream info row -- */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-1">
        <div>
          <h3 className="text-lg font-bold text-white">Live Broadcast</h3>
          <p className="text-zinc-400 text-sm">Powered by LiveKit WebRTC</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg text-zinc-300 transition font-medium"
            title="Toggle fullscreen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {isFullscreen ? 'Exit Full Screen' : 'Watch Full Screen'}
          </button>
          {isLive && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// LIVEKIT BROADCAST PLAYER — Top-level component
// Generates observer token → wraps LiveKitRoom around player
// ============================================================
export default function LiveKitBroadcastPlayer() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const roomName = 'Broadcast_Studio_A1';
  const { data: session } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (session?.user) setIsLoggedIn(true);
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const fetchObserverToken = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use guest role for all users so everyone gets audio+video subscription permissions
        // audio={false} on LiveKitRoom prevents actual publishing by viewers
        const role = 'guest';
        const res = await fetch(
          `/api/connection-details?roomName=${encodeURIComponent(roomName)}&role=${role}&participantName=Viewer`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to connect: ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled && data.participantToken && data.serverUrl) {
          setToken(data.participantToken);
          setServerUrl(data.serverUrl);
        } else if (!cancelled) {
          throw new Error('Invalid response from connection server');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error getting observer token:', err);
          setError(err instanceof Error ? err.message : 'Failed to connect to broadcast');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchObserverToken();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
          <div className="aspect-video bg-zinc-800 rounded mb-4" />
          <div className="h-10 bg-zinc-800 rounded w-1/4" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/10 border border-red-800/50 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-bold text-red-400 mb-2">Connection Error</h3>
        <p className="text-zinc-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg font-bold transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!token || !serverUrl) return null;

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="p-4 sm:p-6">
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true}
          audio={false}
          video={false}
        >
          <RoomAudioRenderer />
          <ObserverVideoPlayer roomName={roomName} />
        </LiveKitRoom>
      </div>
    </div>
  );
}
