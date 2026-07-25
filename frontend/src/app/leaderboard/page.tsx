'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Layout from '@/components/Layout';

const STAT_CATEGORIES = [
  { key: 'vertical_jump', label: '⬆️ Vertical Jump', unit: 'in', higher_is_better: true },
  { key: 'forty_yard', label: '🏃 40-Yard Dash', unit: 's', higher_is_better: false },
  { key: 'shuttle', label: '↔️ Shuttle', unit: 's', higher_is_better: false },
  { key: 'max_bench', label: '🏋️ Max Bench', unit: 'lbs', higher_is_better: true },
  { key: 'max_squat', label: '🏋️ Max Squat', unit: 'lbs', higher_is_better: true },
  { key: 'max_power_clean', label: '🏋️ Power Clean', unit: 'lbs', higher_is_better: true },
  { key: 'bench_ratio', label: '📊 Bench × Weight', unit: 'x', higher_is_better: true },
  { key: 'squat_ratio', label: '📊 Squat × Weight', unit: 'x', higher_is_better: true },
  { key: 'power_clean_ratio', label: '📊 Clean × Weight', unit: 'x', higher_is_better: true },
  { key: 'gpa', label: '🎓 GPA', unit: '', higher_is_better: true },
];

const SPORTS = [
  { slug: 'football', name: '🏈 Football' },
  { slug: 'basketball', name: '🏀 Basketball' },
  { slug: 'baseball', name: '⚾ Baseball' },
  { slug: 'track', name: '🏃 Track & Field' },
  { slug: 'soccer', name: '⚽ Soccer' },
  { slug: 'wrestling', name: '🤼 Wrestling' },
  { slug: 'softball', name: '🥎 Softball' },
  { slug: 'volleyball', name: '🏐 Volleyball' },
  { slug: 'tennis', name: '🎾 Tennis' },
  { slug: 'golf', name: '⛳ Golf' },
  { slug: 'swimming', name: '🏊 Swimming' },
  { slug: 'cheerleading', name: '📣 Cheerleading' },
  { slug: 'lacrosse', name: '🥍 Lacrosse' },
  { slug: 'other', name: '⚡ Other' },
];

