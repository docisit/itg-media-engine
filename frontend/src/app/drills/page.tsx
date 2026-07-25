'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import type { Drill, Sport } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-900/30 border-green-600 text-green-400',
  intermediate: 'bg-yellow-900/30 border-yellow-600 text-yellow-400',
  advanced: 'bg-red-900/30 border-red-600 text-red-400',
};

const DIFFICULTY_ICONS: Record<string, string> = {
  beginner: '🌱',
  intermediate: '🔥',
  advanced: '💀',
};

export default function DrillsPage() {
  const { data: session } = useSession();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState<number | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'trending'>('trending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [drillsRes, sportsRes] = await Promise.all([
          axios.get(`${API}/api/drills/`),
          axios.get(`${API}/api/sports/`),
        ]);
        setDrills(drillsRes.data);
        setSports(sportsRes.data);
      } catch (err) {
        console.error('Error fetching drills:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter & sort
  let filtered = [...drills];
  if (activeSport) {
    filtered = filtered.filter((d) => d.sport === activeSport);
  }
  if (activeDifficulty) {
    filtered = filtered.filter((d) => d.difficulty === activeDifficulty);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.skills_focused.toLowerCase().includes(q)
    );
  }
  if (sortBy === 'trending') {
    filtered.sort((a, b) => b.view_count - a.view_count || b.like_count - a.like_count);
  } else {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING DRILL LIBRARY...</div>
        </div>
      </Layout>
    );
  }

  const featuredDrills = drills.filter((d) => d.is_featured).slice(0, 3);

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Hero */}
        <div className="bg-gradient-to-r from-amber-900 to-orange-900 py-20 px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-4">🏋️ DRILL LIBRARY</h1>
          <p className="text-xl text-amber-300 max-w-3xl mx-auto">
            Training drills shared by coaches and athletes. Level up your game.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {session && (
              <Link
                href="/drills/create"
                className="bg-white text-black px-8 py-3 rounded-xl font-black hover:bg-amber-400 transition"
              >
                + SHARE A DRILL
              </Link>
            )}
            <Link
              href="/drills/my-drills"
              className="bg-zinc-800 text-white border border-zinc-600 px-8 py-3 rounded-xl font-black hover:bg-zinc-700 transition"
            >
              MY DRILLS
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-12 px-6">
          {/* Featured */}
          {featuredDrills.length > 0 && (
            <>
              <h2 className="text-2xl font-black mb-6 text-amber-400">⭐ FEATURED DRILLS</h2>
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {featuredDrills.map((drill) => (
                  <DrillCard key={drill.id} drill={drill} featured />
                ))}
              </div>
            </>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-8 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            {/* Search */}
            <input
              type="text"
              placeholder="Search drills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 flex-1 min-w-[200px]"
            />

            {/* Sport Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveSport(null)}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  activeSport === null
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-amber-500'
                }`}
              >
                All
              </button>
              {sports.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSport(s.id === activeSport ? null : s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                    activeSport === s.id
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-amber-500'
                  }`}
                >
                  {s.icon} {s.name}
                </button>
              ))}
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-2">
              {['beginner', 'intermediate', 'advanced'].map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(activeDifficulty === d ? null : d)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                    activeDifficulty === d
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-amber-500'
                  }`}
                >
                  {DIFFICULTY_ICONS[d]} {d}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setSortBy('trending')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  sortBy === 'trending' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                🔥 Trending
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  sortBy === 'newest' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                🕐 Newest
              </button>
            </div>
          </div>

          {/* Drill Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏋️</div>
              <p className="text-zinc-400 text-xl">No drills match your filters.</p>
              {session ? (
                <Link
                  href="/drills/create"
                  className="inline-block mt-6 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500"
                >
                  Create the First Drill
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-block mt-6 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500"
                >
                  Sign In to Share Drills
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((drill) => (
                <DrillCard key={drill.id} drill={drill} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Drill Card Sub-Component ───────────────────────────────────

function DrillCard({ drill, featured }: { drill: Drill; featured?: boolean }) {
  const skills = drill.skills_list?.length > 0 ? drill.skills_list.slice(0, 3) : [];

  return (
    <Link
      href={`/drills/${drill.id}`}
      className={`block bg-zinc-900/50 rounded-2xl overflow-hidden border hover:border-amber-500 transition-all cursor-pointer group ${
        featured ? 'border-amber-700/50' : 'border-zinc-800'
      }`}
    >
      {/* Video Thumbnail Area */}
      <div className="relative h-44 bg-gradient-to-br from-amber-900 to-orange-900 overflow-hidden">
        {drill.video_thumbnail ? (
          <img
            src={drill.video_thumbnail}
            alt={drill.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl">🏋️</div>
          </div>
        )}
        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase border ${
              DIFFICULTY_COLORS[drill.difficulty] || 'bg-zinc-900/30 border-zinc-600 text-zinc-400'
            }`}
          >
            {DIFFICULTY_ICONS[drill.difficulty]} {drill.difficulty}
          </span>
        </div>
        {featured && (
          <div className="absolute top-3 left-3 bg-amber-600 text-black text-xs font-black px-2 py-1 rounded-full">
            ⭐ FEATURED
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Sport + Duration */}
        <div className="flex items-center gap-2 mb-2">
          {drill.sport_name && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 border border-green-600 text-green-400 font-bold uppercase">
              {drill.sport_name}
            </span>
          )}
          <span className="text-zinc-500 text-xs">⏱ {drill.duration_minutes} min</span>
        </div>

        <h3 className="text-lg font-bold mb-1 line-clamp-2">{drill.title}</h3>
        {drill.description && (
          <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{drill.description}</p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.map((skill, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {skill}
              </span>
            ))}
            {drill.skills_list.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                +{drill.skills_list.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Creator + Engagement */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
          <span className="font-mono">
            {drill.creator_role === 'coach' ? '👨‍🏫 ' : '🏃 '}
            {drill.creator_name}
          </span>
          <div className="flex items-center gap-3">
            <span>👁 {drill.view_count}</span>
            <span>❤️ {drill.like_count}</span>
            <span>💾 {drill.save_count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
