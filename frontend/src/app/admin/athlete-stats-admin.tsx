'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Sport {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

interface AthleteProfile {
  username: string;
  email: string;
  role: string;
  bio: string;
  school_name: string;
  state: string;
  sports_list: { id: number; name: string; icon: string }[];
  height_display: string;
  weight_lbs: number | null;
  vertical_jump_in: number | null;
  forty_yard_time: number | null;
  max_bench_lbs: number | null;
  max_squat_lbs: number | null;
  max_power_clean_lbs: number | null;
  shuttle_time: number | null;
  gpa: number | null;
  bench_ratio: number | null;
  squat_ratio: number | null;
  power_clean_ratio: number | null;
}

interface LeaderboardEntry {
  username: string;
  school_name: string;
  state: string;
  value: number;
  previous_value: number | null;
  trend: 'up' | 'down' | 'same' | null;
}

interface LeaderboardResponse {
  stat_type: string;
  label: string;
  higher_is_better: boolean;
  leaderboard: LeaderboardEntry[];
}

interface VerificationVideo {
  id: number;
  athlete_username: string;
  athlete_school: string;
  stat_type: string;
  video_url: string;
  is_approved: boolean;
  uploaded_at: string;
}

const STAT_OPTIONS = [
  { value: 'bench_ratio', label: '🏋️ Bench x Weight', higher: true },
  { value: 'squat_ratio', label: '🦵 Squat x Weight', higher: true },
  { value: 'power_clean_ratio', label: '💪 Clean x Weight', higher: true },
  { value: 'vertical_jump', label: '⬆️ Vertical Jump', higher: true },
  { value: 'forty_yard', label: '🏃 40 Yard Dash', higher: false },
  { value: 'max_bench', label: '🏋️ Max Bench', higher: true },
  { value: 'max_squat', label: '🦵 Max Squat', higher: true },
  { value: 'max_power_clean', label: '💪 Max Clean', higher: true },
  { value: 'shuttle', label: '↔️ Shuttle Time', higher: false },
  { value: 'gpa', label: '📚 GPA', higher: true },
];

interface Props {
  accessToken: string;
  API_BASE: string;
}

