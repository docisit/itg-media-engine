'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import type { Drill } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function DrillDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchDrill = async () => {
      try {
        const res = await axios.get(`${API}/api/drills/${id}/`);
        setDrill(res.data);
      } catch (err) {
        console.error('Error fetching drill:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDrill();
  }, [id]);

  const handleLike = async () => {
    if (!session) return router.push('/login');
    try {
      await axios.post(`${API}/api/drills/${id}/like/`);
      setIsLiked(!isLiked);
      if (drill) setDrill({ ...drill, like_count: drill.like_count + (isLiked ? -1 : 1) });
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleSave = async () => {
    if (!session) return router.push('/login');
    try {
      await axios.post(`${API}/api/drills/${id}/save/`);
      setIsSaved(!isSaved);
      if (drill) setDrill({ ...drill, save_count: drill.save_count + (isSaved ? -1 : 1) });
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/api/drills/${id}/delete/`);
      router.push('/drills');
    } catch (err) {
      console.error('Error deleting drill:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-amber-500 text-xl font-black animate-pulse">LOADING DRILL...</div>
        </div>
      </Layout>
    );
  }

  if (!drill) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-zinc-400 text-xl mb-4">Drill not found.</p>
            <Link href="/drills" className="text-amber-500 hover:underline font-bold">
              ← Back to Drill Library
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const userId = (session?.user as any)?.id;
  const isOwner = userId && drill.creator === Number(userId);
  const skillsList = drill.skills_list || [];
  const equipmentList = drill.equipment_list || [];

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Back Link */}
        <div className="max-w-5xl mx-auto px-6 pt-8">
          <Link href="/drills" className="text-zinc-500 hover:text-amber-400 transition font-bold">
            ← Back to Drill Library
          </Link>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto py-8 px-6 grid md:grid-cols-5 gap-8">
          {/* Left: Video + Details */}
          <div className="md:col-span-3 space-y-6">
            {/* Video Area */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900 to-orange-900 aspect-video">
              {drill.video_thumbnail ? (
                <img
                  src={drill.video_thumbnail}
                  alt={drill.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-8xl">🏋️</div>
                </div>
              )}
            </div>

            {/* Title + Meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {drill.sport_name && (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-900/30 border border-green-600 text-green-400 font-bold uppercase">
                    {drill.sport_name}
                  </span>
                )}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${
                    drill.difficulty === 'beginner'
                      ? 'bg-green-900/30 border-green-600 text-green-400'
                      : drill.difficulty === 'intermediate'
                      ? 'bg-yellow-900/30 border-yellow-600 text-yellow-400'
                      : 'bg-red-900/30 border-red-600 text-red-400'
                  }`}
                >
                  {drill.difficulty_display || drill.difficulty}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black mb-2">{drill.title}</h1>

              <div className="flex items-center gap-4 text-zinc-500 text-sm mb-4">
                <span>👤 {drill.creator_name}</span>
                <span>⏱ {drill.duration_minutes} min</span>
                <span>👁 {drill.view_count} views</span>
                <span>📅 {new Date(drill.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              {drill.description && (
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{drill.description}</p>
              )}
            </div>

            {/* Skills Focused */}
            {skillsList.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">Skills Developed</h3>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, i) => (
                    <span key={i} className="text-sm px-3 py-1 rounded-full bg-orange-900/30 border border-orange-600 text-orange-400">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {equipmentList.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">Equipment Needed</h3>
                <div className="flex flex-wrap gap-2">
                  {equipmentList.map((eq, i) => (
                    <span key={i} className="text-sm px-3 py-1 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-300">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reps / Sets */}
            {drill.reps_sets && (
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-1">Recommended Sets & Reps</h3>
                <p className="text-xl font-bold text-amber-400">{drill.reps_sets}</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="md:col-span-2 space-y-4">
            {/* Action Buttons */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 space-y-3">
              <button
                onClick={handleLike}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl py-3 font-bold transition flex items-center justify-center gap-2"
              >
                {isLiked ? '❤️ Liked' : '🤍 Like'} ({drill.like_count})
              </button>
              <button
                onClick={handleSave}
                className="w-full bg-amber-600 hover:bg-amber-500 rounded-xl py-3 font-bold transition flex items-center justify-center gap-2"
              >
                {isSaved ? '💾 Saved' : '💾 Save Drill'} ({drill.save_count})
              </button>
              <Link
                href="/drills"
                className="block w-full text-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl py-3 font-bold transition"
              >
                🔥 More Drills
              </Link>
            </div>

            {/* Creator Card */}
            <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">Creator</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-xl font-black">
                  {drill.creator_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-bold">{drill.creator_name}</p>
                  <p className="text-xs text-zinc-500">
                    {drill.creator_role === 'coach' ? '👨‍🏫 Verified Coach' : '🏃 Athlete'}
                  </p>
                </div>
              </div>
            </div>

            {/* Owner Controls */}
            {isOwner && (
              <div className="bg-red-900/20 rounded-xl p-6 border border-red-800/50 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Owner Controls</h3>
                <Link
                  href={`/drills/${drill.id}/edit`}
                  className="block w-full text-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl py-2 text-sm font-bold transition"
                >
                  ✏️ Edit Drill
                </Link>
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full bg-red-900/50 hover:bg-red-800 border border-red-700 rounded-xl py-2 text-sm font-bold transition"
                  >
                    🗑️ Delete Drill
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-400 text-center font-bold">ARE YOU SURE?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        className="flex-1 bg-red-600 hover:bg-red-500 rounded-xl py-2 text-sm font-bold transition"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 rounded-xl py-2 text-sm font-bold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
