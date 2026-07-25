'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import MediaUpload from './media-upload';
import StreamingAdmin from './streaming-admin';
import BlogAdmin from './blog-admin';
import AthleteStatsAdmin from './athlete-stats-admin';

interface Show {
  id: number;
  title: string;
  guest_name: string;
  air_date: string;
  video_url?: string;
  is_live: boolean;
}

interface GuestRequest {
  id: number;
  name: string;
  email: string;
  role: string;
  bio: string;
  hudl: string;
  maxpreps: string;
  submitted_at: string;
  status: string;
}

interface Profile {
  username: string;
  email: string;
  role: 'coach' | 'athlete' | 'staff' | 'vip';
  bio: string;
  school_name: string;
  position: string;
  is_active: boolean;
  graduation_year?: number | null;
  twitter_x_link?: string;
}

interface MediaAsset {
  id: number;
  title: string;
  description: string;
  media_type: string;
  file_url: string;
  thumbnail_url: string;
  created_at: string;
  username: string;
  user_role: string;
  user_school: string;
}

interface SessionUser {
  accessToken: string;
  is_staff: boolean;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [shows, setShows] = useState<Show[]>([]);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'shows' | 'guest-requests' | 'profiles' | 'media' | 'streaming' | 'blog' | 'stats'>('shows');
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showAddShowModal, setShowAddShowModal] = useState(false);
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [newShowData, setNewShowData] = useState({
    title: '',
    guest_name: '',
    air_date: '',
    video_url: '',
    is_live: false
  });
  const [newProfileData, setNewProfileData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'athlete',
    bio: '',
    school_name: '',
    position: '',
    graduation_year: '',
    twitter_x_link: '',
  });

  const fetchShows = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/shows/`, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      setShows(response.data);
    } catch (error) {
      console.error('Error fetching shows:', error);
    }
  }, [session]);

  const fetchGuestRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/guest-requests/`, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      setGuestRequests(response.data);
    } catch (error) {
      console.error('Error fetching guest requests:', error);
    }
  }, [session]);

  const fetchProfiles = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/profiles/`, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      setProfiles(response.data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }, [session]);

  const fetchMediaAssets = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/media/`, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      setMediaAssets(response.data);
    } catch (error) {
      console.error('Error fetching media assets:', error);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchShows();
      fetchGuestRequests();
      fetchProfiles();
      fetchMediaAssets();
    }
  }, [session, fetchShows, fetchGuestRequests, fetchProfiles, fetchMediaAssets]);

  const updateGuestRequestStatus = async (id: number, status: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/guest-requests/${id}/update_status/`, {
        status
      }, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      fetchGuestRequests();
      alert(`Guest request ${status} successfully!`);
    } catch (error: any) {
      console.error('Error updating guest request:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const toggleShowLiveStatus = async (showId: number, isLive: boolean) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/shows/${showId}/toggle_live/`, {}, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      fetchShows();
    } catch (error) {
      console.error('Error updating show status:', error);
    }
  };

  const handleMediaUploadSuccess = () => {
    fetchMediaAssets();
    setShowMediaUpload(false);
  };

  const deleteMediaAsset = async (assetId: number) => {
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/media-assets/${assetId}/`, {
        headers: { 
          Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
        }
      });
      fetchMediaAssets();
    } catch (error) {
      console.error('Error deleting media asset:', error);
    }
  };

  const handleCreateShow = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shows/`,
        newShowData,
        {
          headers: { 
            Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
          }
        }
      );
      
      if (response.status === 201) {
        alert("Show created successfully!");
        setShowAddShowModal(false);
        setNewShowData({
          title: '',
          guest_name: '',
          air_date: '',
          video_url: '',
          is_live: false
        });
        fetchShows();
      }
    } catch (error) {
      console.error('Error creating show:', error);
      alert("Error creating show. Please check the console for details.");
    }
  };

  const toggleProfileActive = async (username: string, currentlyActive: boolean) => {
    try {
      const action = currentlyActive ? 'Disable' : 'Enable';
      if (!confirm(`Are you sure you want to ${action.toLowerCase()} user "${username}"? ${currentlyActive ? 'They will not be able to log in.' : ''}`)) return;
      
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/profiles/${username}/`,
        { is_active: !currentlyActive },
        { headers: { Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` } }
      );
      
      if (response.status === 200) {
        fetchProfiles();
        alert(`User "${username}" has been ${currentlyActive ? 'disabled' : 'enabled'}.`);
      }
    } catch (error: any) {
      console.error('Error toggling profile status:', error);
      alert(`Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const deleteProfile = async (username: string) => {
    if (!confirm(`⚠️ PERMANENTLY DELETE user "${username}"?\n\nThis will permanently remove their account and all associated data. This cannot be undone!`)) return;
    if (!confirm(`Are you absolutely sure? Type "yes" to confirm deletion of "${username}".`)) return;
    
    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/profiles/${username}/`,
        { headers: { Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` } }
      );
      
      if (response.status === 200) {
        fetchProfiles();
        alert(response.data.detail || `User "${username}" has been deleted.`);
      }
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      alert(`Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleCreateProfile = async () => {
    try {
      const payload: Record<string, string> = {
        username: newProfileData.username,
        email: newProfileData.email,
        password: newProfileData.password,
        role: newProfileData.role,
        bio: newProfileData.bio,
        school_name: newProfileData.school_name,
        position: newProfileData.position,
        twitter_x_link: newProfileData.twitter_x_link,
      };
      if (newProfileData.graduation_year) {
        payload.graduation_year = newProfileData.graduation_year;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/profiles/`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${(session?.user as SessionUser)?.accessToken}` 
          }
        }
      );
      
      if (response.status === 201) {
        alert(`Profile "${newProfileData.username}" created successfully!`);
        setShowCreateProfileModal(false);
        setNewProfileData({
          username: '',
          email: '',
          password: '',
          role: 'athlete',
          bio: '',
          school_name: '',
          position: '',
          graduation_year: '',
          twitter_x_link: '',
        });
        fetchProfiles();
      }
    } catch (error: any) {
      console.error('Error creating profile:', error);
      const detail = error.response?.data?.detail || error.response?.data?.error || 'Unknown error';
      alert(`Error creating profile: ${detail}`);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING ADMIN PANEL...</div>
      </div>
    );
  }

  if (!session || !(session.user as SessionUser)?.is_staff) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-4 text-red-500">Access Denied</h1>
          <p className="text-zinc-400 mb-6">You don't have permission to access this page.</p>
          <Link href="/" className="text-cyan-500 hover:text-cyan-400 transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black">Admin Control Panel</h1>
              <p className="text-purple-200 mt-2">Manage shows, profiles, and media content</p>
            </div>
            <Link href="/" className="text-cyan-400 hover:text-white transition">
              ← Back to Site
            </Link>
          </div>
          
          <div className="flex space-x-1 bg-zinc-900 rounded-lg p-1 mb-8 overflow-x-auto flex-nowrap scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent -mx-6 px-6 lg:mx-0 lg:px-0">
            <button
              onClick={() => setActiveTab('shows')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'shows' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Shows
            </button>
            <button
              onClick={() => setActiveTab('guest-requests')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'guest-requests' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'profiles' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Profiles
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'media' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab('streaming')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'streaming' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Streaming
            </button>
            <button
              onClick={() => setActiveTab('blog')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'blog' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Stories
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md text-xs sm:text-sm transition whitespace-nowrap ${activeTab === 'stats' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              🏋️ Stats
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-6">
        {activeTab === 'shows' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Shows Management</h2>
              <button 
                onClick={() => setShowAddShowModal(true)}
                className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
              >
                + New Show
              </button>
            </div>
            
            <div className="grid gap-6">
              {shows.map((show) => (
                <div key={show.id} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{show.title}</h3>
                      <p className="text-zinc-400 mb-2">Guest: {show.guest_name || 'No guest'}</p>
                      <p className="text-zinc-500 text-sm">
                        Air Date: {new Date(show.air_date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${show.is_live ? 'bg-red-600 animate-pulse' : 'bg-zinc-700'}`}>
                          {show.is_live ? 'LIVE' : 'SCHEDULED'}
                        </span>
                        <button 
                          onClick={() => toggleShowLiveStatus(show.id, show.is_live)}
                          className={`text-xs px-3 py-1 rounded ${show.is_live ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'} hover:opacity-80 transition`}
                        >
                          {show.is_live ? 'End Live' : 'Go Live'}
                        </button>
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Link 
                        href={`/shows/edit/${show.id}`}
                        className="inline-block bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-500 transition"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'guest-requests' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Guest Requests ({guestRequests.length})</h2>
            
            <div className="grid gap-6">
              {guestRequests.map((request) => (
                <div key={request.id} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{request.name}</h3>
                      <p className="text-cyan-400 mb-1">{request.email}</p>
                      <p className="text-zinc-500 text-sm capitalize">Role: {request.role}</p>
                      <p className="text-zinc-500 text-sm">
                        Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      request.status === 'approved' ? 'bg-green-600' :
                      request.status === 'rejected' ? 'bg-red-600' :
                      'bg-yellow-600'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-zinc-300 mb-4 leading-relaxed">{request.bio}</p>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    {request.hudl && (
                      <a href={request.hudl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm">
                        Hudl Profile →
                      </a>
                    )}
                    {request.maxpreps && (
                      <a href={request.maxpreps} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm">
                        MaxPreps Profile →
                      </a>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => updateGuestRequestStatus(request.id, 'approved')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition"
                      disabled={request.status === 'approved'}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateGuestRequestStatus(request.id, 'rejected')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition"
                      disabled={request.status === 'rejected'}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateGuestRequestStatus(request.id, 'pending')}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition"
                      disabled={request.status === 'pending'}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Profile Management ({profiles.length})</h2>
              <button 
                onClick={() => setShowCreateProfileModal(true)}
                className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
              >
                + Create Profile
              </button>
            </div>
            
            <div className="grid gap-6">
              {profiles.map((profile) => (
                <div key={profile.username} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{profile.username}</h3>
                      <p className="text-zinc-400 mb-1 capitalize">Role: {profile.role}</p>
                      {profile.school_name && (
                        <p className="text-zinc-500 text-sm">School: {profile.school_name}</p>
                      )}
                      {profile.position && (
                        <p className="text-zinc-500 text-sm">Position: {profile.position}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      profile.role === 'coach' ? 'bg-purple-600' : 'bg-cyan-600'
                    }`}>
                      {profile.role.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-zinc-300 mb-4 leading-relaxed line-clamp-3">
                    {profile.bio || 'No bio provided'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Link 
                      href={`/profiles/${profile.username}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition"
                    >
                      View
                    </Link>
                    <Link 
                      href={`/profile/edit`}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleProfileActive(profile.username, profile.is_active)}
                      className={`text-white px-4 py-2 rounded-lg transition ${
                        profile.is_active
                          ? 'bg-red-700 hover:bg-red-600'
                          : 'bg-green-700 hover:bg-green-600'
                      }`}
                    >
                      {profile.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteProfile(profile.username)}
                      className="bg-gray-800 border border-red-800 text-red-400 px-4 py-2 rounded-lg hover:bg-red-900/50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Media Management</h2>
              <button 
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
              >
                {showMediaUpload ? 'Cancel Upload' : '+ Upload Media'}
              </button>
            </div>
            
            {showMediaUpload && (
              <div className="mb-8">
                <MediaUpload 
                  onUploadSuccess={handleMediaUploadSuccess}
                  accessToken={(session.user as SessionUser).accessToken}
                />
              </div>
            )}
            
            <div className="grid gap-6">
              {mediaAssets.map((asset) => (
                <div key={asset.id} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{asset.title}</h3>
                      <p className="text-cyan-400 mb-1">By: {asset.username} ({asset.user_role})</p>
                      <p className="text-zinc-500 text-sm capitalize">Type: {asset.media_type}</p>
                      <p className="text-zinc-500 text-sm">
                        Uploaded: {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      asset.media_type === 'video' ? 'bg-red-600' :
                      asset.media_type === 'image' ? 'bg-green-600' :
                      'bg-purple-600'
                    }`}>
                      {asset.media_type.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-zinc-300 mb-4 leading-relaxed line-clamp-3">
                    {asset.description || 'No description'}
                  </p>
                  
                  <div className="flex space-x-3">
                    <a 
                      href={asset.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition"
                    >
                      View Media
                    </a>
                    <button 
                      onClick={() => deleteMediaAsset(asset.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'streaming' && (
          <div>
            <StreamingAdmin 
              accessToken={(session.user as SessionUser).accessToken}
              API_BASE={process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}
            />
          </div>
        )}

        {activeTab === 'blog' && (
          <div>
            <BlogAdmin 
              accessToken={(session.user as SessionUser).accessToken}
              API_BASE={process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <AthleteStatsAdmin 
              accessToken={(session.user as SessionUser).accessToken}
              API_BASE={process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}
            />
          </div>
        )}
      </div>

      {/* Add New Show Modal */}
      {showAddShowModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-800 p-6">
            <h3 className="text-xl font-bold mb-4">Add New Show</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Show Title</label>
                <input
                  type="text"
                  value={newShowData.title}
                  onChange={(e) => setNewShowData({...newShowData, title: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="Enter show title"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={newShowData.guest_name}
                  onChange={(e) => setNewShowData({...newShowData, guest_name: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="Enter guest name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Air Date</label>
                <input
                  type="date"
                  value={newShowData.air_date}
                  onChange={(e) => setNewShowData({...newShowData, air_date: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Video URL (Optional)</label>
                <input
                  type="url"
                  value={newShowData.video_url}
                  onChange={(e) => setNewShowData({...newShowData, video_url: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="https://example.com/video"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_live"
                  checked={newShowData.is_live}
                  onChange={(e) => setNewShowData({...newShowData, is_live: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="is_live" className="text-sm text-zinc-400">
                  Start as live show
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateShow}
                className="flex-1 bg-cyan-600 text-black py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
              >
                Create Show
              </button>
              <button
                onClick={() => setShowAddShowModal(false)}
                className="flex-1 border border-zinc-800 py-2 rounded-lg hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateProfileModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full border border-zinc-800 p-6">
            <h3 className="text-xl font-bold mb-4">Create New Profile</h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Username *</label>
                <input
                  type="text"
                  value={newProfileData.username}
                  onChange={(e) => setNewProfileData({...newProfileData, username: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="e.g. john_doe"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={newProfileData.email}
                  onChange={(e) => setNewProfileData({...newProfileData, email: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Password *</label>
                <input
                  type="password"
                  value={newProfileData.password}
                  onChange={(e) => setNewProfileData({...newProfileData, password: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="Set initial password"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Role</label>
                <select
                  value={newProfileData.role}
                  onChange={(e) => setNewProfileData({...newProfileData, role: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg text-white"
                >
                  <option value="athlete">Athlete</option>
                  <option value="coach">Coach</option>
                  <option value="staff">Staff</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">School Name</label>
                <input
                  type="text"
                  value={newProfileData.school_name}
                  onChange={(e) => setNewProfileData({...newProfileData, school_name: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="e.g. Springfield High"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Position</label>
                <input
                  type="text"
                  value={newProfileData.position}
                  onChange={(e) => setNewProfileData({...newProfileData, position: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="e.g. Quarterback"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Graduation Year</label>
                <input
                  type="number"
                  value={newProfileData.graduation_year}
                  onChange={(e) => setNewProfileData({...newProfileData, graduation_year: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="e.g. 2026"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                <textarea
                  value={newProfileData.bio}
                  onChange={(e) => setNewProfileData({...newProfileData, bio: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg resize-none"
                  rows={3}
                  placeholder="Short bio about this person"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-1">X (Twitter) Link</label>
                <input
                  type="url"
                  value={newProfileData.twitter_x_link}
                  onChange={(e) => setNewProfileData({...newProfileData, twitter_x_link: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-2 rounded-lg"
                  placeholder="https://x.com/username"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateProfile}
                className="flex-1 bg-cyan-600 text-black py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
              >
                Create Profile
              </button>
              <button
                onClick={() => setShowCreateProfileModal(false)}
                className="flex-1 border border-zinc-800 py-2 rounded-lg hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