export default function AthleteStatsAdmin({ accessToken, API_BASE }: Props) {
  const [activeSection, setActiveSection] = useState<'leaderboard' | 'athletes' | 'verifications'>('leaderboard');
  const [sports, setSports] = useState<Sport[]>([]);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [selectedStat, setSelectedStat] = useState('bench_ratio');
  const [verifications, setVerifications] = useState<VerificationVideo[]>([]);
  const [filterSport, setFilterSport] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAthletes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/profiles/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      // Filter to those with athlete stats
      const allProfiles: AthleteProfile[] = res.data;
      setAthletes(allProfiles.filter(p => p.role === 'athlete' || p.max_bench_lbs || p.forty_yard_time));
    } catch (e) { console.error('Error fetching athletes:', e); }
  }, [accessToken, API_BASE]);

  const fetchSports = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sports/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setSports(res.data);
    } catch (e) { console.error('Error fetching sports:', e); }
  }, [accessToken, API_BASE]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/leaderboard/${selectedStat}/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setLeaderboard(res.data);
    } catch (e) { console.error('Error fetching leaderboard:', e); }
  }, [accessToken, API_BASE, selectedStat]);

  const fetchVerifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/verifications/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setVerifications(res.data);
    } catch (e) { console.error('Error fetching verifications:', e); }
  }, [accessToken, API_BASE]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchAthletes(),
      fetchSports(),
      fetchLeaderboard(),
      fetchVerifications(),
    ]).finally(() => setIsLoading(false));
  }, [fetchAthletes, fetchSports, fetchLeaderboard, fetchVerifications]);

  const approveVideo = async (videoId: number) => {
    try {
      await axios.post(`${API_BASE}/api/verifications/${videoId}/approve/`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchVerifications();
    } catch (e) { console.error('Error approving video:', e); }
  };

  const rejectVideo = async (videoId: number) => {
    try {
      await axios.post(`${API_BASE}/api/verifications/${videoId}/reject/`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchVerifications();
    } catch (e) { console.error('Error rejecting video:', e); }
  };

  // Stats
  const pendingCount = verifications.filter(v => !v.is_approved).length;
  const athletesWithStats = athletes.filter(a => a.max_bench_lbs || a.vertical_jump_in || a.forty_yard_time);
  const recentSubmissions = athletes.filter(a => {
    // Consider athletes having any stat as "recent" if we want simple metrics
    return a.max_bench_lbs || a.vertical_jump_in || a.max_squat_lbs;
  }).length;

  const getTrendIcon = (trend: 'up' | 'down' | 'same' | null) => {
    switch (trend) {
      case 'up': return <span className="text-green-400 text-lg">⬆️</span>;
      case 'down': return <span className="text-red-400 text-lg">⬇️</span>;
      case 'same': return <span className="text-zinc-500">➡️</span>;
      default: return <span className="text-yellow-400 text-sm font-bold bg-yellow-900/30 px-2 py-0.5 rounded-full">NEW</span>;
    }
  };

  const statLabel = STAT_OPTIONS.find(s => s.value === selectedStat);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING ATHLETE STATS...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/20 rounded-2xl p-5 border border-purple-800/50">
          <div className="text-3xl mb-2">🏋️</div>
          <div className="text-3xl font-black text-white">{athletesWithStats.length}</div>
          <div className="text-purple-300 text-sm font-medium mt-1">Athletes with Stats</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/20 rounded-2xl p-5 border border-cyan-800/50">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-3xl font-black text-white">{recentSubmissions}</div>
          <div className="text-cyan-300 text-sm font-medium mt-1">Stats Submitted</div>
        </div>
        <div className={`rounded-2xl p-5 border ${pendingCount > 0 ? 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/20 border-yellow-700/50' : 'bg-zinc-900/50 border-zinc-800'}`}>
          <div className="text-3xl mb-2">📹</div>
          <div className={`text-3xl font-black ${pendingCount > 0 ? 'text-yellow-400' : 'text-white'}`}>{pendingCount}</div>
          <div className="text-sm font-medium mt-1">
            {pendingCount > 0 ? (
              <span className="text-yellow-400 font-bold animate-pulse">Pending Verification</span>
            ) : (
              <span className="text-zinc-400">Pending Verification</span>
            )}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/20 rounded-2xl p-5 border border-green-800/50">
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-3xl font-black text-white">{sports.length}</div>
          <div className="text-green-300 text-sm font-medium mt-1">Sports Available</div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-1 bg-zinc-900 rounded-lg p-1 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveSection('leaderboard')}
          className={`flex-shrink-0 px-4 py-2 rounded-md text-sm transition ${activeSection === 'leaderboard' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setActiveSection('athletes')}
          className={`flex-shrink-0 px-4 py-2 rounded-md text-sm transition ${activeSection === 'athletes' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
        >
          🏃 Athletes
        </button>
        <button
          onClick={() => setActiveSection('verifications')}
          className={`flex-shrink-0 px-4 py-2 rounded-md text-sm transition flex items-center gap-1 ${activeSection === 'verifications' ? 'bg-cyan-600 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
        >
          ✅ Verifications
          {pendingCount > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* LEADERBOARD SECTION */}
      {activeSection === 'leaderboard' && (
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div>
              <label className="block text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wider">Stat Type</label>
              <select
                value={selectedStat}
                onChange={(e) => setSelectedStat(e.target.value)}
                className="bg-black border border-zinc-800 p-2 rounded-lg text-white text-sm"
              >
                {STAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wider">Filter Sport</label>
              <select
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value)}
                className="bg-black border border-zinc-800 p-2 rounded-lg text-white text-sm"
              >
                <option value="">All Sports</option>
                {sports.map(s => (
                  <option key={s.id} value={s.slug}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wider">Filter State</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="bg-black border border-zinc-800 p-2 rounded-lg text-white text-sm"
              >
                <option value="">All States</option>
                {[...new Set(athletes.filter(a => a.state).map(a => a.state))].sort().map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchLeaderboard}
              className="bg-cyan-600/20 text-cyan-400 border border-cyan-800 px-4 py-2 rounded-lg text-sm hover:bg-cyan-600/30 transition mt-5"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {statLabel?.label} Leaderboard
                <span className="text-zinc-500 text-sm font-normal ml-2">
                  (higher is {statLabel?.higher ? 'better ↑' : 'better ↓'})
                </span>
              </h3>
            </div>

            {(!leaderboard || leaderboard.leaderboard.length === 0) ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🏆</div>
                <p className="text-zinc-500 font-medium">No athletes have entered this stat yet.</p>
                <p className="text-zinc-600 text-sm mt-1">Leaderboard will populate as athletes submit their stats.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {leaderboard.leaderboard.map((entry, index) => (
                  <div key={entry.username} className="flex items-center px-6 py-4 hover:bg-zinc-800/30 transition">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mr-4 ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-zinc-400 text-black' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <Link href={`/profiles/${entry.username}`} className="font-bold text-white hover:text-cyan-400 transition">
                        {entry.username}
                      </Link>
                      <div className="text-zinc-500 text-sm">
                        {entry.school_name}{entry.state ? ` • ${entry.state}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getTrendIcon(entry.trend)}
                      <div className="text-right">
                        <div className="font-bold text-lg">{entry.value.toFixed(2)}</div>
                        {entry.previous_value !== null && (
                          <div className="text-xs text-zinc-500">prev: {entry.previous_value.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATHLETES SECTION */}
      {activeSection === 'athletes' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Athlete Profiles ({athletesWithStats.length})</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search athlete..."
                className="bg-black border border-zinc-800 p-2 rounded-lg text-sm text-white w-48"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {athletesWithStats.length === 0 ? (
              <div className="bg-zinc-900/50 rounded-2xl p-10 text-center border border-zinc-800">
                <div className="text-5xl mb-4">🏃</div>
                <p className="text-zinc-500">No athletes have submitted stats yet.</p>
              </div>
            ) : (
              athletesWithStats.map((athlete) => (
                <div key={athlete.username} className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800 hover:border-cyan-800/50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/profiles/${athlete.username}`} className="text-lg font-bold text-white hover:text-cyan-400 transition">
                          {athlete.username}
                        </Link>
                        {athlete.state && (
                          <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">{athlete.state}</span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-sm mt-1">
                        {athlete.school_name}{athlete.sports_list?.length ? ` • ${athlete.sports_list.map(s => s.icon).join(' ')}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-cyan-400">{athlete.height_display}</div>
                      {athlete.weight_lbs && <div className="text-zinc-400 text-sm">{athlete.weight_lbs} lbs</div>}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">Vertical</div>
                      <div className="font-bold text-lg">{athlete.vertical_jump_in ? `${athlete.vertical_jump_in}"` : '—'}</div>
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">40 Yard</div>
                      <div className="font-bold text-lg">{athlete.forty_yard_time ? `${athlete.forty_yard_time}s` : '—'}</div>
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">Bench</div>
                      <div className="font-bold text-lg">{athlete.max_bench_lbs ? `${athlete.max_bench_lbs}` : '—'}</div>
                      {athlete.bench_ratio && <div className="text-xs text-green-400">{athlete.bench_ratio}x BW</div>}
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">Squat</div>
                      <div className="font-bold text-lg">{athlete.max_squat_lbs ? `${athlete.max_squat_lbs}` : '—'}</div>
                      {athlete.squat_ratio && <div className="text-xs text-green-400">{athlete.squat_ratio}x BW</div>}
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">Clean</div>
                      <div className="font-bold text-lg">{athlete.max_power_clean_lbs ? `${athlete.max_power_clean_lbs}` : '—'}</div>
                      {athlete.power_clean_ratio && <div className="text-xs text-green-400">{athlete.power_clean_ratio}x BW</div>}
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">Shuttle</div>
                      <div className="font-bold text-lg">{athlete.shuttle_time ? `${athlete.shuttle_time}s` : '—'}</div>
                    </div>
                    <div className="bg-black/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">GPA</div>
                      <div className="font-bold text-lg">{athlete.gpa ? athlete.gpa.toFixed(2) : '—'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VERIFICATIONS SECTION */}
      {activeSection === 'verifications' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Video Verifications</h2>
              <p className="text-zinc-500 text-sm mt-1">
                Review athlete-submitted videos to verify their stats
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
                {pendingCount} pending
              </span>
            )}
          </div>

          {verifications.length === 0 ? (
            <div className="bg-zinc-900/50 rounded-2xl p-12 text-center border border-zinc-800">
              <div className="text-5xl mb-4">📹</div>
              <p className="text-zinc-500 font-medium">No verification videos submitted yet.</p>
              <p className="text-zinc-600 text-sm mt-1">When athletes upload videos proving their stats, they'll appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {verifications.map((video) => (
                <div key={video.id} className={`rounded-2xl p-5 border ${video.is_approved ? 'bg-green-900/10 border-green-800/30' : 'bg-yellow-900/10 border-yellow-800/30'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{video.athlete_username}</span>
                        {video.is_approved ? (
                          <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">✅ Verified</span>
                        ) : (
                          <span className="bg-yellow-600 text-black text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">⏳ Pending</span>
                        )}
                      </div>
                      <div className="text-zinc-500 text-sm mt-1">
                        {video.athlete_school} • Stat: <span className="text-cyan-400 font-medium">{video.stat_type}</span>
                      </div>
                      <div className="text-zinc-600 text-xs mt-1">
                        Uploaded: {new Date(video.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-500 transition"
                      >
                        ▶️ Watch
                      </a>
                      {!video.is_approved && (
                        <>
                          <button
                            onClick={() => approveVideo(video.id)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-500 transition"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => rejectVideo(video.id)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-500 transition"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {video.is_approved && (
                        <button
                          onClick={() => rejectVideo(video.id)}
                          className="bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-600 transition"
                        >
                          ↺ Undo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
