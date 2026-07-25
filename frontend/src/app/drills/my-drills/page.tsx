'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import type { Drill } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function MyDrillsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    const fetchDrills = async () => {
      try {
        const res = await axios.get(`${API}/api/drills/my-drills/`);
        setDrills(res.data);
      } catch (err) {
        console.error('Error fetching my drills:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrills();
  }, [session, router]);

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="bg-gradient-to-r from-amber-900 to-orange-900 py-16 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">🏋️ MY DRILLS</h1>
          <p className="text-lg text-amber-300">Drills you have created</p>
        </div>

        <div className="max-w-5xl mx-auto py-12 px-6">
          {loading ? (
            <div className="text-center text-zinc-500 text-xl animate-pulse">LOADING...</div>
          ) : drills.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏋️</div>
              <p className="text-zinc-400 text-xl mb-4">You haven&apos;t created any drills yet.</p>
              <Link href="/drills/create" className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black hover:bg-amber-500 transition">
                + SHARE YOUR FIRST DRILL
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {drills.map((drill) => (
                <Link key={drill.id} href={`/drills/${drill.id}`} className="block bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 hover:border-amber-500 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{drill.title}</h3>
                      <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{drill.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        <span>👁 {drill.view_count}</span>
                        <span>❤️ {drill.like_count}</span>
                        <span>💾 {drill.save_count}</span>
                        <span>📅 {new Date(drill.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                      drill.difficulty === 'beginner' ? 'bg-green-900/30 text-green-400' :
                      drill.difficulty === 'intermediate' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>{drill.difficulty}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
