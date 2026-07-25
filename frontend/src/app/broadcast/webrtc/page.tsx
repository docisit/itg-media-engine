'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { WebRTCManager, getICEServers } from '@/lib/webrtc';

interface WebRTCRoom {
  id: number;
  room_id: string;
  name: string;
  room_type: string;
  description: string;
  is_active: boolean;
  is_live: boolean;
  created_at: string;
  guest_name: string;
  guest_email: string;
  participant_count: number;
  duration: number;
}

export default function WebRTCDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [rooms, setRooms] = useState<WebRTCRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomType, setNewRoomType] = useState('interview');
  const [selectedRoom, setSelectedRoom] = useState<WebRTCRoom | null>(null);
  const [guestLink, setGuestLink] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Fetch rooms on load
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || !session.user) {
      router.push('/login');
      return;
    }
    
    fetchRooms();
  }, [session, status, router]);

  const fetchRooms = async () => {
    try {
      const user = session?.user as { accessToken?: string };
      const token = user?.accessToken;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/webrtc-rooms/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRooms(response.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Room name is required');
      return;
    }

    try {
      setCreatingRoom(true);
      setError(null);
      
      const user = session?.user as { accessToken?: string };
      const token = user?.accessToken;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/webrtc-rooms/`,
        {
          name: newRoomName,
          description: newRoomDescription,
          room_type: newRoomType,
          is_public: true,
          max_participants: 2,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRooms([response.data, ...rooms]);
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomType('interview');
      
      // Select the newly created room
      setSelectedRoom(response.data);
      
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const startRoom = async (room: WebRTCRoom) => {
    try {
      const user = session?.user as { accessToken?: string };
      const token = user?.accessToken;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/webrtc-rooms/${room.id}/start/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update room in list
      setRooms(rooms.map(r => r.id === room.id ? response.data : r));
      setSelectedRoom(response.data);
      
      // Generate guest link
      await generateGuestLink(room);
      
      // Initialize WebRTC connection as host
      await initializeHostConnection(room);
      
    } catch (err) {
      console.error('Error starting room:', err);
      setError('Failed to start room');
    }
  };

  const endRoom = async (room: WebRTCRoom) => {
    try {
      const user = session?.user as { accessToken?: string };
      const token = user?.accessToken;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/webrtc-rooms/${room.id}/end/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update room in list
      setRooms(rooms.map(r => r.id === room.id ? response.data : r));
      setSelectedRoom(response.data);
      
      // Disconnect WebRTC
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.disconnect();
        webrtcManagerRef.current = null;
      }
      setIsConnected(false);
      setGuestLink(null);
      
    } catch (err) {
      console.error('Error ending room:', err);
      setError('Failed to end room');
    }
  };

  const generateGuestLink = async (room: WebRTCRoom) => {
    try {
      const user = session?.user as { accessToken?: string };
      const token = user?.accessToken;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/webrtc-rooms/${room.id}/generate_guest_link/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const guestLink = response.data.guest_link;
      setGuestLink(guestLink);
      
      // Copy to clipboard
      navigator.clipboard.writeText(guestLink).then(() => {
        alert('Guest link copied to clipboard!');
      });
      
    } catch (err) {
      console.error('Error generating guest link:', err);
      setError('Failed to generate guest link');
    }
  };

  const initializeHostConnection = async (room: WebRTCRoom) => {
    try {
      // Get ICE servers
      const iceServers = await getICEServers();
      
      // Generate participant ID for host
      const hostParticipantId = `host_${room.room_id}_${Date.now()}`;
      setParticipantId(hostParticipantId);
      
      // WebSocket URL for host
      const wsUrl = `wss://${window.location.host}/ws/webrtc/${room.room_id}/${hostParticipantId}/`;
      
      // Initialize WebRTC manager
      const manager = new WebRTCManager(room.room_id, hostParticipantId, {
        iceServers: iceServers,
        iceCandidatePoolSize: 10,
      });

      manager.setOnRemoteStream((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });

      manager.setOnConnectionState((state) => {
        console.log('Connection state:', state);
        setIsConnected(state === 'connected');
      });

      manager.setOnError((error) => {
        console.error('WebRTC error:', error);
        setError(error);
      });

      // Connect to WebSocket as host
      await manager.initialize(wsUrl, 'Host', 'host');
      
      // Get local media (camera and microphone)
      await manager.getLocalMedia();
      
      webrtcManagerRef.current = manager;
      
    } catch (err) {
      console.error('Error initializing host connection:', err);
      setError('Failed to initialize WebRTC connection');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-cyan-400 font-mono uppercase tracking-widest">Loading WebRTC Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-cyan-500">WebRTC</span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-white">Broadcast Studio</span>
              </h1>
              <p className="text-gray-500 text-sm">
                Host guest interviews without VDO.Ninja
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Room Management */}
          <div className="lg:col-span-2 space-y-8">
            {/* Create Room Form */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 text-white">Create New Room</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Interview with John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Brief description of the interview"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Type
                  </label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="interview">Interview</option>
                    <option value="training">Training</option>
                    <option value="analysis">Game Analysis</option>
                    <option value="coaching">Coaching</option>
                  </select>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                
                <button
                  onClick={createRoom}
                  disabled={creatingRoom}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingRoom ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>

            {/* Rooms List */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 text-white">Your Rooms</h2>
              
              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No rooms created yet</p>
                  <p className="text-gray-600 text-sm mt-2">Create your first room to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-4 rounded-lg border ${selectedRoom?.id === room.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 bg-gray-900/30'}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h3 className="font-bold text-white">{room.name}</h3>
                          <p className="text-gray-400 text-sm mt-1">{room.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-800 rounded">
                              {room.room_type}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${room.is_live ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                              {room.is_live ? 'LIVE' : 'IDLE'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(room.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {room.is_live ? (
                            <button
                              onClick={() => endRoom(room)}
                              className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition"
                            >
                              End Room
                            </button>
                          ) : (
                            <button
                              onClick={() => startRoom(room)}
                              className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/50 rounded-lg hover:bg-green-600/30 transition"
                            >
                              Start Room
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedRoom(room)}
                            className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Room Controls */}
          <div className="space-y-8">
            {/* Selected Room Info */}
            {selectedRoom && (
              <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-4 text-white">Room Controls</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-white">{selectedRoom.name}</h3>
                    <p className="text-gray-400 text-sm">{selectedRoom.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/70 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Room ID</div>
                      <div className="font-mono text-cyan-400 text-sm truncate">{selectedRoom.room_id}</div>
                    </div>
                    <div className="bg-gray-900/70 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Status</div>
                      <div className={`font-mono ${selectedRoom.is_live ? 'text-green-400' : 'text-yellow-400'}`}>
                        {selectedRoom.is_live ? 'LIVE' : 'IDLE'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/70 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Participants</div>
                      <div className="font-mono text-cyan-400">{selectedRoom.participant_count}</div>
                    </div>
                    <div className="bg-gray-900/70 rounded-lg p-3">
                      <div className="text-gray-400 text-sm">Duration</div>
                      <div className="font-mono text-cyan-400">{Math.floor(selectedRoom.duration / 60)}m {selectedRoom.duration % 60}s</div>
                    </div>
                  </div>
                  
                  {/* Guest Link */}
                  {guestLink && (
                    <div className="bg-gray-900/70 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-2">Guest Link</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={guestLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(guestLink)}
                          className="px-3 py-2 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 transition"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">
                        Share this link with your guest to join the interview
                      </p>
                    </div>
                  )}
                  
                  {/* OBS Ingest Link */}
                  {selectedRoom.is_live && participantId && (
                    <div className="bg-gray-900/70 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-2">OBS Browser Source URL</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={`https://${window.location.host}/api/webrtc/obs-ingest/${selectedRoom.room_id}/${participantId}/`}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 truncate"
                        />
                        <button
                          onClick={() => copyToClipboard(`https://${window.location.host}/api/webrtc/obs-ingest/${selectedRoom.room_id}/${participantId}/`)}
                          className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">
                        Use this URL in OBS as a browser source
                      </p>
                    </div>
                  )}
                  
                  {/* Connection Status */}
                  <div className="bg-gray-900/70 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-400 text-sm">WebRTC Connection</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Video Preview */}
                    <div className="aspect-video bg-black rounded overflow-hidden mt-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {!isConnected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-2"></div>
                            <p className="text-cyan-400 text-sm">Waiting for guest...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {selectedRoom.is_live ? (
                      <button
                        onClick={() => endRoom(selectedRoom)}
                        className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition"
                      >
                        End Interview
                      </button>
                    ) : (
                      <button
                        onClick={() => startRoom(selectedRoom)}
                        className="flex-1 py-3 bg-green-600/20 text-green-400 border border-green-600/50 rounded-lg hover:bg-green-600/30 transition"
                      >
                        Start Interview
                      </button>
                    )}
                    
                    <button
                      onClick={() => generateGuestLink(selectedRoom)}
                      className="flex-1 py-3 bg-cyan-600/20 text-cyan-400 border border-cyan-600/50 rounded-lg hover:bg-cyan-600/30 transition"
                    >
                      Get Guest Link
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
              <h2 className="text-xl font-bold mb-4 text-white">How to Use</h2>
              <ol className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-bold">1.</span>
                  <span>Create a room for your interview</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-bold">2.</span>
                  <span>Start the room to generate guest link</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-bold">3.</span>
                  <span>Share guest link with your interviewee</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-bold">4.</span>
                  <span>Use OBS browser source URL to capture video</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-bold">5.</span>
                  <span>Stream to platforms using OBS virtual camera</span>
                </li>
              </ol>
              
              <div className="mt-6 p-4 bg-gray-900/70 rounded-lg">
                <h3 className="font-bold text-white mb-2">Benefits vs VDO.Ninja</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>No external service dependencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Uses your own TURN server</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Full control over streaming quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Integrated with your existing platform</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>No third-party branding</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black py-6 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 text-sm">
            © 2026 Don O'Connor Media • Self-Hosted WebRTC Interview System
          </p>
          <p className="text-gray-700 text-xs mt-2">
            Replaces VDO.Ninja with your own infrastructure
          </p>
        </div>
      </footer>
    </div>
  );
}
