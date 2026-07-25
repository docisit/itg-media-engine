'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import type { Drill } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function SavedDrillsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    const fetchDrills = async () => {
      try {
        const res = await axios.get(`${API}/api/drills/saved/`);
        setDrills(res.data);
      } catch (err) {
        console.error('Error fetching saved drills:', err);
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
          <h1 className="text-4xl md:text-5xl font-black mb-4">💾 SAVED DRILLS</h1>
          <p className="text-lg text-amber-300">Drills you have bookmarked for later</p>
        </div>

        <div className="max-w-5xl mx-auto py-12 px-6">
          {loading ? (
            <div className="text-center text-zinc-500 text-xl animate-pulse">LOADING...</div>
          ) : drills.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💾</div>
              <p className="text-zinc-400 text-xl mb-4">No saved drills yet.</p>
              <Link href="/drills" className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black hover:bg-amber-500 transition">
                🔥 BROWSE DRILLS
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drills.map((drill) => (
                <Link key={drill.id} href={`/drills/${drill.id}`} className="block bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-amber-500 transition">
                  <h3 className="font-bold mb-1">{drill.title}</h3>
                  <p className="text-zinc-400 text-sm mb-2 line-clamp-2">{drill.description}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>👤 {drill.creator_name}</span>
                    <span>❤️ {drill.like_count}</span>
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
