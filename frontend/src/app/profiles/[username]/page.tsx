'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';

interface Profile {
  username: string;
  role: 'coach' | 'athlete' | 'staff';
  bio: string;
  profile_image: string;
  hudl_link: string;
  maxpreps_link: string;
  twitter_x_link: string;
  graduation_year: number | null;
  position: string;
  school_name: string;
}

interface MediaAsset {
  id: number;
  title: string;
  description: string;
  media_type: 'video' | 'highlight' | 'interview' | 'training';
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
  username?: string;
}

export default function ProfileDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [vdoData, setVdoData] = useState<{ is_staff?: boolean } | null>(null);

  // Get API URL from environment variable or fallback to local development
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch staff status for current user
  useEffect(() => {
    const fetchStaffStatus = async () => {
      try {
        const user = session?.user as { accessToken?: string };
        const token = user?.accessToken;
        
        if (token) {
          const response = await axios.get(`${API_URL}/api/guest-link/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setVdoData(response.data);
        }
      } catch (error) {
        console.error('Error fetching staff status:', error);
      }
    };

    if (session?.user) {
      fetchStaffStatus();
    }
  }, [session, API_URL]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await axios.get(
          `${API_URL}/api/profiles/${params.username}/`
        );
        setProfile(profileRes.data);

        // Fetch user's media
        try {
          const mediaRes = await axios.get(
            `${API_URL}/api/media/`
          );
          // Filter for this user's media
          const userMedia = mediaRes.data.filter((asset: MediaAsset) => asset.username === params.username);
          setMediaAssets(userMedia);
        } catch (err) {
          console.error('Error fetching media:', err);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.username) {
      fetchData();
    }
  }, [params.username, API_URL]);

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'coach': return 'bg-purple-600';
      case 'athlete': return 'bg-cyan-600';
      case 'staff': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING PROFILE...</div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black mb-4 text-red-500">Profile Not Found</h1>
            <Link href="/profiles" className="text-cyan-500 hover:text-cyan-400 transition">
              ← Back to Profiles
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <Link href="/profiles" className="inline-block text-cyan-300 hover:text-white transition mb-6">
              ← Back to Profiles
            </Link>
            
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="relative w-32 h-32 rounded-full border-4 border-cyan-500 overflow-hidden shadow-neon">
                <Image 
                  src={profile.profile_image || '/default-profile.jpg'}
                  alt={profile.username}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-3xl font-black">{profile.username}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${getRoleColor(profile.role)}`}>
                    {profile.role}
                  </span>
                </div>
                
                <div className="space-y-2 text-zinc-300">
                  {profile.school_name && (
                    <p className="text-lg">{profile.school_name}</p>
                  )}
                  {profile.position && (
                    <p className="font-medium">{profile.position}</p>
                  )}
                  {profile.graduation_year && (
                    <p className="text-cyan-400">Class of {profile.graduation_year}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2">
              {/* Bio Section */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 mb-8 border border-zinc-800">
                <h2 className="text-xl font-bold mb-4 text-cyan-400">About</h2>
                <p className="text-zinc-300 leading-relaxed">
                  {profile.bio || 'No bio available for this profile.'}
                </p>
              </div>

              {/* Scouting Links */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 mb-8">
                <h2 className="text-xl font-bold mb-4 text-cyan-400">Scouting Links</h2>
                <div className="space-y-4">
                  {profile.hudl_link && (
                    <a 
                      href={profile.hudl_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-zinc-800 transition"
                    >
                      <span className="text-2xl">🎥</span>
                      <div>
                        <div className="font-medium">Hudl Highlights</div>
                        <div className="text-zinc-400 text-sm">Game footage and stats</div>
                      </div>
                    </a>
                  )}
                  
                  {profile.maxpreps_link && (
                    <a 
                      href={profile.maxpreps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-zinc-800 transition"
                    >
                      <span className="text-2xl">📊</span>
                      <div>
                        <div className="font-medium">MaxPreps Profile</div>
                        <div className="text-zinc-400 text-sm">Season statistics and rankings</div>
                      </div>
                    </a>
                  )}
                  
                  {profile.twitter_x_link && (
                    <a 
                      href={profile.twitter_x_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-zinc-800 transition"
                    >
                      <span className="text-2xl">🐦</span>
                      <div>
                        <div className="font-medium">X (Twitter)</div>
                        <div className="text-zinc-400 text-sm">Latest updates and news</div>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Media Section */}
              {mediaAssets.length > 0 && (
                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <h2 className="text-xl font-bold mb-4 text-cyan-400">📹 Uploaded Media</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mediaAssets.map((asset) => (
                      <div 
                        key={asset.id}
                        className="bg-black/40 rounded-lg overflow-hidden border border-zinc-700 hover:border-cyan-500 transition cursor-pointer"
                        onClick={() => setSelectedMedia(asset)}
                      >
                        <div className="relative h-24 bg-gradient-to-br from-purple-900 to-blue-900">
                          {asset.thumbnail_url ? (
                            <Image 
                              src={asset.thumbnail_url} 
                              alt={asset.title}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {getMediaTypeIcon(asset.media_type)}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-1 border ${getMediaTypeColor(asset.media_type)}`}>
                            {asset.media_type}
                          </div>
                          <h3 className="font-bold text-sm line-clamp-1">{asset.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 sticky top-6">
                <h3 className="text-lg font-bold mb-4 text-cyan-400">Profile Details</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-zinc-500 text-sm">Role</span>
                    <p className="font-medium capitalize">{profile.role}</p>
                  </div>
                  
                  {profile.school_name && (
                    <div>
                      <span className="text-zinc-500 text-sm">School</span>
                      <p className="font-medium">{profile.school_name}</p>
                    </div>
                  )}
                  
                  {profile.position && (
                    <div>
                      <span className="text-zinc-500 text-sm">Position</span>
                      <p className="font-medium">{profile.position}</p>
                    </div>
                  )}
                  
                  {profile.graduation_year && (
                    <div>
                      <span className="text-zinc-500 text-sm">Graduation Year</span>
                      <p className="font-medium text-cyan-400">{profile.graduation_year}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  <Link 
                    href="/contact" 
                    className="block w-full bg-cyan-600 text-black text-center py-3 rounded-lg font-bold hover:bg-cyan-400 transition"
                  >
                    Contact for Recruitment
                  </Link>
                  
                  <Link 
                    href="/shows" 
                    className="block w-full border border-zinc-700 text-center py-3 rounded-lg font-bold hover:border-cyan-500 hover:text-cyan-400 transition"
                  >
                    See Appearances
                  </Link>
                </div>

                {/* Admin Quick Actions for Staff */}
                {vdoData?.is_staff && session?.user?.name === profile.username && (
                  <div className="mt-8 pt-6 border-t border-zinc-800">
                    <h4 className="text-sm font-bold text-purple-400 mb-3 uppercase">Admin Quick Actions</h4>
                    <div className="space-y-2">
                      <Link 
                        href="/admin#shows"
                        className="block w-full bg-purple-600 text-white text-center py-2 rounded-lg font-bold hover:bg-purple-500 transition text-sm"
                      >
                        Manage Shows
                      </Link>
                      <Link 
                        href="/admin#guest-requests"
                        className="block w-full bg-cyan-600 text-black text-center py-2 rounded-lg font-bold hover:bg-cyan-500 transition text-sm"
                      >
                        Guest Requests
                      </Link>
                      <Link 
                        href="/admin#profiles"
                        className="block w-full bg-green-600 text-white text-center py-2 rounded-lg font-bold hover:bg-green-500 transition text-sm"
                      >
                        Manage Profiles
                      </Link>
                      <Link 
                        href="/admin#media"
                        className="block w-full bg-amber-600 text-white text-center py-2 rounded-lg font-bold hover:bg-amber-500 transition text-sm"
                      >
                        Media Library
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Media Modal */}
        {selectedMedia && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMedia(null)}>
            <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full border border-zinc-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="relative bg-black">
                <video 
                  src={selectedMedia.file_url} 
                  controls 
                  className="w-full aspect-video"
                  autoPlay
                />
                <button onClick={() => setSelectedMedia(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg">✕</button>
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold mb-2">{selectedMedia.title}</h2>
                {selectedMedia.description && (
                  <p className="text-zinc-400 text-sm mb-4">{selectedMedia.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}