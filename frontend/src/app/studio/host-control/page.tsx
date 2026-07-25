'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LiveKitRoom, useTracks, useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteParticipant, Track } from 'livekit-client';
import '@livekit/components-styles';
import { useSession } from 'next-auth/react';

export const dynamic = 'force-dynamic';
function StudioContent({ 
  selectedGuest, 
  showGuestVideo, 
  onGuestsUpdate,
  onSelectedGuestUpdate
}: { 
  selectedGuest: string | null, 
  showGuestVideo: boolean, 
  onGuestsUpdate: (guests: RemoteParticipant[]) => void,
  onSelectedGuestUpdate: (identity: string) => void
}) {
  const room = useRoomContext();
  const allVideoTracks = useTracks([Track.Source.Camera]);
  
  // Filter out your own video (OBS Virtual Camera)
  const guestVideoTracks = allVideoTracks.filter(
    track => track.participant.identity !== room.localParticipant.identity
  );
  
  const selectedGuestVideoTrack = guestVideoTracks.find(
    track => track.participant.identity === selectedGuest
  );

  useEffect(() => {
    const updateGuests = () => {
      const participants = Array.from(room.remoteParticipants.values());
      onGuestsUpdate(participants);
      if (participants.length > 0 && !selectedGuest) {
        onSelectedGuestUpdate(participants[0].identity);
      }
    };

    updateGuests();
    room.on(RoomEvent.ParticipantConnected, updateGuests);
    room.on(RoomEvent.ParticipantDisconnected, updateGuests);
    
    return () => {
      room.off(RoomEvent.ParticipantConnected, updateGuests);
      room.off(RoomEvent.ParticipantDisconnected, updateGuests);
    };
  }, [room, selectedGuest, onGuestsUpdate, onSelectedGuestUpdate]);

  return (
    <>
      {/* Guest Video Preview */}
      {showGuestVideo && selectedGuestVideoTrack ? (
        <div className="absolute inset-0">
          <video
            ref={el => {
              if (el && selectedGuestVideoTrack.publication.track) {
                selectedGuestVideoTrack.publication.track.attach(el);
              }
            }}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded">
            {selectedGuestVideoTrack.participant.identity}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <div className="text-center">
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-zinc-500">
              {selectedGuest ? 'No video from guest' : 'Select a guest to view'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function StudioControls({
  guests,
  selectedGuest,
  onSelectGuest,
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onGuestsUpdate
}: {
  guests: RemoteParticipant[],
  selectedGuest: string | null,
  onSelectGuest: (identity: string) => void,
  isMuted: boolean,
  isVideoEnabled: boolean,
  onToggleMute: () => void,
  onToggleVideo: () => void,
  onGuestsUpdate: (guests: RemoteParticipant[]) => void
}) {
  const room = useRoomContext();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [participantsEgress, setParticipantsEgress] = useState<any[]>([]);
  const [loadingEgress, setLoadingEgress] = useState(false);

  // Host self controls
  const handleToggleMute = async () => {
    await room.localParticipant.setMicrophoneEnabled(isMuted);
    onToggleMute();
  };

  const handleToggleVideo = async () => {
    await room.localParticipant.setCameraEnabled(!isVideoEnabled);
    onToggleVideo();
  };

  // Guest management functions
  const handleMuteGuest = async (guestIdentity: string, mute: boolean) => {
    setActionLoading(`mute_${guestIdentity}`);
    try {
      const response = await fetch(`/api/webrtc/rooms/${room.name}/participants/${guestIdentity}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mute })
      });
      
      if (response.ok) {
        console.log(`Guest ${guestIdentity} ${mute ? 'muted' : 'unmuted'}`);
      } else {
        console.error('Failed to mute guest:', await response.text());
        alert('Failed to mute guest. Make sure backend endpoint exists.');
      }
    } catch (err) {
      console.error('Error muting guest:', err);
      alert('Error muting guest');
    } finally {
      setActionLoading(null);
    }
  };

  const handleKickGuest = async (guestIdentity: string) => {
    if (!confirm(`Remove ${guestIdentity} from the broadcast?`)) return;
    
    setActionLoading(`kick_${guestIdentity}`);
    try {
      const response = await fetch(`/api/webrtc/rooms/${room.name}/participants/${guestIdentity}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`Guest ${guestIdentity} kicked`);
        setTimeout(() => {
          const updatedGuests = guests.filter(g => g.identity !== guestIdentity);
          onGuestsUpdate(updatedGuests);
        }, 1000);
      } else {
        console.error('Failed to kick guest:', await response.text());
        alert('Failed to kick guest. Make sure backend endpoint exists.');
      }
    } catch (err) {
      console.error('Error kicking guest:', err);
      alert('Error kicking guest');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBringLive = async (guestIdentity: string) => {
    setActionLoading(`live_${guestIdentity}`);
    try {
      const response = await fetch(`/api/webrtc/rooms/${room.name}/participants/${guestIdentity}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'live' })
      });
      
      if (response.ok) {
        console.log(`Guest ${guestIdentity} is now live`);
        onSelectGuest(guestIdentity);
      } else {
        console.error('Failed to bring guest live:', await response.text());
        alert('Failed to bring guest live');
      }
    } catch (err) {
      console.error('Error bringing guest live:', err);
      alert('Error bringing guest live');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHoldGuest = async (guestIdentity: string) => {
    setActionLoading(`hold_${guestIdentity}`);
    try {
      const response = await fetch(`/api/webrtc/rooms/${room.name}/participants/${guestIdentity}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'waiting' })
      });
      
      if (response.ok) {
        console.log(`Guest ${guestIdentity} on hold`);
      } else {
        console.error('Failed to put guest on hold:', await response.text());
      }
    } catch (err) {
      console.error('Error putting guest on hold:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // RTMP Egress functions
  const fetchParticipantEgressUrls = async () => {
    if (!room.name) return;
    
    setLoadingEgress(true);
    try {
      const response = await fetch(`/api/webrtc/guest-egress?room_name=${encodeURIComponent(room.name)}`);
      
      if (response.ok) {
        const data = await response.json();
        setParticipantsEgress(data.participants || []);
      } else {
        console.warn('Failed to fetch egress URLs:', response.status);
        setParticipantsEgress([]);
      }
    } catch (error) {
      console.error('Failed to fetch egress URLs:', error);
      setParticipantsEgress([]);
    } finally {
      setLoadingEgress(false);
    }
  };

  const updateVideoSettings = async (participantId: string, settings: any) => {
    try {
      const response = await fetch('/api/webrtc/guest-egress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          guest_id: participantId,
          room_name: room.name,
          ...settings
        })
      });
      
      if (response.ok) {
        await fetchParticipantEgressUrls();
      }
    } catch (error) {
      console.error('Failed to update video settings:', error);
    }
  };

  const regenerateEgressKey = async (participantId: string) => {
    try {
      const response = await fetch('/api/webrtc/guest-egress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_key',
          guest_id: participantId,
          room_name: room.name
        })
      });
      
      if (response.ok) {
        await fetchParticipantEgressUrls();
      }
    } catch (error) {
      console.error('Failed to regenerate egress key:', error);
    }
  };

  const getGuestStatus = (guest: RemoteParticipant) => {
    try {
      const metadata = JSON.parse(guest.metadata || '{}');
      return metadata.status || 'waiting';
    } catch {
      return 'waiting';
    }
  };

  useEffect(() => {
    if (room.name) {
      fetchParticipantEgressUrls();
      const interval = setInterval(fetchParticipantEgressUrls, 10000);
      return () => clearInterval(interval);
    }
  }, [room.name, guests.length]);
  
  return (
    <div className="w-80 bg-zinc-900 border-l border-white/10 flex flex-col h-full overflow-y-auto">
      {/* Guest List Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="font-bold text-sm mb-3">Guests ({guests.length})</h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {guests.length === 0 ? (
            <div className="text-xs text-zinc-500 p-2 bg-zinc-800/50 rounded">
              No guests connected yet
            </div>
          ) : (
            guests.map((guest) => {
              const status = getGuestStatus(guest);
              const isSelected = selectedGuest === guest.identity;
              const isMuting = actionLoading === `mute_${guest.identity}`;
              const isKicking = actionLoading === `kick_${guest.identity}`;
              const isLiving = actionLoading === `live_${guest.identity}`;
              const isHolding = actionLoading === `hold_${guest.identity}`;

              return (
                <div
                  key={guest.identity}
                  className={`p-2 rounded ${isSelected ? 'bg-cyan-600' : 'bg-zinc-800'}`}
                >
                  {/* Name and Status Badge */}
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => onSelectGuest(guest.identity)}
                      className="text-left font-medium flex-1 text-sm truncate"
                    >
                      {guest.identity}
                    </button>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${
                        status === "live" ? "bg-green-600" : "bg-yellow-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {status === "waiting" ? (
                      <button
                        onClick={() => handleBringLive(guest.identity)}
                        disabled={isLiving}
                        className="text-[10px] px-2 py-1 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isLiving ? "..." : "Go Live"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleHoldGuest(guest.identity)}
                        disabled={isHolding}
                        className="text-[10px] px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {isHolding ? "..." : "Hold"}
                      </button>
                    )}

                    <button
                      onClick={() => handleMuteGuest(guest.identity, true)}
                      disabled={isMuting}
                      className="text-[10px] px-2 py-1 bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      {isMuting ? "..." : "Mute"}
                    </button>

                    <button
                      onClick={() => handleKickGuest(guest.identity)}
                      disabled={isKicking}
                      className="text-[10px] px-2 py-1 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isKicking ? "..." : "Kick"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Host Controls */}
      <div className="p-4 border-b border-white/10">
        <h3 className="font-bold text-sm mb-3">Your Controls</h3>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={handleToggleMute} 
            className={`p-2 rounded text-xs ${isMuted ? 'bg-red-600' : 'bg-zinc-700'}`}
          >
            {isMuted ? '🔇 Unmute' : '🔊 Mute'}
          </button>
          <button 
            onClick={handleToggleVideo} 
            className={`p-2 rounded text-xs ${!isVideoEnabled ? 'bg-red-600' : 'bg-zinc-700'}`}
          >
            {isVideoEnabled ? '📹 Stop Video' : '📹 Start Video'}
          </button>
        </div>
      </div>

      {/* Room Info & OBS Integration */}
      <div className="p-4 text-xs text-zinc-400">
        <div>Room: {room.name}</div>
        <div>Your ID: {room.localParticipant.identity}</div>
        <div className="mt-3">
          <div className="font-medium text-zinc-300 mb-1">OBS Integration</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Browser Source URL:</span>
            </div>
            <code className="block bg-black/50 p-2 rounded text-[10px] break-all">
              {typeof window !== 'undefined' 
                ? `${window.location.origin}/studio/obs-source?room=${room.name}`
                : `/studio/obs-source?room=${room.name}`
              }
            </code>
            <div className="text-[10px] text-zinc-500 mt-1">
              • Set width: 1920px, height: 1080px
              <br />• Disable hardware acceleration in OBS
              <br />• Refresh source when guests join
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="font-medium text-zinc-300 mb-1">Quick Actions</div>
          <div className="grid grid-cols-2 gap-1">
            <button 
              onClick={() => window.open(`/studio/obs-source?room=${room.name}`, '_blank')}
              className="text-[10px] p-1.5 bg-zinc-800 rounded hover:bg-zinc-700"
            >
              Open OBS Source
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/studio/obs-preview?room=${room.name}`)}
              className="text-[10px] p-1.5 bg-zinc-800 rounded hover:bg-zinc-700"
            >
              Copy OBS URL
            </button>
          </div>
        </div>

        {/* RTMP Egress Section for All Participants */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="font-medium text-zinc-300 mb-1 flex items-center justify-between">
            <span>RTMP Egress (Host & Guests)</span>
            <button 
              onClick={fetchParticipantEgressUrls}
              disabled={loadingEgress}
              className="text-[10px] px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50"
            >
              {loadingEgress ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {participantsEgress.length === 0 ? (
            <div className="text-[10px] text-zinc-500 p-2 bg-zinc-800/50 rounded">
              No participants with video available for RTMP egress
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {participantsEgress.map((participant) => (
                <div key={participant.participant_id} className="p-2 bg-zinc-800/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[11px]">{participant.participant_name}</span>
                      <span className={`text-[8px] px-1 py-0.5 rounded ${
                        participant.participant_type === 'host' ? 'bg-purple-600' : 'bg-blue-600'
                      }`}>
                        {participant.participant_type === 'host' ? 'Host' : 'Guest'}
                      </span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      participant.is_connected && participant.has_video ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {participant.is_connected && participant.has_video ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <div className="text-[10px] text-zinc-400 mb-1">RTMP URL for OBS Media Source:</div>
                    <code className="block bg-black/70 p-1.5 rounded text-[9px] break-all">
                      {participant.rtmp_url}
                    </code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(participant.rtmp_url)}
                      className="text-[9px] mt-1 px-2 py-0.5 bg-cyan-700 rounded hover:bg-cyan-600"
                    >
                      Copy RTMP URL
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    <div className="bg-zinc-900 p-1 rounded text-center">
                      <div className="text-zinc-400">Bitrate</div>
                      <div>{participant.video_settings.bitrate}kbps</div>
                    </div>
                    <div className="bg-zinc-900 p-1 rounded text-center">
                      <div className="text-zinc-400">Resolution</div>
                      <div>{participant.video_settings.resolution}</div>
                    </div>
                    <div className="bg-zinc-900 p-1 rounded text-center">
                      <div className="text-zinc-400">FPS</div>
                      <div>{participant.video_settings.framerate}</div>
                    </div>
                  </div>
                  
                  {participant.participant_type === 'guest' && (
                    <div className="flex gap-1 mt-2">
                      <button 
                        onClick={() => updateVideoSettings(participant.participant_id, { bitrate: 4000 })}
                        className="text-[9px] px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
                      >
                        High Quality
                      </button>
                      <button 
                        onClick={() => updateVideoSettings(participant.participant_id, { bitrate: 1500 })}
                        className="text-[9px] px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Medium
                      </button>
                      <button 
                        onClick={() => regenerateEgressKey(participant.participant_id)}
                        className="text-[9px] px-2 py-1 bg-red-600 rounded hover:bg-red-700"
                      >
                        New Key
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2 text-[10px] text-zinc-500">
            <div className="font-medium text-zinc-400 mb-1">OBS Media Source Setup:</div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>In OBS, add a "Media Source"</li>
              <li>Check "Local File" and paste the RTMP URL above</li>
              <li>Set input format to "ffmpeg"</li>
              <li>Enable "Hardware Decoding" for lower latency</li>
              <li>Use "Restart playback when source becomes active"</li>
            </ol>
            <div className="mt-2 text-amber-400">
              <strong>Note:</strong> Host RTMP URL can be used to pull host camera into other applications.
              Guest RTMP URLs are for pulling guest video into OBS.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HostStudioPage() {
  const params = useParams();
  const roomName = (params?.roomName as string) || 'Broadcast_Studio_A1';
  
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<RemoteParticipant[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showGuestVideo, setShowGuestVideo] = useState(true);

  useEffect(() => {
    fetchHostToken();
  }, [roomName]);

  async function fetchHostToken() {
    try {
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(
        `${apiBase}/api/host-token?roomName=${encodeURIComponent(roomName)}&hostName=Host`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.participantToken && data.serverUrl) {
        setToken(data.participantToken);
        setServerUrl(data.serverUrl);
      } else {
        throw new Error('Invalid token response from API');
      }
    } catch (err) {
      setError('Failed to load studio session. Please check if LiveKit server is running.');
      console.error('Host token fetch error:', err);
    }
  }

  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!token || !serverUrl) return <div className="p-10 text-white">Connecting...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex">
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        options={{
          videoCaptureDefaults: {
            deviceId: { 
              ideal: 'OBS Virtual Camera',
              exact: undefined
            },
            resolution: { width: 1920, height: 1080 }
          },
          audioCaptureDefaults: {
            deviceId: 'default'
          },
          publishDefaults: {
            videoCodec: 'vp8',
            videoEncoding: {
              maxBitrate: 3_000_000,
              maxFramerate: 30
            }
          }
        }}
      >
        <div className="flex-1 relative bg-zinc-950">
          <StudioContent 
            selectedGuest={selectedGuest}
            showGuestVideo={showGuestVideo}
            onGuestsUpdate={setGuests}
            onSelectedGuestUpdate={setSelectedGuest}
          />
        </div>
        
        <StudioControls
          guests={guests}
          selectedGuest={selectedGuest}
          onSelectGuest={setSelectedGuest}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          onToggleMute={() => setIsMuted(!isMuted)}
          onToggleVideo={() => setIsVideoEnabled(!isVideoEnabled)}
		  onGuestsUpdate={setGuests}
        />
      </LiveKitRoom>
    </div>
  );
}