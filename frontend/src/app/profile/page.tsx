'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Layout from '@/components/Layout';
import Link from 'next/link';

interface SessionUser {
  username?: string;
  role?: string;
  accessToken?: string;
}

interface Sport {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

interface ProfileData {
  profile_image?: string;
  bio?: string;
  hudl_link?: string;
  maxpreps_link?: string;
  twitter_x_link?: string;
  graduation_year?: number;
  position?: string;
  school_name?: string;
  // === Athlete Stats (hidden in current stub) ===
  state?: string;
  sports?: Sport[];
  height_ft?: number;
  height_in?: number;
  weight_lbs?: number;
  vertical_jump_in?: number;
  forty_yard_time?: number;
  max_bench_lbs?: number;
  max_squat_lbs?: number;
  max_power_clean_lbs?: number;
  shuttle_time?: number;
  gpa?: number;
}

function StatCard({ label, value, icon }: { label: string; value: string | number | null | undefined; icon: string }) {
  return (
    <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-black text-white">
        {value !== null && value !== undefined && value !== '' ? value : <span className="text-zinc-700 text-sm">—</span>}
      </div>
    </div>
  );
}

function RatioBadge({ label, value, bw }: { label: string; value: number | null | undefined; bw: number | null | undefined }) {
  const ratio = bw && value ? (value / bw).toFixed(2) : null;
  return (
    <div className="text-center bg-black/30 rounded-lg p-2 border border-zinc-800/50">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-cyan-400">{ratio ? `${ratio}x` : '—'}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const user = session?.user as SessionUser;
        const token = user?.accessToken;
        
        if (token) {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/profile/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setProfileData(response.data);
        }
      } catch (err: any) {
        console.error('Error fetching profile data:', err);
        setError(err?.response?.data?.detail || 'Failed to load profile data');
      } finally {
        setLoadingProfile(false);
      }
    };
    
