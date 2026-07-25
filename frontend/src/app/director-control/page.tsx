'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Copy, Users, Video, Clock, Link as LinkIcon, CheckCircle, Monitor, Mic, Camera, Settings, Eye, EyeOff, Play, StopCircle, RefreshCw, Key, Globe, UserPlus, UserX, VolumeX, Volume2, Hand, List, Radio, Disc } from 'lucide-react';

interface GuestParticipant {
  identity: string;
  name: string;
  is_connected: boolean;
  joined_at: string;
  has_video: boolean;
  has_audio: boolean;
  video_track_id: string | null;
  audio_track_id: string | null;
  metadata?: any;
}

interface ViewerParticipant {
  identity: string;
  name: string;
  is_connected: boolean;
  raised_hand: boolean;
  status: string;
}

interface RoomStatus {
  room_id: string;
  name: string;
  is_live: boolean;
  participant_count: number;
  host_connected: boolean;
}

interface TrackStatus {
  audio_track_id: string | null;
  video_track_id: string | null;
  host_audio_id: string | null;
  host_video_id: string | null;
  participant_count: number;
}

interface EgressStatus {
  is_running: boolean;
  is_recording: boolean;
  egress_id: string | null;
  active_count: number;
}

// ---- Host ID matcher ----
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

function isViewerParticipant(identity?: string, metadata?: any): boolean {
  if (metadata?.role === 'viewer') return true;
  if (!identity) return false;
  return identity.toLowerCase().startsWith('viewer_');
}

// ── Adaptive polling ──────────────────────────────────────
// Fast when room is active, slow when idle to reduce server load
const POLL_INTERVAL_ACTIVE = 5000;   // 5s — participants in room
const POLL_INTERVAL_IDLE   = 30000;  // 30s — room empty, ease off

