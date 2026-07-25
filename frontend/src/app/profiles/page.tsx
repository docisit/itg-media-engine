'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
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

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<'all' | 'coach' | 'athlete' | 'staff'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get API URL from environment variable or fallback to local development
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://127.0.0.1:8000';

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const apiUrl = `${API_URL}/api/profiles/`;
        console.log('Fetching profiles from:', apiUrl);
        
        const response = await axios.get(apiUrl);
        console.log('API Response status:', response.status);
        console.log('Number of profiles received:', response.data?.length || 0);
        
        if (Array.isArray(response.data)) {
          setProfiles(response.data);
        } else {
          console.error('API response is not an array:', response.data);
          setProfiles([]);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
        setError('Failed to fetch profiles');
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [API_URL]);

  const filteredProfiles = profiles.filter(profile => 
    filter === 'all' || profile.role === filter
  );

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'coach': return 'bg-purple-600';
      case 'athlete': return 'bg-cyan-600';
      case 'staff': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const ProfileCard = ({ profile }: { profile: Profile }) => (
    <Link href={`/profiles/${profile.username}`} className="group">
      <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 transition-all duration-300 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-105">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 rounded-full border-2 border-cyan-500 overflow-hidden bg-zinc-800">
            <Image 
              src={profile.profile_image || '/default-profile.jpg'}
              alt={profile.username}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
              {profile.username}
            </h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase ${getRoleColor(profile.role)}`}>
              {profile.role}
            </span>
          </div>
        </div>
        
        <p className="text-zinc-400 text-sm mb-3 line-clamp-3">
          {profile.bio || 'No bio available'}
        </p>

        <div className="space-y-2 text-xs text-zinc-500">
          {profile.school_name && (
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🏫</span>
              {profile.school_name}
            </div>
          )}
          {profile.position && (
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">⚽</span>
              {profile.position}
            </div>
          )}
          {profile.graduation_year && (
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🎓</span>
              Class of {profile.graduation_year}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {profile.hudl_link && (
            <a 
              href={profile.hudl_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-zinc-400 hover:text-cyan-400 transition"
            >
              Hudl
            </a>
          )}
          {profile.maxpreps_link && (
            <a 
              href={profile.maxpreps_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-zinc-400 hover:text-cyan-400 transition"
            >
              MaxPreps
            </a>
          )}
        </div>
      </div>
    </Link>
  );

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-red-500 text-2xl mb-4">Error: {error}</h1>
            <button 
              onClick={() => window.location.reload()} 
              className="text-cyan-400 hover:text-cyan-300"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING PROFILES...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 py-16 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black mb-4">PROFILES</h1>
            <p className="text-xl text-cyan-300">Discover talented athletes, experienced coaches, and staff members</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-12 px-6">
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-8 bg-zinc-900/50 rounded-xl p-1 w-fit mx-auto flex-wrap justify-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg transition ${
                filter === 'all' 
                  ? 'bg-cyan-600 text-black font-bold' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('coach')}
              className={`px-6 py-2 rounded-lg transition ${
                filter === 'coach' 
                  ? 'bg-purple-600 text-white font-bold' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Coaches
            </button>
            <button
              onClick={() => setFilter('athlete')}
              className={`px-6 py-2 rounded-lg transition ${
                filter === 'athlete' 
                  ? 'bg-cyan-600 text-black font-bold' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Athletes
            </button>
            <button
              onClick={() => setFilter('staff')}
              className={`px-6 py-2 rounded-lg transition ${
                filter === 'staff' 
                  ? 'bg-green-600 text-white font-bold' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Staff
            </button>
          </div>

          {/* Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProfiles.map((profile) => (
              <ProfileCard key={profile.username} profile={profile} />
            ))}
          </div>

          {filteredProfiles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-zinc-500 text-lg">No profiles found matching your filter.</p>
              <button 
                onClick={() => setFilter('all')}
                className="mt-4 text-cyan-400 hover:text-cyan-300 transition"
              >
                Show all profiles
              </button>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-purple-900 to-blue-900 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-black mb-4">Want to Be Featured?</h3>
            <p className="text-purple-200 mb-6">
              Coaches, athletes, and staff - showcase your talent on IN THE GAME
            </p>
            <Link 
              href="/request" 
              className="inline-block bg-white text-black px-8 py-3 rounded-xl font-black text-lg hover:bg-cyan-400 transition"
            >
              JOIN AS GUEST
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}