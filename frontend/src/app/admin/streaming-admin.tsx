'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface StreamingPlatform {
  id: number;
  name: string;
  platform_type: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'owncast' | 'custom';
  rtmp_url: string;
  stream_key: string;
  is_enabled: boolean;
  is_active: boolean;
  last_test: string | null;
  test_status: boolean;
  youtube_broadcast_id: string | null;
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  tiktok_username: string | null;
  custom_settings: string | null;
  full_rtmp_url: string;
}

interface StreamingStatus {
  status: string;
  platforms: Array<{
    id: number;
    name: string;
    platform_type: string;
    is_enabled: boolean;
    is_active: boolean;
    test_status: boolean;
    last_test: string | null;
    full_rtmp_url: string | null;
  }>;
  current_session: {
    session_id: string;
    started_at: string;
    duration: number;
    viewer_count: number;
    bitrate: number;
    platform_count: number;
  } | null;
  total_platforms: number;
  active_platforms: number;
  timestamp: string;
}

interface StreamingAdminProps {
  accessToken: string;
  API_BASE: string;
}

 export default function StreamingAdmin({ accessToken, API_BASE }: StreamingAdminProps) {
  // ============================================================
  // STATE DECLARATIONS
  // ============================================================
  const [streamingPlatforms, setStreamingPlatforms] = useState<StreamingPlatform[]>([]);
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null);
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [showIngressForm, setShowIngressForm] = useState(false);
  const [showEgressForm, setShowEgressForm] = useState(false);
  const [owncastEnabled, setOwncastEnabled] = useState(true);
  const [generatedStreamKey, setGeneratedStreamKey] = useState<any>(null);
  const [egressConfig, setEgressConfig] = useState<any>(null);
  const [egressStatus, setEgressStatus] = useState<{
    is_running: boolean;
    egress_id: string | null;
    platforms: string[];
    started_at: string | null;
  } | null>(null);
  const [newPlatform, setNewPlatform] = useState({
    name: '',
    platform_type: 'youtube' as 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'owncast' | 'custom',
    rtmp_url: '',
    stream_key: '',
    is_enabled: true,
    youtube_broadcast_id: '',
    facebook_page_id: '',
    instagram_account_id: '',
    tiktok_username: '',
    custom_settings: ''
  });
  const [roomStatus, setRoomStatus] = useState<{ 
    host_present: boolean; 
    guest_present: boolean; 
    participant_count: number 
  } | null>(null);

  const [ingressConfig, setIngressConfig] = useState({
    room_name: 'Broadcast_Studio_A1',
    streamer_name: 'OBS Streamer',
    streamer_identity: `obs_${Date.now()}`,
    input_type: 'RTMP' as 'RTMP' | 'WHIP'
  });
  const [egressPlatforms, setEgressPlatforms] = useState<any[]>([]);
  const [trackIds, setTrackIds] = useState<{ audio: string | null; video: string | null }>({ audio: null, video: null });
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingPlatformId, setEditingPlatformId] = useState<number | null>(null);
  const [trackInfo, setTrackInfo] = useState<{participantCount?: number, lastChecked?: Date}>({});
  const [encodingPreset, setEncodingPreset] = useState<'portrait' | 'landscape'>('portrait');

  // Recording state (file egress)
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'starting' | 'recording' | 'stopping' | 'error'>('idle');
  const [recordingEgressId, setRecordingEgressId] = useState<string | null>(null);

  // ============================================================
  // RECORDING HANDLERS
  // ============================================================
  const handleStartRecord = async () => {
    try {
      setRecordingStatus('starting');
      // Use same-origin Next.js route handler (reliable, no CORS/asyncio issues)
      const response = await axios.post(`/api/webrtc/egress/`, {
        action: 'start_record',
        room_name: 'Broadcast_Studio_A1',
        encoding_preset: encodingPreset
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.data.status === 'success') {
        setRecordingStatus('recording');
        setRecordingEgressId(response.data.egress_id || null);
        alert('✅ Recording started! File will be saved to /recordings/');
      } else {
        setRecordingStatus('error');
        alert(`❌ Failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setRecordingStatus('error');
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      alert(`❌ Failed to start recording: ${msg}`);
    }
  };

  const handleStopRecord = async () => {
    try {
      setRecordingStatus('stopping');
      // Use same-origin Next.js route handler
      const response = await axios.post(`/api/webrtc/egress/`, {
        action: 'stop_record',
        room_name: 'Broadcast_Studio_A1'
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.data.status === 'success') {
        setRecordingStatus('idle');
        setRecordingEgressId(null);
        alert('✅ Recording stopped!');
      } else {
        setRecordingStatus('error');
        alert(`❌ Failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      setRecordingStatus('error');
      alert('❌ Failed to stop recording');
    }
  };

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================

  const fetchStreamingPlatforms = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/streaming-platforms/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStreamingPlatforms(response.data);
    } catch (error) {
      console.error('Error fetching streaming platforms:', error);
    }
  }, [accessToken, API_BASE]);

  const fetchStreamingStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/streaming-status/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStreamingStatus(response.data);
    } catch (error) {
      console.error('Error fetching streaming status:', error);
    }
  }, [accessToken, API_BASE]);

  const fetchEgressPlatforms = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/webrtc/egress/`, {
        action: 'list'
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.platforms && response.data.platforms.length > 0) {
        const loadedPlatforms = response.data.platforms.map((p: any) => ({
          id: p.id,
          name: p.name,
          platform_type: p.platform_type,
          rtmp_url: p.rtmp_url,
          stream_key: p.stream_key_masked || '',
          enabled: p.is_enabled
        }));
        setEgressPlatforms(loadedPlatforms);
      } else {
        setEgressPlatforms([
          { name: 'YouTube Live', platform_type: 'youtube', rtmp_url: '', stream_key: '', enabled: true },
          { name: 'Facebook Live', platform_type: 'facebook', rtmp_url: '', stream_key: '', enabled: true },
          { name: 'Instagram Live', platform_type: 'instagram', rtmp_url: '', stream_key: '', enabled: true },
          { name: 'Owncast', platform_type: 'owncast', rtmp_url: '', stream_key: '', enabled: true }
        ]);
      }
    } catch (error) {
      console.error('Error loading egress platforms:', error);
    }
  }, [accessToken, API_BASE]);

  const fetchRoomStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/livekit/room-status/`, {
        params: { room_name: 'Broadcast_Studio_A1' },
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setRoomStatus(response.data);
    } catch (error) {
      console.error('Error fetching room status:', error);
    }
  }, [accessToken, API_BASE]);
  
  const checkEgressStatus = useCallback(async () => {
    try {
      // Use same-origin Next.js route handler (reliable, no CORS/asyncio issues)
      const response = await axios.post(`/api/webrtc/egress/`, {
        action: 'status',
        room_name: 'Broadcast_Studio_A1'
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.status === 'success') {
        setEgressStatus({
          is_running: response.data.is_running,
          egress_id: response.data.egress_id,
          platforms: response.data.platforms || [],
          started_at: response.data.started_at
        });
      }
      return response.data;
    } catch (error) {
      console.error('Error checking egress status:', error);
      return { is_running: false };
    }
   }, [accessToken]);

  // ============================================================
  // FETCH TRACK IDS — uses same-origin Next.js route handler
  // ============================================================
  const fetchTrackIds = useCallback(async () => {
    try {
      const response = await axios.post(`/api/webrtc/egress/`, {
        action: 'get_track_ids',
        room_name: 'Broadcast_Studio_A1'
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.status === 'success') {
        setTrackIds({
          audio: response.data.audio_track_id,
          video: response.data.video_track_id
        });
        return {
          success: true,
          audio: response.data.audio_track_id,
          video: response.data.video_track_id,
          participantCount: response.data.participant_count || 0
        };
      }
      return { success: false };
    } catch (error) {
      console.error('Error fetching track IDs:', error);
      return { success: false, error };
    }
  }, []);

  // ============================================================
  // EFFECTS
  // ============================================================
   useEffect(() => {
     fetchStreamingPlatforms();
     fetchStreamingStatus();
     fetchEgressPlatforms();
     fetchRoomStatus();
     fetchTrackIds();  // Auto-detect tracks so Record buttons become enabled
     
     // Poll room status, track IDs, and egress status every 10 seconds
     const roomInterval = setInterval(() => {
       fetchRoomStatus();
       fetchTrackIds();  // Keep track IDs fresh so Record button stays accurate
       checkEgressStatus(); // Keep egress status/recording state in sync
     }, 10000);
     
     return () => {
       clearInterval(roomInterval);
     };
   }, [fetchStreamingPlatforms, fetchStreamingStatus, fetchEgressPlatforms, fetchRoomStatus, fetchTrackIds, checkEgressStatus]);

  // ============================================================
  // POLL EGRESS STATUS MORE FREQUENTLY WHEN STREAMING
  // ============================================================
  useEffect(() => {
    if (isStreaming) {
      checkEgressStatus();
      const egressInterval = setInterval(checkEgressStatus, 5000);
      return () => clearInterval(egressInterval);
    }
  }, [isStreaming, checkEgressStatus]);

  // ============================================================
  // UPDATE isStreaming from egressStatus
  // ============================================================
  useEffect(() => {
    if (egressStatus) {
      setIsStreaming(egressStatus.is_running);
      // Also sync recording status from egress data
      if (egressStatus.is_running) {
        // Check if the egress has file output (recording) vs stream output (RTMP)
        // The route handler's status response now includes is_recording
      }
    }
  }, [egressStatus]);

  // ============================================================
  // UNIFIED: Start streaming to specific platforms via egress endpoint
  // ============================================================
  const handleStartEgressToPlatforms = async (platformIds: number[]) => {
    try {
      const enabledPlatforms = streamingPlatforms.filter(p => platformIds.includes(p.id) && p.is_enabled);
      if (enabledPlatforms.length === 0) {
        alert('No enabled platforms found to start streaming to.');
        return;
      }

      const response = await axios.post(`${API_BASE}/api/webrtc/egress/`, {
        action: 'start_track_composite',
        room_name: 'Broadcast_Studio_A1',
        encoding_preset: encodingPreset,
        platform_ids: platformIds
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.data.status === 'success') {
        setIsStreaming(true);
        alert(`✅ Streaming started to ${enabledPlatforms.length} platform(s)!`);
        fetchStreamingStatus();
      } else {
        alert(`Error: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error starting egress:', error);
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Error starting stream: ${msg}`);
    }
  };

  // ============================================================
  // UNIFIED: Stop streaming via egress endpoint
  // ============================================================
  const handleStopEgress = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/webrtc/egress/`, {
        action: 'stop',
        room_name: 'Broadcast_Studio_A1'
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.status === 'success') {
        setIsStreaming(false);
        alert('✅ Stream stopped!');
        fetchStreamingStatus();
      } else {
        alert('Stream stopped.');
        setIsStreaming(false);
      }
    } catch (error) {
      console.error('Error stopping egress:', error);
      alert('Error stopping stream. Check console for details.');
    }
  };

  // ============================================================
  // HANDLER FUNCTIONS
  // ============================================================

  const handleCreatePlatform = async () => {
    try {
      await axios.post(`${API_BASE}/api/streaming-platforms/`, newPlatform, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchStreamingPlatforms();
      setShowPlatformForm(false);
      setNewPlatform({
        name: '',
        platform_type: 'youtube',
        rtmp_url: '',
        stream_key: '',
        is_enabled: true,
        youtube_broadcast_id: '',
        facebook_page_id: '',
        instagram_account_id: '',
        tiktok_username: '',
        custom_settings: ''
      });
    } catch (error) {
      console.error('Error creating platform:', error);
      alert('Error creating platform. Please check the form data.');
    }
  };

  const handleEditPlatform = (platform: StreamingPlatform) => {
    setEditingPlatformId(platform.id);
    setNewPlatform({
      name: platform.name,
      platform_type: platform.platform_type,
      rtmp_url: platform.rtmp_url,
      stream_key: platform.stream_key,
      is_enabled: platform.is_enabled,
      youtube_broadcast_id: platform.youtube_broadcast_id || '',
      facebook_page_id: platform.facebook_page_id || '',
      instagram_account_id: platform.instagram_account_id || '',
      tiktok_username: platform.tiktok_username || '',
      custom_settings: platform.custom_settings || ''
    });
    setShowPlatformForm(true);
  };
  
  const handleUpdatePlatform = async (platformId: number) => {
  try {
    await axios.put(`${API_BASE}/api/streaming-platforms/${platformId}/`, newPlatform, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    alert('Platform updated successfully!');
    setShowPlatformForm(false);
    setEditingPlatformId(null);
    fetchStreamingPlatforms();
    fetchEgressPlatforms();
    // Reset form
    setNewPlatform({
      name: '',
      platform_type: 'youtube',
      rtmp_url: '',
      stream_key: '',
      is_enabled: true,
      youtube_broadcast_id: '',
      facebook_page_id: '',
      instagram_account_id: '',
      tiktok_username: '',
      custom_settings: ''
    });
  } catch (error) {
    console.error('Error updating platform:', error);
    alert('Error updating platform.');
  }
};

  const handleDeletePlatform = async (platformId: number) => {
  if (!confirm('Are you sure you want to delete this platform?')) return;
  
  try {
    await axios.delete(`${API_BASE}/api/streaming-platforms/${platformId}/`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    alert('Platform deleted successfully!');
    fetchStreamingPlatforms();
    fetchEgressPlatforms();
  } catch (error) {
    console.error('Error deleting platform:', error);
    alert('Error deleting platform.');
  }
};

  const handleTogglePlatformEnabled = async (platformId: number, isEnabled: boolean) => {
    try {
      await axios.post(`${API_BASE}/api/streaming-platforms/${platformId}/toggle_enabled/`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchStreamingPlatforms();
    } catch (error) {
      console.error('Error toggling platform:', error);
    }
  };

  const handleTestPlatformConnection = async (platformId: number) => {
    try {
      await axios.post(`${API_BASE}/api/streaming-platforms/${platformId}/test_connection/`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchStreamingPlatforms();
      alert('Connection test completed.');
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Error testing connection.');
    }
  };

  const getPlatformTypeColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-600';
      case 'facebook': return 'bg-blue-600';
      case 'instagram': return 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400';
      case 'tiktok': return 'bg-black';
      case 'owncast': return 'bg-purple-600';
      case 'custom': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getPlatformTypeName = (type: string) => {
    switch (type) {
      case 'youtube': return 'YouTube Live';
      case 'facebook': return 'Facebook Live';
      case 'instagram': return 'Instagram Live';
      case 'tiktok': return 'TikTok Live';
      case 'owncast': return 'Owncast';
      case 'custom': return 'Custom Platform';
      default: return type;
    }
  };

  const handleGenerateStreamKey = async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/webrtc/stream-key/`, ingressConfig, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setGeneratedStreamKey(response.data);
      alert('Stream key generated successfully!');
    } catch (error) {
      console.error('Error generating stream key:', error);
      alert('Error generating stream key. Check console for details.');
    }
  };

  const handleConfigureEgress = async () => {
    try {
      setEgressConfig({
        status: 'configured',
        room_name: 'Broadcast_Studio_A1',
        egress_configs: egressPlatforms.filter(p => p.enabled).length
      });
      
      alert('Egress configuration updated locally. Platforms are configured in database.');
      await fetchEgressPlatforms();
    } catch (error) {
      console.error('Error configuring egress:', error);
      alert('Error configuring egress. Check console for details.');
    }
  };

  const handleStartMulticasting = async () => {
    try {
      const enabledPlatforms = streamingPlatforms.filter(p => p.is_enabled);
      if (enabledPlatforms.length === 0) {
        alert('No enabled platforms found. Please enable at least one platform first.');
        return;
      }

      await handleStartEgressToPlatforms(enabledPlatforms.map(p => p.id));
    } catch (error) {
      console.error('Error starting multicasting:', error);
      alert('Error starting multicasting. Check console for details.');
    }
  };

  const handleStopMulticasting = async () => {
    await handleStopEgress();
  };

  const handleRefreshTrackIds = async () => {
    try {
      const result = await fetchTrackIds();
      if (result.success) {
        setTrackInfo({
          participantCount: result.participantCount,
          lastChecked: new Date()
        });
        alert(`✅ Track IDs refreshed! Found ${result.participantCount || 0} participant(s) in room.`);
      } else {
        alert('❌ Failed to refresh track IDs. Make sure OBS is streaming to LiveKit.');
      }
    } catch (error) {
      console.error('Error refreshing track IDs:', error);
      alert('Error refreshing track IDs.');
    }
  };
 
  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Streaming Platform Management</h2>
        <button 
          onClick={() => setShowPlatformForm(!showPlatformForm)}
          className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
        >
          {showPlatformForm ? 'Cancel' : '+ Add Platform'}
        </button>
      </div>

      {/* ============================================================
      STREAM STATUS DASHBOARD
      ============================================================ */}
      {streamingStatus && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Stream Status Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* 1. STREAMING STATUS CARD */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Stream Status</h4>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${streamingStatus.current_session ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-2xl font-bold">
                  {streamingStatus.current_session ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              {streamingStatus.current_session && (
                <div className="mt-2 text-xs text-zinc-400">
                  <div>Duration: {Math.floor(streamingStatus.current_session.duration / 60)}m {streamingStatus.current_session.duration % 60}s</div>
                  <div>Viewers: {streamingStatus.current_session.viewer_count}</div>
                </div>
              )}
            </div>
            
            {/* 2. ROOM STATUS CARD */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Room Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Host:</span>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${roomStatus?.host_present ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-medium ${roomStatus?.host_present ? 'text-green-400' : 'text-red-400'}`}>
                      {roomStatus?.host_present ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Guest:</span>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${roomStatus?.guest_present ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className={`text-sm font-medium ${roomStatus?.guest_present ? 'text-green-400' : 'text-yellow-400'}`}>
                      {roomStatus?.guest_present ? 'Connected' : 'Waiting'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Participants:</span>
                  <span className="text-sm font-bold text-white">{roomStatus?.participant_count || 0}</span>
                </div>
              </div>
            </div>
            
            {/* 3. PLATFORMS CARD */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Platforms</h4>
              <div className="text-3xl font-bold">{streamingStatus.total_platforms}</div>
              <div className="text-sm text-zinc-400 mt-1">
                {streamingStatus.active_platforms} active
              </div>
            </div>
            
            {/* 4. OWNCAST STATUS CARD */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Owncast Status</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${owncastEnabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-xl font-bold">
                    {owncastEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <button 
                  onClick={() => setOwncastEnabled(!owncastEnabled)}
                  className={`px-3 py-1 rounded text-xs ${owncastEnabled ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'} transition`}
                >
                  {owncastEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              <div className="text-xs text-zinc-400 mt-2">
                live.yourdomain.com
              </div>
            </div>
            
            {/* 5. QUICK ACTIONS CARD - ALL BUTTONS USE EGRESS ENDPOINT */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleStartEgressToPlatforms(streamingPlatforms.filter(p => p.is_enabled).map(p => p.id))}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-500 transition disabled:opacity-50"
                  disabled={isStreaming || !roomStatus?.host_present}
                >
                  Start All
                </button>
                <button 
                  onClick={handleStopEgress}
                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-500 transition disabled:opacity-50"
                  disabled={!isStreaming}
                >
                  Stop All
                </button>
                <button 
                  onClick={() => handleStartEgressToPlatforms(streamingPlatforms.filter(p => p.is_enabled).map(p => p.id))}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-500 transition disabled:opacity-50"
                  disabled={isStreaming || !roomStatus?.host_present}
                >
                  🚀 Start Stream
                </button>
                <button 
                  onClick={handleStopEgress}
                  className="bg-red-700 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition disabled:opacity-50"
                  disabled={!isStreaming}
                >
                  🛑 Stop Stream
                </button>
              </div>
              {trackIds.video && (
                <div className="text-xs text-zinc-500 mt-3 pt-2 border-t border-zinc-700">
                  Video: {trackIds.video.slice(0, 8)}... | Audio: {trackIds.audio?.slice(0, 8)}...
                </div>
              )}
            </div>

            {/* 6. EGRESS STATUS CARD */}
            {egressStatus && (
              <div className={`rounded-xl p-4 border ${
                egressStatus.is_running 
                  ? 'bg-green-900/20 border-green-500/50' 
                  : 'bg-zinc-900/50 border-zinc-800'
              }`}>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Egress Status</h4>
                {egressStatus.is_running ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-bold text-sm">ACTIVE</span>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>ID: {egressStatus.egress_id?.slice(0, 12)}...</div>
                      <div>Started: {egressStatus.started_at ? new Date(egressStatus.started_at).toLocaleTimeString() : 'N/A'}</div>
                      <div>Platforms: {egressStatus.platforms.length > 0 ? egressStatus.platforms.map(p => {
                        if (p.includes('youtube')) return 'YouTube';
                        if (p.includes('facebook')) return 'Facebook';
                        if (p.includes('instagram')) return 'Instagram';
                        return p;
                      }).join(', ') : 'None'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-400 text-sm">No active egress</span>
                  </div>
                )}
              </div>
            )}

            {/* 7. RECORDING CARD */}
            <div className="bg-gradient-to-br from-red-900/20 to-zinc-900/20 rounded-xl p-4 border border-red-500/30">
              <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Recording (File Egress)
              </h4>
              <p className="text-xs text-zinc-500 mb-3">
                Record the room to local disk. Saves to /recordings/ directory.
              </p>
              
              <div className="bg-zinc-900/70 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    recordingStatus === 'recording' ? 'bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse' :
                    recordingStatus === 'starting' ? 'bg-yellow-900/50 text-yellow-400' :
                    recordingStatus === 'stopping' ? 'bg-yellow-900/50 text-yellow-400' :
                    recordingStatus === 'error' ? 'bg-red-900/50 text-red-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {recordingStatus === 'recording' ? '🔴 RECORDING' :
                     recordingStatus === 'starting' ? 'STARTING...' :
                     recordingStatus === 'stopping' ? 'STOPPING...' :
                     recordingStatus === 'error' ? 'ERROR' : 'STOPPED'}
                  </span>
                </div>
                {recordingEgressId && (
                  <div className="text-[10px] text-zinc-600 mt-1 truncate">Egress: {recordingEgressId.slice(0, 20)}...</div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleStartRecord}
                  disabled={!trackIds.video || recordingStatus === 'recording' || recordingStatus === 'starting'}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold transition text-xs flex items-center justify-center gap-1 ${
                    !trackIds.video || recordingStatus === 'recording' || recordingStatus === 'starting'
                      ? 'bg-gray-700 cursor-not-allowed text-zinc-500'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {recordingStatus === 'recording' ? '🔴 Recording...' : '🎬 Start Record'}
                </button>
                <button
                  onClick={handleStopRecord}
                  disabled={recordingStatus !== 'recording'}
                  className={`flex-1 px-3 py-2 rounded-lg font-bold transition text-xs flex items-center justify-center gap-1 ${
                    recordingStatus !== 'recording'
                      ? 'bg-gray-700 cursor-not-allowed text-zinc-500'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  ⏹️ Stop Record
                </button>
              </div>
              
              <div className="mt-2 text-[10px] text-zinc-600 text-center">
                Aspect: {encodingPreset === 'portrait' ? '9:16 Portrait' : '16:9 Landscape'} • File: recordings/{'>'}room/{'{time}'}
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Add/Edit Platform Form */}
      {showPlatformForm && (
        <div className="mb-8 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
          <h3 className="text-xl font-bold mb-4">
            {editingPlatformId ? 'Edit Streaming Platform' : 'Add New Streaming Platform'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Platform Name</label>
              <input
                type="text"
                value={newPlatform.name}
                onChange={(e) => setNewPlatform({...newPlatform, name: e.target.value})}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                placeholder="e.g., My YouTube Channel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Platform Type</label>
              <select
                value={newPlatform.platform_type}
                onChange={(e) => setNewPlatform({...newPlatform, platform_type: e.target.value as any})}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="youtube">YouTube Live</option>
                <option value="facebook">Facebook Live</option>
                <option value="instagram">Instagram Live</option>
                <option value="tiktok">TikTok Live</option>
                <option value="owncast">Owncast</option>
                <option value="custom">Custom Platform</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RTMP URL</label>
              <input
                type="text"
                value={newPlatform.rtmp_url}
                onChange={(e) => setNewPlatform({...newPlatform, rtmp_url: e.target.value})}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                placeholder="e.g., rtmp://a.rtmp.youtube.com/live2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stream Key</label>
              <input
                type="password"
                value={newPlatform.stream_key}
                onChange={(e) => setNewPlatform({...newPlatform, stream_key: e.target.value})}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                placeholder="Your stream key"
              />
            </div>
            {newPlatform.platform_type === 'youtube' && (
              <div>
                <label className="block text-sm font-medium mb-1">YouTube Broadcast ID (optional)</label>
                <input
                  type="text"
                  value={newPlatform.youtube_broadcast_id}
                  onChange={(e) => setNewPlatform({...newPlatform, youtube_broadcast_id: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="YouTube broadcast ID"
                />
              </div>
            )}
            {newPlatform.platform_type === 'facebook' && (
              <div>
                <label className="block text-sm font-medium mb-1">Facebook Page ID (optional)</label>
                <input
                  type="text"
                  value={newPlatform.facebook_page_id}
                  onChange={(e) => setNewPlatform({...newPlatform, facebook_page_id: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Facebook page ID"
                />
              </div>
            )}
            {newPlatform.platform_type === 'instagram' && (
              <div>
                <label className="block text-sm font-medium mb-1">Instagram Account ID (optional)</label>
                <input
                  type="text"
                  value={newPlatform.instagram_account_id}
                  onChange={(e) => setNewPlatform({...newPlatform, instagram_account_id: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Instagram account ID"
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            {editingPlatformId ? (
              <button
                onClick={() => handleUpdatePlatform(editingPlatformId)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition"
              >
                Update Platform
              </button>
            ) : (
              <button
                onClick={handleCreatePlatform}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-500 transition"
              >
                Create Platform
              </button>
            )}
            <button
              onClick={() => {
                setShowPlatformForm(false);
                setEditingPlatformId(null);
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Platforms List */}
      <div className="grid gap-6">
        {streamingPlatforms.map((platform) => (
          <div key={platform.id} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getPlatformTypeColor(platform.platform_type)}`}>
                    {getPlatformTypeName(platform.platform_type)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${platform.is_enabled ? 'bg-green-600' : 'bg-gray-600'}`}>
                    {platform.is_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                  {platform.is_active && (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-600 animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold">{platform.name}</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  RTMP: {platform.rtmp_url}
                </p>
                {platform.full_rtmp_url && (
                  <p className="text-zinc-500 text-xs mt-1 truncate">
                    Full URL: {platform.full_rtmp_url}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
                <button
                  onClick={() => handleTogglePlatformEnabled(platform.id, platform.is_enabled)}
                  className={`px-3 py-1 rounded text-sm ${platform.is_enabled ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'} transition`}
                >
                  {platform.is_enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleTestPlatformConnection(platform.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-500 transition"
                >
                  Test
                </button>
                <button
                  onClick={() => handleEditPlatform(platform)}
                  className="bg-cyan-600 text-white px-3 py-1 rounded text-sm hover:bg-cyan-500 transition"
                >
                  Edit
                </button>
              </div>
              
              <div className="flex space-x-3">
                {/* INDIVIDUAL START - Now uses the same egress endpoint as main buttons */}
                <button
                  onClick={() => handleStartEgressToPlatforms([platform.id])}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition disabled:opacity-50"
                  disabled={!platform.is_enabled || platform.is_active || isStreaming}
                >
                  Start Streaming
                </button>
                {/* INDIVIDUAL STOP - Now uses the same egress endpoint as main buttons */}
                <button
                  onClick={handleStopEgress}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition disabled:opacity-50"
                  disabled={!platform.is_active && !isStreaming}
                >
                  Stop Streaming
                </button>
                
                <button
                  onClick={() => handleDeletePlatform(platform.id)}
                  className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
        ))}
      </div>

      {/* LiveKit Ingress (OBS Stream Key Generation) */}
      <div className="mt-8 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">LiveKit Ingress - OBS Stream Key</h3>
          <button 
            onClick={() => setShowIngressForm(!showIngressForm)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-500 transition"
          >
            {showIngressForm ? 'Hide' : 'Generate Stream Key'}
          </button>
        </div>
        
        {showIngressForm && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room Name</label>
                <input
                  type="text"
                  value={ingressConfig.room_name}
                  onChange={(e) => setIngressConfig({...ingressConfig, room_name: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Broadcast_Studio_A1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Streamer Name</label>
                <input
                  type="text"
                  value={ingressConfig.streamer_name}
                  onChange={(e) => setIngressConfig({...ingressConfig, streamer_name: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  placeholder="OBS Streamer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Input Type</label>
                <select
                  value={ingressConfig.input_type}
                  onChange={(e) => setIngressConfig({...ingressConfig, input_type: e.target.value as 'RTMP' | 'WHIP'})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="RTMP">RTMP (OBS, Streamlabs)</option>
                  <option value="WHIP">WHIP (Browser-based)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGenerateStreamKey}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition"
                >
                  Generate Stream Key
                </button>
              </div>
            </div>
            
			{/* Display generated stream info */}
			{generatedStreamKey && (
			  <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-cyan-500/30">
				<h4 className="text-lg font-bold mb-3 text-cyan-400">
				  {generatedStreamKey.input_type === 'WHIP' ? '🌐 WHIP Stream Settings (Browser-based)' : '🎥 RTMP Stream Settings (OBS)'}
				</h4>
				<div className="space-y-3">
				  <div>
					<span className="text-zinc-400 text-sm">
					  {generatedStreamKey.input_type === 'WHIP' ? 'WHIP Endpoint URL:' : 'Server URL:'}
					</span>
					<div className="bg-black/80 p-2 rounded mt-1 font-mono text-sm break-all flex justify-between items-center border border-zinc-700">
					  <span className="text-cyan-400">
						{generatedStreamKey.input_type === 'WHIP' 
						  ? generatedStreamKey.url 
						  : (generatedStreamKey.full_rtmp_url?.split('/').slice(0, -1).join('/') || generatedStreamKey.url)}
					  </span>
					  <button 
						onClick={() => navigator.clipboard.writeText(
						  generatedStreamKey.input_type === 'WHIP' 
							? generatedStreamKey.url 
							: (generatedStreamKey.full_rtmp_url?.split('/').slice(0, -1).join('/') || generatedStreamKey.url)
						)}
						className="ml-2 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition"
					  >
						📋 Copy
					  </button>
					</div>
				  </div>
				  <div>
					<span className="text-zinc-400 text-sm">Stream Key / Token:</span>
					<div className="bg-black/80 p-2 rounded mt-1 font-mono text-sm break-all flex justify-between items-center border border-zinc-700">
					  <span className="text-yellow-400">{generatedStreamKey.stream_key}</span>
					  <button 
						onClick={() => navigator.clipboard.writeText(generatedStreamKey.stream_key)}
						className="ml-2 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition"
					  >
						📋 Copy
					  </button>
					</div>
				  </div>
				  
				  {/* WHIP-specific instructions */}
				  {generatedStreamKey.input_type === 'WHIP' && (
					<div className="text-sm text-green-400 mt-3 pt-2 border-t border-zinc-700">
					  💡 <strong>WHIP Browser Setup:</strong>
					  <ul className="list-disc ml-5 mt-2 space-y-1 text-zinc-300">
						<li>Use with <strong>WHIP-compatible browser clients</strong> (WebRTC-based)</li>
						<li>Supports <strong>ultra-low latency</strong> streaming directly from the browser</li>
						<li>No additional software like OBS required</li>
						<li>Great for <strong>live interviews, gaming, or real-time broadcasts</strong></li>
						<li>Use the URL and Stream Key with any WHIP client library</li>
					  </ul>
					</div>
				  )}
				  
				  {/* RTMP-specific instructions */}
				  {generatedStreamKey.input_type === 'RTMP' && (
					<div className="text-sm text-cyan-400 mt-3 pt-2 border-t border-zinc-700">
					  💡 <strong>OBS Setup Instructions:</strong>
					  <ul className="list-disc ml-5 mt-2 space-y-1 text-zinc-300">
						<li>Open OBS → <strong>Settings</strong> → <strong>Stream</strong></li>
						<li>Set <strong>Service</strong> to <strong>Custom...</strong></li>
						<li><strong>Server:</strong> Paste the Server URL above</li>
						<li><strong>Stream Key:</strong> Paste the Stream Key above</li>
						<li>Click <strong>OK</strong>, then click <strong>Start Streaming</strong></li>
					  </ul>
					</div>
				  )}
				  
				  {generatedStreamKey.note && (
					<div className="text-sm text-yellow-400 mt-2">
					  ⚠️ Note: {generatedStreamKey.note}
					</div>
				  )}
				</div>
			  </div>
			)}
              </div>
            )}
      </div>

      {/* LiveKit Egress (Social Media Multicasting) */}
      <div className="mt-8 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">LiveKit Egress - Social Media Multicasting</h3>
          <button 
            onClick={() => setShowEgressForm(!showEgressForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500 transition"
          >
            {showEgressForm ? 'Hide' : 'Configure Multicasting'}
          </button>
        </div>
        
        {showEgressForm && (
          <div className="mt-4">
            <div className="mb-6">
              <h4 className="text-lg font-bold mb-3">Configure Social Media Platforms</h4>
              <div className="space-y-4">
                {egressPlatforms.map((platform, index) => (
                  <div key={index} className="bg-zinc-800/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={platform.enabled}
                          onChange={(e) => {
                            const newPlatforms = [...egressPlatforms];
                            newPlatforms[index].enabled = e.target.checked;
                            setEgressPlatforms(newPlatforms);
                          }}
                          className="mr-2"
                        />
                        <span className="font-bold">{platform.name}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs text-white ${getPlatformTypeColor(platform.platform_type)}`}>
                          {getPlatformTypeName(platform.platform_type)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">RTMP URL</label>
                        <input
                          type="text"
                          value={platform.rtmp_url}
                          onChange={(e) => {
                            const newPlatforms = [...egressPlatforms];
                            newPlatforms[index].rtmp_url = e.target.value;
                            setEgressPlatforms(newPlatforms);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                          placeholder="rtmp://a.rtmp.youtube.com/live2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">Stream Key</label>
                        <input
                          type="password"
                          value={platform.stream_key}
                          onChange={(e) => {
                            const newPlatforms = [...egressPlatforms];
                            newPlatforms[index].stream_key = e.target.value;
                            setEgressPlatforms(newPlatforms);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm"
                          placeholder="Your stream key"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleConfigureEgress}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition"
                title="Update local egress configuration"
              >
                Configure Egress
              </button>
              
              <button
                onClick={handleStartMulticasting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!egressConfig || isStreaming}
                title={!egressConfig ? "Configure egress first" : isStreaming ? "Stream is already running" : "Start multicasting to all enabled platforms"}
              >
                🚀 Start Multicasting
              </button>
              
              <button
                onClick={handleStopMulticasting}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isStreaming}
                title={!isStreaming ? "No active stream to stop" : "Stop multicasting to all platforms"}
              >
                Stop Multicasting
              </button>
            </div>
            
            {/* Track Availability Status */}
            <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
              <h4 className="text-lg font-bold mb-2">Stream Status</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${trackIds.video ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    Video Track: {trackIds.video ? '✅ Available' : '❌ Not detected'}
                  </span>
                  {trackIds.video && (
                    <span className="ml-2 text-xs text-zinc-400">
                      ID: {trackIds.video?.slice(0, 10) || ''}...
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${trackIds.audio ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    Audio Track: {trackIds.audio ? '✅ Available' : '❌ Not detected'}
                  </span>
                  {trackIds.audio && (
                    <span className="ml-2 text-xs text-zinc-400">
                      ID: {trackIds.audio?.slice(0, 10) || ''}...
                    </span>
                  )}
                </div>
                <div className="text-sm text-cyan-400 mt-2">
                  💡 <strong>Note:</strong> Tracks appear when OBS is streaming to LiveKit. 
                  Make sure OBS is connected and streaming first.
                </div>
              </div>
            </div>
            
            {egressConfig && (
              <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
                <h4 className="text-lg font-bold mb-2">Egress Configuration</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-zinc-400">Status:</span>
                    <span className="ml-2 text-green-400">{egressConfig.status}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Room:</span>
                    <span className="ml-2">{egressConfig.room_name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Platforms Configured:</span>
                    <span className="ml-2">{egressConfig.egress_configs?.length || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions for OBS Studio */}
      <div className="mt-8 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
        <h3 className="text-xl font-bold mb-4">OBS Studio Setup Instructions</h3>
        <div className="space-y-3 text-zinc-300">
          <p>1. Open OBS Studio and go to <strong>Settings → Stream</strong></p>
          <p>2. Set <strong>Service</strong> to <strong>Custom...</strong></p>
          <p>3. For each platform above, use the <strong>Full RTMP URL</strong> as the Server</p>
          <p>4. Leave Stream Key blank (it's included in the URL)</p>
          <p>5. Click <strong>+</strong> in Output Destinations to add multiple platforms</p>
          <p>6. OBS will multicast to all enabled platforms simultaneously</p>
        </div>
        <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
          <p className="text-sm text-cyan-400">
            💡 <strong>Tip:</strong> Your nginx RTMP server is configured at <code>rtmp://localhost:1936/ingest</code>
          </p>
        </div>
      </div>
    </div>
  );
}
