'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '@/components/Layout';
import SpeedTest from '../components/SpeedTest';

interface GuestLinkData {
  vdo_link: string;
  is_staff: boolean;
  profile_image: string;
}

interface MediaAsset {
  id: number;
  title: string;
  description: string;
  media_type: 'video' | 'highlight' | 'interview' | 'training';
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
  username: string;
  user_role?: string;
  user_school?: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [vdoData, setVdoData] = useState<GuestLinkData | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [showSpeedTest, setShowSpeedTest] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const user = session?.user as { accessToken?: string };
    const token = user?.accessToken;
    
    if (token && session?.user) {
      // Fetch profile data from backend
      axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/profile/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        // Create VDO data with profile info
        setVdoData({
          vdo_link: `/guest-room/Broadcast_Studio_A1`,
          is_staff: res.data.is_staff || false,
          profile_image: res.data.profile_image || '/default-profile.jpg'
        });
      })
      .catch(err => console.error("Error fetching profile", err));
    }
  }, [session]);

  useEffect(() => {
    const fetchUserMedia = async () => {
      try {
        const user = session?.user as { accessToken?: string };
        const token = user?.accessToken;
        
        if (token) {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/media-assets/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMediaAssets(response.data);
        }
      } catch (error) {
        console.error('Error fetching media:', error);
      } finally {
        setLoadingMedia(false);
      }
    };

    if (session?.user) {
      fetchUserMedia();
    }
  }, [session]);

  const handleDeleteMedia = async (assetId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    
    setDeletingId(assetId);
    try {
      const user = session?.user as { accessToken?: string };
      const token = user?.accessToken;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await axios.delete(`${apiUrl}/api/media/upload/${assetId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMediaAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (err: any) {
      console.error('Error deleting media:', err);
      alert('Failed to delete media asset.');
    } finally {
      setDeletingId(null);
    }
  };

  // Function to handle one-click join — goes to GREEN ROOM first for device setup
  const handleOneClickJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    // Go to green room for camera/mic/preflight checklist before entering broadcast
    window.location.href = '/guest-room';
  };

  if (status === "loading") return <p className="p-10 text-center text-cyan-500 animate-pulse">LOADING STUDIO PROFILE...</p>;

  if (!session || !session.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center p-8 bg-zinc-900 rounded-lg border border-zinc-800 shadow-neon">
          <p className="text-red-500 font-bold">Access Denied. Please log in.</p>
          <Link href="/login" className="text-cyan-500 underline mt-4 inline-block">Go to Login</Link>
        </div>
      </div>
    );
  }

  const getMediaTypeColor = (type: string) => {
    switch(type) {
      case 'highlight': return 'bg-red-900/20 border-red-600 text-red-400';
      case 'interview': return 'bg-purple-900/20 border-purple-600 text-purple-400';
      case 'training': return 'bg-blue-900/20 border-blue-600 text-blue-400';
      default: return 'bg-cyan-900/20 border-cyan-600 text-cyan-400';
    }
  };

  const getMediaTypeIcon = (type: string) => {
    switch(type) {
      case 'highlight': return '🎬';
      case 'interview': return '🎙️';
      case 'training': return '💪';
      default: return '🎥';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
        
        {/* HEADER WITH JERSEY CIRCLE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 rounded-full border-2 border-cyan-500 overflow-hidden shadow-neon shrink-0 bg-zinc-900">
               <Image
                 src={vdoData?.profile_image || '/default-profile.jpg'}
                 alt="Profile"
                 fill
                 unoptimized
                 className="object-cover"
                 priority
               />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">
                Welcome, <span className="text-cyan-500">{session.user.name}</span>!
              </h1>
              <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                Don O'Connor Show Guest Portal
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/profile/edit" className="bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition font-bold border border-zinc-700">
              EDIT PROFILE
            </Link>
            <button onClick={() => signOut()} className="bg-red-900/20 text-red-500 border border-red-900/50 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition font-bold uppercase text-xs">
              Sign Out
            </button>
          </div>
        </div>

        {/* GUEST LINK BOX - ONE CLICK JOIN */}
        <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 rounded-2xl shadow-neon p-8 mb-12 border border-cyan-500/30">
          <h2 className="text-2xl font-bold mb-2 text-white uppercase tracking-tight flex items-center gap-2">
            <span className="text-cyan-400">🎙️</span> 
            One-Click Broadcast Access
          </h2>
          <p className="text-cyan-200/70 mb-6">
            Click the button below to instantly join <strong className="text-white">Broadcast_Studio_A1</strong>. 
            Your credentials are automatically verified through SSO.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <button 
              onClick={handleOneClickJoin}
              className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-purple-600 text-white px-10 py-5 rounded-xl font-black text-xl hover:from-cyan-500 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-center gap-3">
                <span>🎬</span>
                <span>JOIN THE SHOW NOW</span>
                <span className="animate-pulse">▶️</span>
              </div>
            </button>
            <div className="text-xs text-cyan-400/60 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>SSO Authenticated • One-Click Join</span>
            </div>
          </div>
          
          {/* Quick info badges */}
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <div className="bg-black/50 rounded-full px-3 py-1 border border-cyan-500/30">
              <span className="text-cyan-400">✓</span> Auto-authenticated
            </div>
            <div className="bg-black/50 rounded-full px-3 py-1 border border-cyan-500/30">
              <span className="text-cyan-400">✓</span> Green room setup
            </div>
            <div className="bg-black/50 rounded-full px-3 py-1 border border-cyan-500/30">
              <span className="text-cyan-400">✓</span> Device setup

            </div>
          </div>
        </div>
        
        {/* DIRECTOR CONTROL QUICK ACCESS CARD - FOR STAFF ONLY */}
        {(session.user as any)?.is_staff && (
          <div className="mb-12">
            <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl shadow-neon p-8 border border-amber-500/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2 flex items-center gap-3">
                    <span className="text-amber-400 text-3xl">🎬</span>
                    Director Control Panel
                  </h2>
                  <p className="text-amber-200/70 mb-4">
                    Advanced control center for managing live broadcasts, monitoring participants, 
                    and controlling the studio environment with real-time analytics.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-amber-900/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-700/50">
                      Live Monitoring
                    </div>
                    <div className="bg-amber-900/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-700/50">
                      Participant Control
                    </div>
                    <div className="bg-amber-900/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-700/50">
                      OBS Integration
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Link 
                    href="/director-control"
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-xl font-black hover:from-amber-500 hover:to-orange-500 transition-all transform hover:scale-105 shadow-lg shadow-amber-500/20"
                  >
                    <span className="text-xl">🚀</span>
                    <div className="text-left">
                      <div className="text-lg">Launch Director Control</div>
                      <div className="text-amber-200 text-xs">Advanced Studio Management</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* MY UPLOADS SECTION */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">📹 My Video Uploads</h2>
            <Link href="/media/upload" className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition text-sm">
              + UPLOAD NEW
            </Link>
          </div>
          
          {loadingMedia ? (
            <div className="text-center py-8 text-zinc-400">Loading your videos...</div>
          ) : mediaAssets.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-12 text-center">
              <div className="text-5xl mb-4">📹</div>
              <p className="text-zinc-400 mb-6">You haven not uploaded any videos yet.</p>
              <Link href="/media/upload" className="inline-block bg-cyan-600 text-black px-6 py-3 rounded-lg font-bold hover:bg-cyan-400 transition">
                Upload Your First Video
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaAssets.map((asset) => (
                <a
                  key={asset.id}
                  href={`/media/watch/${asset.id}`}
                  className="block bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-800 hover:border-cyan-500 transition cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-gradient-to-br from-purple-900 to-blue-900 overflow-hidden">
                    {asset.thumbnail_url ? (
                      <img 
                        src={asset.thumbnail_url} 
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {getMediaTypeIcon(asset.media_type)}
                      </div>
                    )}
                    {/* Delete button overlay */}
                    <button
                      onClick={(e) => handleDeleteMedia(asset.id, e)}
                      disabled={deletingId === asset.id}
                      className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Delete this media"
                    >
                      {deletingId === asset.id ? (
                        <span className="text-xs animate-pulse">⏳</span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-2 border ${getMediaTypeColor(asset.media_type)}`}>
                      {asset.media_type}
                    </div>
                    <h3 className="font-bold text-sm line-clamp-2 mb-1">{asset.title}</h3>
                    {asset.description && (
                      <p className="text-zinc-400 text-xs line-clamp-1 mb-2">{asset.description}</p>
                    )}
                    <div className="text-xs text-zinc-500">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* ADMIN CONTROLS - FOR STAFF ONLY */}
        {(session.user as any)?.is_staff && (
          <>
            {/* Admin Quick Actions */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-bold text-white mb-4 uppercase">Admin Quick Actions</h3>
              <p className="text-purple-300/70 text-sm mb-6">Quick access to manage your media platform</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link 
                  href="/admin#shows"
                  className="bg-purple-600 text-white p-4 rounded-xl hover:bg-purple-500 transition text-center"
                >
                  <div className="text-2xl mb-2">📺</div>
                  <div className="font-bold">Manage Shows</div>
                  <div className="text-xs text-purple-200 mt-1">Schedule & live status</div>
                </Link>
                <Link 
                  href="/admin#guest-requests"
                  className="bg-cyan-600 text-black p-4 rounded-xl hover:bg-cyan-500 transition text-center"
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-bold">Guest Requests</div>
                  <div className="text-xs text-cyan-900 mt-1">Approve/reject applicants</div>
                </Link>
                <Link 
                  href="/admin#profiles"
                  className="bg-green-600 text-white p-4 rounded-xl hover:bg-green-500 transition text-center"
                >
                  <div className="text-2xl mb-2">👤</div>
                  <div className="font-bold">Manage Profiles</div>
                  <div className="text-xs text-green-200 mt-1">Users & permissions</div>
                </Link>
                <Link 
                  href="/admin#media"
                  className="bg-amber-600 text-white p-4 rounded-xl hover:bg-amber-500 transition text-center"
                >
                  <div className="text-2xl mb-2">📹</div>
                  <div className="font-bold">Media Library</div>
                  <div className="text-xs text-amber-200 mt-1">Upload & manage content</div>
                </Link>
              </div>
            </div>

            {/* Director Control Center */}
            <div className="bg-amber-900/10 border border-amber-500/50 rounded-2xl p-6 mb-12">
              <h3 className="text-lg font-bold text-amber-500 mb-2 uppercase italic">Director Control Center</h3>
              <p className="text-amber-200/60 text-sm mb-6 font-mono">Master access for Broadcast_Studio_A1.</p>
              <div className="flex flex-wrap gap-4">
                {/* Host Entry Button - Simple OBS Virtual Cam Entry */}
                <button 
                  onClick={() => window.open('/studio/Broadcast_Studio_A1', '_blank')}
                  className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-black hover:bg-red-500 transition shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  title="Enter as host with OBS Virtual Camera"
                >
                  🎥 ENTER AS HOST
                </button>
                
                <Link 
                  href="/admin"
                  className="inline-block bg-cyan-600 text-black px-6 py-3 rounded-lg font-black hover:bg-cyan-500 transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  FRONTEND ADMIN DASHBOARD
                </Link>
                <Link 
                  href="/director-control"
                  className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-black hover:bg-amber-500 transition shadow-[0_0_15px_rgba(217,119,6,0.3)]"
                >
                  DIRECTOR CONTROL CENTER
                </Link>
                <a 
                  href="/studio/obs-source/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-black hover:bg-green-500 transition shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  OBS MONITOR
                </a>
                <a 
                  href="https://yourdomain.com/admin-hq2024/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-black hover:bg-purple-500 transition shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                >
                  DJANGO ADMIN
                </a>
              </div>
            </div>
          </>
        )}

        {/* SPEED TEST - Runs inline SpeedTest component as a modal */}
        <div className="bg-zinc-900 p-6 rounded-2xl shadow border border-zinc-800 hover:border-cyan-500 transition-colors">
          <h3 className="text-lg font-bold text-white mb-2 uppercase">⚡ Speed Test</h3>
          <p className="text-zinc-400 text-sm mb-4">Test your network connection speed, latency, and jitter for optimal streaming performance.</p>
          <button
            onClick={() => setShowSpeedTest(true)}
            className="inline-block bg-cyan-600 text-black font-bold px-6 py-3 rounded-xl hover:bg-cyan-500 transition transform hover:scale-105 active:scale-95 border-none cursor-pointer"
          >
            🚀 Run Speed Test
          </button>
        </div>

        {/* Speed Test Modal */}
        {showSpeedTest && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowSpeedTest(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <SpeedTest onClose={() => setShowSpeedTest(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