    if (session?.user) {
      fetchProfileData();
    } else {
      setLoadingProfile(false);
    }
  }, [session]);

  if (status === 'loading' || loadingProfile) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING PROFILE...</div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black mb-4 text-red-500">Access Denied</h1>
            <p className="text-zinc-400 mb-6">Please log in to view your profile.</p>
            <Link href="/login" className="text-cyan-500 hover:text-cyan-400 transition">
              Go to Login →
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const user = session.user as SessionUser;
  const d = profileData;
  const bw = d?.weight_lbs || null;
  const fullName = user.username || 'Not set';

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* ===== HEADER ===== */}
        <div className="bg-gradient-to-r from-purple-900 via-cyan-900 to-emerald-900 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-black">Your Scouting Profile</h1>
                <p className="text-purple-200 mt-2">{d?.school_name || 'No school set'} • {d?.state || ''}</p>
              </div>
              <Link href="/dashboard" className="text-cyan-400 hover:text-white transition">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-8 px-6">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-4 mb-6 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* ===== LEFT COLUMN — Identity + Schools + Links ===== */}
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 text-center">
                <div className="relative w-28 h-28 rounded-full border-4 border-cyan-500 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.3)] mx-auto mb-4 bg-zinc-900">
                  <Image 
                    src={d?.profile_image || '/default-profile.jpg'}
                    alt="Profile"
                    fill
                    unoptimized
                    className="object-cover"
                    priority
                  />
                </div>
                <h2 className="text-2xl font-black text-white">{fullName}</h2>
                <p className="text-cyan-400 capitalize font-bold">{user.role || 'Athlete'}</p>
                <div className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold bg-green-600/20 text-green-400 border border-green-600/30">
                  ✅ Active
                </div>

                <div className="mt-6 space-y-2">
                  {d?.school_name && (
                    <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <span>🏫</span> {d.school_name}{d?.state ? `, ${d.state}` : ''}
                    </div>
                  )}
                  {d?.graduation_year && (
                    <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <span>🎓</span> Class of {d.graduation_year}
                    </div>
                  )}
                  {d?.position && (
                    <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <span>🎯</span> {d.position}
                    </div>
                  )}
                  {d?.gpa && (
                    <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                      <span>📚</span> GPA: {d.gpa}
                    </div>
                  )}
                </div>

                <Link 
                  href="/profile/edit" 
                  className="inline-block mt-6 bg-cyan-600 text-black px-8 py-3 rounded-xl font-black hover:bg-cyan-400 transition-all active:scale-95 w-full text-center"
                >
                  ✏️ Edit Profile
                </Link>
              </div>

              {/* Scouting Links */}
              {(d?.hudl_link || d?.maxpreps_link || d?.twitter_x_link) && (
                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">🔗 Scouting Links</h3>
                  <div className="space-y-3">
                    {d?.hudl_link && (
                      <a href={d.hudl_link} target="_blank" rel="noopener noreferrer" 
                         className="flex items-center gap-3 bg-orange-900/20 border border-orange-800/30 p-3 rounded-xl hover:bg-orange-900/40 transition group">
                        <span className="text-lg">🏈</span>
                        <span className="text-sm font-bold text-orange-400 group-hover:text-orange-300">Hudl Highlights</span>
                        <span className="ml-auto text-orange-600">↗</span>
                      </a>
                    )}
                    {d?.maxpreps_link && (
                      <a href={d.maxpreps_link} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-3 bg-blue-900/20 border border-blue-800/30 p-3 rounded-xl hover:bg-blue-900/40 transition group">
                        <span className="text-lg">📊</span>
                        <span className="text-sm font-bold text-blue-400 group-hover:text-blue-300">MaxPreps Profile</span>
                        <span className="ml-auto text-blue-600">↗</span>
                      </a>
                    )}
                    {d?.twitter_x_link && (
                      <a href={d.twitter_x_link} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-3 bg-cyan-900/20 border border-cyan-800/30 p-3 rounded-xl hover:bg-cyan-900/40 transition group">
                        <span className="text-lg">𝕏</span>
                        <span className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300">X (Twitter)</span>
                        <span className="ml-auto text-cyan-600">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Bio */}
              {d?.bio && (
                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">📝 Bio</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">{d.bio}</p>
                </div>
              )}
            </div>

            {/* ===== RIGHT COLUMN (2/3) — Measurables + Stats + Maxes ===== */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sports */}
              {d?.sports && d.sports.length > 0 && (
                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">🏀 Sports</h3>
                  <div className="flex flex-wrap gap-2">
                    {d.sports.map(sport => (
                      <span key={sport.id} className="px-3 py-1.5 bg-cyan-900/30 text-cyan-300 border border-cyan-800/50 rounded-xl text-sm font-bold">
                        {sport.icon} {sport.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Measurables Grid */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">📏 Measurables</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <StatCard label="Height" value={d?.height_ft && d?.height_in ? `${d.height_ft}'${d.height_in}"` : null} icon="📏" />
                  <StatCard label="Weight" value={d?.weight_lbs ? `${d.weight_lbs} lbs` : null} icon="⚖️" />
                  <StatCard label="Vertical Jump" value={d?.vertical_jump_in ? `${d.vertical_jump_in}"` : null} icon="⬆️" />
                  <StatCard label="40-Yard Dash" value={d?.forty_yard_time ? `${d.forty_yard_time}s` : null} icon="🏃" />
                  <StatCard label="Shuttle" value={d?.shuttle_time ? `${d.shuttle_time}s` : null} icon="↔️" />
                </div>
              </div>

              {/* Lifting Maxes */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">🏋️ Lifting Maxes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <StatCard label="Bench Press" value={d?.max_bench_lbs ? `${d.max_bench_lbs} lbs` : null} icon="💪" />
                  <StatCard label="Squat" value={d?.max_squat_lbs ? `${d.max_squat_lbs} lbs` : null} icon="🦵" />
                  <StatCard label="Power Clean" value={d?.max_power_clean_lbs ? `${d.max_power_clean_lbs} lbs` : null} icon="🏋️" />
                </div>
                
                {/* Strength Ratios */}
                {bw && (d?.max_bench_lbs || d?.max_squat_lbs || d?.max_power_clean_lbs) && (
                  <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">⚡ Strength-to-Bodyweight Ratios</p>
                    <div className="grid grid-cols-3 gap-3">
                      <RatioBadge label="Bench / BW" value={d?.max_bench_lbs} bw={bw} />
                      <RatioBadge label="Squat / BW" value={d?.max_squat_lbs} bw={bw} />
                      <RatioBadge label="Clean / BW" value={d?.max_power_clean_lbs} bw={bw} />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">⚡ Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Link href="/dashboard" className="bg-zinc-800/50 hover:bg-zinc-700/50 p-4 rounded-xl border border-zinc-700 transition text-center">
                    <div className="text-lg mb-1">📊</div>
                    <div className="text-xs font-bold text-white">Dashboard</div>
                  </Link>
                  <Link href="/media" className="bg-zinc-800/50 hover:bg-zinc-700/50 p-4 rounded-xl border border-zinc-700 transition text-center">
                    <div className="text-lg mb-1">🎬</div>
                    <div className="text-xs font-bold text-white">Media</div>
                  </Link>
                  <Link href="/leaderboard" className="bg-zinc-800/50 hover:bg-zinc-700/50 p-4 rounded-xl border border-zinc-700 transition text-center">
                    <div className="text-lg mb-1">🏆</div>
                    <div className="text-xs font-bold text-white">Rankings</div>
                  </Link>
                  <Link href="/request" className="bg-zinc-800/50 hover:bg-zinc-700/50 p-4 rounded-xl border border-zinc-700 transition text-center">
                    <div className="text-lg mb-1">🎙️</div>
                    <div className="text-xs font-bold text-white">Be a Guest</div>
                  </Link>
                  <Link href="/drills" className="bg-zinc-800/50 hover:bg-zinc-700/50 p-4 rounded-xl border border-zinc-700 transition text-center">
                    <div className="text-lg mb-1">🏈</div>
                    <div className="text-xs font-bold text-white">Drills</div>
                  </Link>
                  <Link href="/profiles" className="bg-zinc-800/50 hover:bg-zinc-700/50 p-4 rounded-xl border border-zinc-700 transition text-center">
                    <div className="text-lg mb-1">👥</div>
                    <div className="text-xs font-bold text-white">Athletes</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