const STATES = ['', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

interface LeaderboardEntry {
  rank: number;
  username: string;
  profile_image: string | null;
  school_name: string;
  state: string;
  position: string;
  graduation_year: number | null;
  value: number;
}

export default function LeaderboardPage() {
  const [activeStat, setActiveStat] = useState('vertical_jump');
  const [activeSport, setActiveSport] = useState('');
  const [activeState, setActiveState] = useState('');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchLeaderboard();
  }, [activeStat, activeSport, activeState]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_BASE}/api/leaderboard/${activeStat}/?limit=50`;
      if (activeSport) url += `&sport=${activeSport}`;
      if (activeState) url += `&state=${activeState}`;
      const res = await axios.get(url);
      setData(res.data.leaderboard || []);
    } catch (err) {
      setError('Failed to load leaderboard');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const shareLeaderboard = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: 'Athlete Leaderboard', url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRowStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/40';
    if (rank === 2) return 'bg-zinc-300/5 border-zinc-400/30';
    if (rank === 3) return 'bg-amber-700/10 border-amber-700/30';
    return 'bg-zinc-900/30 border-zinc-800';
  };

  const displayStat = STAT_CATEGORIES.find(s => s.key === activeStat);
  const isHighestBetter = displayStat?.higher_is_better ?? true;

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* ═══════ HERO ═══════ */}
        <section className="relative bg-gradient-to-r from-green-900 via-emerald-900 to-cyan-900 overflow-hidden py-20 px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_70%)]"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
          <div className="relative z-10 max-w-6xl mx-auto text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight">
              Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Athlete</span> Leaderboard
            </h1>
            <p className="text-lg text-emerald-200/80 max-w-2xl mx-auto">
              Ranked by verified stats — see who's dominating in every category. 
              Filter by sport and state to find the top talent near you.
            </p>
            <button
              onClick={shareLeaderboard}
              className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition"
            >
              {copied ? '✅ Link Copied!' : '🔗 Share Leaderboard'}
            </button>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* ═══════ FILTERS ═══════ */}
          <div className="flex flex-wrap gap-4 mb-8">
            {/* Sport filter */}
            <div className="relative">
              <select
                value={activeSport}
                onChange={e => setActiveSport(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-white cursor-pointer hover:border-emerald-500 transition"
              >
                <option value="">🏆 All Sports</option>
                {SPORTS.map(s => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* State filter */}
            <div className="relative">
              <select
                value={activeState}
                onChange={e => setActiveState(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-white cursor-pointer hover:border-emerald-500 transition"
              >
                <option value="">🌎 All States</option>
                {STATES.filter(s => s).map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══════ STAT TABS ═══════ */}
          <div className="flex flex-wrap gap-2 mb-10">
            {STAT_CATEGORIES.map(stat => (
              <button
                key={stat.key}
                onClick={() => setActiveStat(stat.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                  activeStat === stat.key
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {stat.label}
              </button>
            ))}
          </div>

          {/* ═══════ LEADERBOARD TABLE ═══════ */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5 md:col-span-4">Athlete</div>
              <div className="col-span-3 md:col-span-2 text-right">
                {isHighestBetter ? '⬆️ Higher Wins' : '⬇️ Lower Wins'}
              </div>
              <div className="hidden md:block col-span-2 text-center">School</div>
              <div className="hidden md:block col-span-1 text-center">State</div>
              <div className="col-span-3 md:col-span-2 text-right">{displayStat?.label.split(' ').slice(1).join(' ') || 'Value'}</div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="p-12 text-center">
                <div className="text-4xl animate-bounce mb-4">🏆</div>
                <p className="text-zinc-500 font-bold animate-pulse">Loading leaderboard...</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="p-12 text-center">
                <p className="text-red-400 font-bold">{error}</p>
                <button onClick={fetchLeaderboard} className="mt-4 text-cyan-400 underline">Try Again</button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && data.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold mb-2">No Stats Yet</h3>
                <p className="text-zinc-500 mb-6">Athletes haven't entered stats for this category yet.</p>
                <Link
                  href="/profile/edit"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-black px-6 py-3 rounded-xl font-bold hover:bg-emerald-500 transition"
                >
                  ✏️ Enter Your Stats
                </Link>
              </div>
            )}

            {/* Rows */}
            {!loading && data.map((entry) => (
              <Link
                key={`${entry.username}-${entry.rank}`}
                href={`/profiles/${entry.username}`}
                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition items-center ${getRowStyle(entry.rank)}`}
              >
                <div className="col-span-1 text-lg font-black">{getMedalEmoji(entry.rank)}</div>
                <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                    {entry.profile_image ? (
                      <img src={entry.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      entry.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm truncate">{entry.username}</p>
                    {entry.position && (
                      <p className="text-xs text-zinc-500">{entry.position}</p>
                    )}
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2 text-right">
                  {entry.graduation_year && (
                    <span className="text-xs text-zinc-500">Class of {entry.graduation_year}</span>
                  )}
                </div>
                <div className="hidden md:block col-span-2 text-center text-sm text-zinc-400 truncate">
                  {entry.school_name || '—'}
                </div>
                <div className="hidden md:block col-span-1 text-center">
                  {entry.state ? (
                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs font-bold">{entry.state}</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </div>
                <div className="col-span-3 md:col-span-2 text-right">
                  <span className={`text-lg font-black ${
                    entry.rank === 1 ? 'text-yellow-400' :
                    entry.rank === 2 ? 'text-zinc-300' :
                    entry.rank === 3 ? 'text-amber-600' :
                    'text-emerald-400'
                  }`}>
                    {displayStat?.unit === 'x' ? entry.value.toFixed(2) + 'x' :
                     entry.value % 1 === 0 ? entry.value : entry.value.toFixed(2)}
                    {displayStat?.unit && displayStat.unit !== 'x' ? ` ${displayStat.unit}` : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════ CTA ═══════ */}
        <section className="py-16 px-6 max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-2xl p-10">
            <h2 className="text-3xl font-black mb-4">💪 Are You an Elite Athlete?</h2>
            <p className="text-zinc-400 mb-6">
              Enter your stats, get ranked, and let college coaches find you. Track your progress over time with PR badges and verified achievements.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/profile/edit"
                className="bg-emerald-600 text-black px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition"
              >
                ✏️ Enter Your Stats
              </Link>
              <Link
                href="/register"
                className="border-2 border-emerald-500 text-emerald-400 px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 hover:text-black transition"
              >
                🏁 Create Profile
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