export default function NewDirectorControlPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [roomStatus, setRoomStatus] = useState<RoomStatus>({
    room_id: 'Broadcast_Studio_A1',
    name: 'Broadcast Studio A1',
    is_live: false,
    participant_count: 0,
    host_connected: false
  });
  
  const [guests, setGuests] = useState<GuestParticipant[]>([]);
  const [viewers, setViewers] = useState<ViewerParticipant[]>([]);
  const [guestLink, setGuestLink] = useState<string>('');
  const [viewerLink, setViewerLink] = useState<string>('');
  const [hostUrl, setHostUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('checking');
  const [trackStatus, setTrackStatus] = useState<TrackStatus>({ audio_track_id: null, video_track_id: null, host_audio_id: null, host_video_id: null, participant_count: 0 });
  const [egressStatus, setEgressStatus] = useState<EgressStatus>({ is_running: false, is_recording: false, egress_id: null, active_count: 0 });
  const [showGuestVideo, setShowGuestVideo] = useState(false);
  const [isMulticasting, setIsMulticasting] = useState(false);
  const [multicastStatus, setMulticastStatus] = useState<string>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordStatus, setRecordStatus] = useState<string>('idle');
  const [encodingPreset, setEncodingPreset] = useState<'portrait' | 'landscape'>('portrait');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const ROOM_ID = 'Broadcast_Studio_A1';

  // ── Track whether room is active to control polling speed ──
  const roomIsActive = roomStatus.is_live || roomStatus.participant_count > 0 || roomStatus.host_connected;
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Stable refs for callback functions to avoid stale closures in intervals ──
  const roomStatusRef = useRef(roomStatus);
  roomStatusRef.current = roomStatus;
  const trackStatusRef = useRef(trackStatus);
  trackStatusRef.current = trackStatus;
  const egressStatusRef = useRef(egressStatus);
  egressStatusRef.current = egressStatus;

  // ── Polling functions ──

  const checkLiveKitConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/webrtc/connection-check/', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'Online') {
          setConnectionStatus('connected');
          return;
        }
      }
      setConnectionStatus('error');
    } catch (err) {
      console.error('LiveKit connection error:', err);
      setConnectionStatus('error');
    }
  }, []);

  const checkRoomStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/room-status/${encodeURIComponent(ROOM_ID)}/`, {
        credentials: 'include',  // FIX: send session cookie
      });
      
      if (response.ok) {
        const data = await response.json();
        
        setRoomStatus(prev => ({
          ...prev,
          participant_count: data.participant_count || 0,
          host_connected: data.host_connected || false,
          is_live: data.is_live || false
        }));
        
        // Separate participants into guests and viewers
        const allParticipants: GuestParticipant[] = data.participants?.map((p: any) => ({
          identity: p.identity,
          name: p.name,
          is_connected: true,
          joined_at: p.joined_at || new Date().toLocaleTimeString(),
          has_video: p.has_video || false,
          has_audio: p.has_audio || false,
          video_track_id: p.video_track_id || null,
          audio_track_id: p.audio_track_id || null,
          metadata: p.metadata || {}
        })) || [];

        // Filter: guests = not host, not viewer | viewers = viewer role
        const guestList = allParticipants.filter(p => 
          !isHostParticipant(p.identity) && !isViewerParticipant(p.identity, p.metadata)
        );

        const viewerList: ViewerParticipant[] = allParticipants
          .filter(p => isViewerParticipant(p.identity, p.metadata))
          .map((p: any): ViewerParticipant => ({
            identity: p.identity,
            name: p.name,
            is_connected: true,
            raised_hand: p.raised_hand || p.metadata?.raised_hand || false,
            status: p.status || p.metadata?.status || 'waiting'
          }));
        
        setGuests(guestList);
        setViewers(viewerList);

        // Also update track status from room data if available
        const hostWithVideo = allParticipants.find(p => isHostParticipant(p.identity) && p.video_track_id);
        const hostWithAudio = allParticipants.find(p => isHostParticipant(p.identity) && p.audio_track_id || null);
        const anyWithVideo = allParticipants.find(p => p.video_track_id);
        const anyWithAudio = allParticipants.find(p => p.audio_track_id);

        if (anyWithVideo?.video_track_id || anyWithAudio?.audio_track_id) {
          setTrackStatus(prev => ({
            ...prev,
            video_track_id: hostWithVideo?.video_track_id || anyWithVideo?.video_track_id || prev.video_track_id,
            audio_track_id: hostWithAudio?.audio_track_id || anyWithAudio?.audio_track_id || prev.audio_track_id,
            participant_count: allParticipants.length
          }));
        }
      }
    } catch (err) {
      console.error('Error checking room status:', err);
    }
  }, [ROOM_ID]);

  const checkTrackStatus = useCallback(async () => {
    // FIX: Only poll for tracks when the room has participants
    if (!roomStatusRef.current.is_live && !roomStatusRef.current.host_connected && roomStatusRef.current.participant_count === 0) {
      return;
    }
    try {
      const response = await fetch('/api/webrtc/egress/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_track_ids',
          room_name: ROOM_ID
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setTrackStatus({
            audio_track_id: data.audio_track_id,
            video_track_id: data.video_track_id,
            host_audio_id: data.host_audio_id,
            host_video_id: data.host_video_id,
            participant_count: data.participant_count || 0
          });
        }
      }
    } catch (err) {
      // Silently ignore — room is probably empty, which is expected
    }
  }, [ROOM_ID]);

  const checkEgressStatus = useCallback(async () => {
    // FIX: Only poll for egress when the room has participants
    if (!roomStatusRef.current.is_live && !roomStatusRef.current.host_connected && roomStatusRef.current.participant_count === 0) {
      return;
    }
    try {
      const response = await fetch('/api/webrtc/egress/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          room_name: ROOM_ID
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setEgressStatus({
            is_running: data.is_running,
            is_recording: data.is_recording,
            egress_id: data.egress_id,
            active_count: data.active_count
          });
          setIsMulticasting(data.is_running && !data.is_recording);
          setIsRecording(data.is_recording);
          if (data.is_running) {
            setMulticastStatus(data.is_recording ? 'idle' : 'active');
            setRecordStatus(data.is_recording ? 'active' : 'idle');
          } else {
            setMulticastStatus('idle');
            setRecordStatus('idle');
          }
        }
      }
    } catch (err) {
      // Silently ignore — room is probably empty, which is expected
    }
  }, [ROOM_ID]);

  // ── Adaptive polling effect: watches room activity, adjusts interval ──
  useEffect(() => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const interval = roomIsActive ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;

    // Do an immediate poll to get fresh data
    checkRoomStatus();
    if (roomIsActive) {
      checkTrackStatus();
      checkEgressStatus();
    }

    pollIntervalRef.current = setInterval(() => {
      checkRoomStatus();
      if (roomIsActive) {
        checkTrackStatus();
        checkEgressStatus();
      }
    }, interval);

    console.log(
      `📡 Polling interval set to ${interval / 1000}s (room ${roomIsActive ? 'ACTIVE' : 'IDLE'})`
    );

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [roomIsActive, checkRoomStatus, checkTrackStatus, checkEgressStatus]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !session.user) {
      router.push('/login');
      return;
    }

    const user = session.user as { is_staff?: boolean };
    
    if (!user.is_staff) {
      setError('Access denied. Director control center is for staff only.');
      setLoading(false);
      return;
    }

    // Generate URLs
    const baseUrl = window.location.origin;
    setHostUrl(`${baseUrl}/studio/host-control`);
    setGuestLink(`${baseUrl}/guest-room`);
    setViewerLink(`${baseUrl}/viewer-queue/${ROOM_ID}`);
    
    // Check LiveKit connection once
    checkLiveKitConnection();
    
    setLoading(false);
    
    // Initial fetch — room status first to establish active/idle state.
    // Track and egress polling is handled by the adaptive useEffect below,
    // which only fires those calls when roomIsActive is true.
    checkRoomStatus();

  }, [session, status, router, checkLiveKitConnection, checkRoomStatus, ROOM_ID]);

  // ---- Guest/Viewer Control Functions ----

  const handleMuteParticipant = async (participantIdentity: string, mute: boolean) => {
    setActionLoading(`mute_${participantIdentity}`);
    try {
      const response = await fetch(`/api/webrtc/rooms/${ROOM_ID}/participants/${participantIdentity}/mute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mute })
      });
      
      if (response.ok) {
        console.log(`${mute ? 'Muted' : 'Unmuted'} ${participantIdentity}`);
      } else {
        const text = await response.text();
        console.error('Failed:', text);
        alert(`Failed to ${mute ? 'mute' : 'unmute'}. ${text}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error muting participant');
    } finally {
      setActionLoading(null);
    }
  };

  const handleKickParticipant = async (participantIdentity: string) => {
    if (!confirm(`Remove ${participantIdentity} from the room?`)) return;
    
    setActionLoading(`kick_${participantIdentity}`);
    try {
      const response = await fetch(`/api/webrtc/rooms/${ROOM_ID}/participants/${participantIdentity}/kick`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`Kicked ${participantIdentity}`);
        setTimeout(checkRoomStatus, 1000);
      } else {
        const text = await response.text();
        alert(`Failed to kick. ${text}`);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error kicking participant');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBringLive = async (participantIdentity: string) => {
    setActionLoading(`live_${participantIdentity}`);
    try {
      await handleMuteParticipant(participantIdentity, false);
      console.log(`${participantIdentity} is now live`);
      checkRoomStatus();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleHoldParticipant = async (participantIdentity: string) => {
    setActionLoading(`hold_${participantIdentity}`);
    try {
      await handleMuteParticipant(participantIdentity, true);
      console.log(`${participantIdentity} on hold`);
      checkRoomStatus();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Multicasting (RTMP to social) ----

  const startMulticasting = async () => {
    try {
      setMulticastStatus('starting');
      const response = await fetch('/api/webrtc/egress/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_track_composite',
          room_name: ROOM_ID,
          audio_track_id: trackStatus.audio_track_id,
          video_track_id: trackStatus.video_track_id,
          encoding_preset: encodingPreset
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setIsMulticasting(true);
          setMulticastStatus('active');
          alert(`✅ Multicasting started!`);
        } else {
          setMulticastStatus('error');
          alert(`❌ Failed: ${data.message || 'Unknown error'}`);
        }
      } else {
        const data = await response.json();
        setMulticastStatus('error');
        alert(`❌ Failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setMulticastStatus('error');
      alert('❌ Error starting multicasting');
    }
  };

  const stopMulticasting = async () => {
    try {
      setMulticastStatus('stopping');
      const response = await fetch('/api/webrtc/egress/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          room_name: ROOM_ID
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setIsMulticasting(false);
          setMulticastStatus('idle');
          alert('✅ Multicasting stopped!');
        } else {
          setMulticastStatus('error');
          alert(`❌ Failed: ${data.message || 'Unknown error'}`);
        }
      } else {
        const data = await response.json();
        setMulticastStatus('error');
        alert(`❌ ${data.message || 'Failed to stop multicasting'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setMulticastStatus('error');
      alert('❌ Error stopping multicasting');
    }
  };

  // ---- Recording (file egress to recordings folder) ----

  const startRecording = async () => {
    try {
      setRecordStatus('starting');
      const response = await fetch('/api/webrtc/egress/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_record',
          room_name: ROOM_ID,
          encoding_preset: encodingPreset
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setIsRecording(true);
          setRecordStatus('active');
          alert(`✅ Recording started! Egress ID: ${data.egress_id}`);
        } else {
          setRecordStatus('error');
          alert(`❌ Failed: ${data.message || 'Unknown error'}`);
        }
      } else {
        const data = await response.json();
        setRecordStatus('error');
        alert(`❌ Failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setRecordStatus('error');
      alert('❌ Error starting recording');
    }
  };

  const stopRecording = async () => {
    try {
      setRecordStatus('stopping');
      const response = await fetch('/api/webrtc/egress/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop_record',
          room_name: ROOM_ID
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setIsRecording(false);
          setRecordStatus('idle');
          alert(`✅ Recording stopped!`);
        } else {
          setRecordStatus('error');
          alert(`❌ Failed: ${data.message || 'Unknown error'}`);
        }
      } else {
        const data = await response.json();
        setRecordStatus('error');
        alert(`❌ ${data.message || 'Failed to stop recording'}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setRecordStatus('error');
      alert('❌ Error stopping recording');
    }
  };

  const generateGuestLink = () => {
    const link = `${window.location.origin}/guest-room`;
    setGuestLink(link);
    copyToClipboard(link, 'guest-link');
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 3000);
  };

  const openHostStudio = () => {
    window.open(hostUrl, '_blank', 'width=1920,height=1080');
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-cyan-400 font-mono uppercase tracking-widest">Loading Director Control Center...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center p-8 bg-zinc-900/80 rounded-2xl border border-red-500/50 max-w-md">
            <div className="w-12 h-12 text-red-500 mx-auto mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Access Error</h2>
            <p className="text-zinc-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-cyan-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-cyan-500 transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tighter">
                  <span className="text-cyan-500">DIRECTOR CONTROL</span>
                  <span className="text-zinc-500 mx-2">|</span>
                  <span className="text-white">LiveKit Studio</span>
                </h1>
                <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest">
                  {session?.user?.name || 'Director'} • Room: {ROOM_ID}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                    connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className={`font-bold text-sm uppercase ${
                    connectionStatus === 'connected' ? 'text-green-400' : 
                    connectionStatus === 'checking' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {connectionStatus === 'connected' ? 'LIVEKIT ONLINE' : 
                     connectionStatus === 'checking' ? 'CHECKING...' : 'LIVEKIT OFFLINE'}
                  </span>
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-zinc-400 hover:text-white text-sm font-bold uppercase tracking-widest"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Controls */}
            <div className="lg:col-span-2 space-y-8">
              {/* Status Card */}
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                      <Video className="w-5 h-5 text-cyan-500" />
                      Studio Status
                    </h2>
                    <p className="text-zinc-500 text-sm">LiveKit WebRTC Broadcasting</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold ${
                    roomStatus.is_live 
                      ? 'bg-green-900/30 text-green-400 border border-green-500/50 animate-pulse' 
                      : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/50'
                  }`}>
                    {roomStatus.is_live ? '🔴 LIVE' : '⏸️ STANDBY'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-zinc-900/70 rounded-lg p-4">
                    <div className="text-zinc-400 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" /> Total Participants
                    </div>
                    <div className="text-2xl font-bold text-white mt-2">{roomStatus.participant_count}</div>
                  </div>
                  <div className="bg-zinc-900/70 rounded-lg p-4">
                    <div className="text-zinc-400 text-sm flex items-center gap-2">
                      <Monitor className="w-4 h-4" /> Host Status
                    </div>
                    <div className={`text-lg font-bold mt-2 ${roomStatus.host_connected ? 'text-green-400' : 'text-yellow-400'}`}>
                      {roomStatus.host_connected ? 'ACTIVE' : 'OFFLINE'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/70 rounded-lg p-4">
                    <div className="text-zinc-400 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Time
                    </div>
                    <div className="text-lg font-bold text-white mt-2">{formatTime()}</div>
                  </div>
                  <div className="bg-zinc-900/70 rounded-lg p-4">
                    <div className="text-zinc-400 text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Platform
                    </div>
                    <div className="text-lg font-bold text-cyan-400 mt-2">LiveKit</div>
                  </div>
                </div>
                
                {/* Track & Egress Status */}
                <div className="mb-6 p-4 bg-zinc-900/70 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center justify-between">
                    <span>Stream Status</span>
                    <div className="flex gap-2">
                      <button onClick={checkTrackStatus} className="text-xs px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Tracks
                      </button>
                      <button onClick={checkEgressStatus} className="text-xs px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Egress
                      </button>
                    </div>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${trackStatus.video_track_id ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Video: {trackStatus.video_track_id ? '✅ Detected' : '❌ Not detected'}</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${trackStatus.audio_track_id ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">Audio: {trackStatus.audio_track_id ? '✅ Detected' : '❌ Not detected'}</span>
                    </div>
                  </div>
                  {/* Egress status */}
                  {(egressStatus.is_running || egressStatus.is_recording) && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <div className="text-sm">
                        <span className="text-zinc-400">Active Egress:</span>
                        {egressStatus.is_recording && <span className="ml-2 text-green-400 font-bold">🔴 Recording</span>}
                        {egressStatus.is_running && !egressStatus.is_recording && <span className="ml-2 text-blue-400 font-bold">📡 Streaming</span>}
                        {egressStatus.egress_id && (
                          <span className="ml-2 text-xs text-zinc-500 font-mono">ID: {egressStatus.egress_id.substring(0, 12)}...</span>
                        )}
                      </div>
                    </div>
                  )}
                  {trackStatus.host_video_id && (
                    <div className="mt-2 text-xs text-zinc-500 font-mono">
                      Host Video Track: {trackStatus.host_video_id}
                    </div>
                  )}
                  {trackStatus.host_audio_id && (
                    <div className="text-xs text-zinc-500 font-mono">
                      Host Audio Track: {trackStatus.host_audio_id}
                    </div>
                  )}
                </div>
                
                {/* Multicasting Controls */}
                <div className="mb-6 p-4 bg-zinc-900/70 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3">📡 Social Media Multicasting</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-zinc-400">Status: 
                        <span className={`ml-2 font-bold ${
                          multicastStatus === 'active' ? 'text-green-400' :
                          multicastStatus === 'starting' ? 'text-yellow-400' :
                          multicastStatus === 'stopping' ? 'text-yellow-400' :
                          multicastStatus === 'error' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {multicastStatus === 'active' ? 'ACTIVE' :
                           multicastStatus === 'starting' ? 'STARTING...' :
                           multicastStatus === 'stopping' ? 'STOPPING...' :
                           multicastStatus === 'error' ? 'ERROR' : 'IDLE'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">Streams to all enabled social platforms</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startMulticasting}
                        disabled={!trackStatus.video_track_id || !trackStatus.audio_track_id || isMulticasting || multicastStatus === 'starting'}
                        className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                          !trackStatus.video_track_id || !trackStatus.audio_track_id || isMulticasting || multicastStatus === 'starting'
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        <Radio className="w-4 h-4" /> Start
                      </button>
                      <button
                        onClick={stopMulticasting}
                        disabled={!isMulticasting || multicastStatus === 'stopping'}
                        className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                          !isMulticasting || multicastStatus === 'stopping'
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                      >
                        <StopCircle className="w-4 h-4" /> Stop
                      </button>
                    </div>
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-sm text-zinc-400">Aspect:</span>
                    <div className="flex bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                      <button
                        onClick={() => setEncodingPreset('portrait')}
                        className={`px-3 py-1.5 text-xs font-bold transition ${
                          encodingPreset === 'portrait' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                      >📱 Portrait 9:16</button>
                      <button
                        onClick={() => setEncodingPreset('landscape')}
                        className={`px-3 py-1.5 text-xs font-bold transition ${
                          encodingPreset === 'landscape' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                      >🖥️ Widescreen 16:9</button>
                    </div>
                    <span className="text-xs text-zinc-500">{encodingPreset === 'portrait' ? '1080×1920' : '1920×1080'}</span>
                  </div>
                </div>

                {/* Recording Controls */}
                <div className="mb-6 p-4 bg-zinc-900/70 rounded-lg border border-red-500/30">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Disc className="w-5 h-5 text-red-400" />
                    Recording (File Egress)
                  </h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-zinc-400">Status: 
                        <span className={`ml-2 font-bold ${
                          recordStatus === 'active' ? 'text-red-400' :
                          recordStatus === 'starting' ? 'text-yellow-400' :
                          recordStatus === 'stopping' ? 'text-yellow-400' :
                          recordStatus === 'error' ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {recordStatus === 'active' ? '🔴 RECORDING' :
                           recordStatus === 'starting' ? 'STARTING...' :
                           recordStatus === 'stopping' ? 'STOPPING...' :
                           recordStatus === 'error' ? 'ERROR' : 'IDLE'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Records to <code className="text-cyan-400">/opt/livekit/recordings/</code>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startRecording}
                        disabled={!trackStatus.video_track_id || isRecording || recordStatus === 'starting'}
                        className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                          !trackStatus.video_track_id || isRecording || recordStatus === 'starting'
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 animate-pulse'
                        }`}
                      >
                        <Disc className="w-4 h-4" /> Record
                      </button>
                      <button
                        onClick={stopRecording}
                        disabled={!isRecording || recordStatus === 'stopping'}
                        className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                          !isRecording || recordStatus === 'stopping'
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-zinc-600 hover:bg-zinc-700'
                        }`}
                      >
                        <StopCircle className="w-4 h-4" /> Stop
                      </button>
                    </div>
                  </div>
                  {egressStatus.egress_id && (
                    <div className="text-xs text-zinc-500 font-mono">
                      Egress ID: {egressStatus.egress_id}
                    </div>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={openHostStudio} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    <Monitor className="w-5 h-5" /> Host Studio
                  </button>
                  <button onClick={generateGuestLink} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    <LinkIcon className="w-5 h-5" /> Copy Guest Link
                  </button>
                  <button onClick={() => copyToClipboard(viewerLink, 'viewer-link')} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    <List className="w-5 h-5" /> Copy Viewer Link
                  </button>
                </div>
                
                {guestLink && (
                  <div className="mt-4 bg-zinc-900/70 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 mr-2 flex-shrink-0">Guest:</span>
                      <div className="truncate text-sm font-mono text-cyan-400 flex-1">{guestLink}</div>
                      <button onClick={() => copyToClipboard(guestLink, 'guest-link')} className="text-zinc-400 hover:text-white ml-2">
                        {copied === 'guest-link' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
                      <span className="text-xs text-zinc-400 mr-2 flex-shrink-0">Viewer:</span>
                      <div className="truncate text-sm font-mono text-teal-400 flex-1">{viewerLink}</div>
                      <button onClick={() => copyToClipboard(viewerLink, 'viewer-link')} className="text-zinc-400 hover:text-white ml-2">
                        {copied === 'viewer-link' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== ACTIVE GUESTS SECTION ===== */}
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-500" />
                    Guests ({guests.length})
                  </h2>
                  <button onClick={() => checkRoomStatus()} className="text-xs px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                
                {guests.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No guests connected</p>
                    <p className="text-sm text-zinc-600 mt-2">Share the guest link for camera+mic participants</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {guests.map(guest => {
                      const isMuting = actionLoading === `mute_${guest.identity}`;
                      const isKicking = actionLoading === `kick_${guest.identity}`;
                      const isLiving = actionLoading === `live_${guest.identity}`;
                      const isHolding = actionLoading === `hold_${guest.identity}`;

                      return (
                        <div key={guest.identity} className="bg-zinc-900/70 rounded-xl p-4 border border-zinc-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                                  <Camera className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${guest.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                              </div>
                              <div>
                                <h3 className="font-bold text-white">{guest.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                  <span className="font-mono text-xs">{guest.identity.substring(0, 12)}...</span>
                                  <span>•</span>
                                  <span className="text-xs">Joined: {guest.joined_at}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {guest.has_video && <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 rounded">🎥 Video</span>}
                                  {guest.has_audio && <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 rounded">🎙️ Audio</span>}
                                  {guest.video_track_id && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 rounded font-mono">Track: {guest.video_track_id.substring(0, 8)}</span>}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleBringLive(guest.identity)}
                                  disabled={isLiving}
                                  className="text-[10px] px-2 py-1 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                                  title="Bring live (unmute)"
                                >
                                  {isLiving ? "..." : "Live"}
                                </button>
                                <button
                                  onClick={() => handleHoldParticipant(guest.identity)}
                                  disabled={isHolding}
                                  className="text-[10px] px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                                  title="Put on hold (mute)"
                                >
                                  {isHolding ? "..." : "Hold"}
                                </button>
                              </div>
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleMuteParticipant(guest.identity, true)}
                                  disabled={isMuting}
                                  className="text-[10px] px-2 py-1 bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50"
                                >
                                  {isMuting ? "..." : "Mute"}
                                </button>
                                <button
                                  onClick={() => handleKickParticipant(guest.identity)}
                                  disabled={isKicking}
                                  className="text-[10px] px-2 py-1 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {isKicking ? "..." : "Kick"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ===== VIEWER QUEUE SECTION ===== */}
              <div className="bg-zinc-900/50 rounded-2xl border border-teal-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <List className="w-5 h-5 text-teal-500" />
                    Viewer Queue ({viewers.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    {viewers.filter(v => v.raised_hand).length > 0 && (
                      <span className="text-xs px-2 py-1 bg-yellow-600 rounded animate-pulse">
                        {viewers.filter(v => v.raised_hand).length} hand(s) raised
                      </span>
                    )}
                    <button onClick={() => checkRoomStatus()} className="text-xs px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {viewers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg">No viewers in queue</p>
                    <p className="text-sm text-zinc-600 mt-2">Share the viewer link for audio-only listeners</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewers.map(viewer => {
                      const isMuting = actionLoading === `mute_${viewer.identity}`;
                      const isKicking = actionLoading === `kick_${viewer.identity}`;
                      const isLiving = actionLoading === `live_${viewer.identity}`;
                      const isHolding = actionLoading === `hold_${viewer.identity}`;

                      return (
                        <div key={viewer.identity} className={`bg-zinc-900/70 rounded-xl p-4 border ${
                          viewer.raised_hand ? 'border-yellow-600/50' : 'border-zinc-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-600/30 to-blue-600/30 flex items-center justify-center">
                                  {viewer.raised_hand ? (
                                    <Hand className="w-6 h-6 text-yellow-400" />
                                  ) : (
                                    <Mic className="w-6 h-6 text-teal-400" />
                                  )}
                                </div>
                                {viewer.raised_hand && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-ping" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-bold text-white">{viewer.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                  <span className="font-mono text-xs">{viewer.identity.substring(0, 12)}...</span>
                                  <span>•</span>
                                  <span className={`text-xs ${viewer.raised_hand ? 'text-yellow-400 font-bold' : 'text-zinc-500'}`}>
                                    {viewer.raised_hand ? '✋ Hand raised!' : 'Audio-only'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleBringLive(viewer.identity)}
                                  disabled={isLiving}
                                  className="text-[10px] px-2 py-1 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                                  title="Bring in (unmute audio)"
                                >
                                  {isLiving ? "..." : "Bring In"}
                                </button>
                                <button
                                  onClick={() => handleHoldParticipant(viewer.identity)}
                                  disabled={isHolding}
                                  className="text-[10px] px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                                  title="Return to queue (mute)"
                                >
                                  {isHolding ? "..." : "Queue"}
                                </button>
                              </div>
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleMuteParticipant(viewer.identity, true)}
                                  disabled={isMuting}
                                  className="text-[10px] px-2 py-1 bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50"
                                >
                                  {isMuting ? "..." : "Mute"}
                                </button>
                                <button
                                  onClick={() => handleKickParticipant(viewer.identity)}
                                  disabled={isKicking}
                                  className="text-[10px] px-2 py-1 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {isKicking ? "..." : "Remove"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Host Studio Card */}
              <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 rounded-2xl border border-cyan-500/30 p-6">
                <h2 className="text-xl font-bold text-cyan-400 mb-4 uppercase tracking-tight">Host Studio</h2>
                <p className="text-cyan-200/60 text-sm mb-6">
                  Open the host studio for OBS integration and advanced controls.
                </p>
                <div className="bg-zinc-900/70 rounded-lg p-4 mb-4">
                  <div className="text-zinc-400 text-sm mb-2">Host Studio URL</div>
                  <div className="flex items-center justify-between">
                    <code className="text-cyan-400 font-mono text-sm truncate">{hostUrl}</code>
                    <button onClick={() => copyToClipboard(hostUrl, 'host-url')} className="text-zinc-400 hover:text-white ml-2">
                      {copied === 'host-url' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button onClick={openHostStudio} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-bold transition">
                  Launch Host Studio
                </button>
              </div>

              {/* Quick Links */}
              <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">Quick Links</h2>
                <div className="space-y-3">
                  <button onClick={() => window.open('/studio/host-control', '_blank')} className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-zinc-700 transition text-left flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Host Studio
                  </button>
                  <button onClick={() => window.open('/admin', '_blank')} className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-zinc-700 transition text-left flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Admin Dashboard
                  </button>
                  <button onClick={() => window.open('/admin/streaming', '_blank')} className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-zinc-700 transition text-left flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Streaming Admin
                  </button>
                  <button onClick={() => router.push('/dashboard')} className="w-full bg-zinc-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-zinc-700 transition text-left flex items-center gap-2">
                    <Video className="w-4 h-4" /> Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-zinc-800 bg-black py-6 px-4 mt-8">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-zinc-600 text-sm font-mono uppercase tracking-widest">LiveKit WebRTC Studio • Director Control Panel</p>
            <p className="text-zinc-700 text-xs mt-2">Room: {ROOM_ID} • Status: {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</p>
          </div>
        </footer>
      </div>
    </Layout>
  );
}

