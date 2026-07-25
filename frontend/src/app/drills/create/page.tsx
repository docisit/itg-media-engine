'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import type { Sport, MediaAsset } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CreateDrillPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [sports, setSports] = useState<Sport[]>([]);
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    sport: '',
    difficulty: 'intermediate',
    equipment: '',
    duration_minutes: 15,
    reps_sets: '',
    skills_focused: '',
    video: '',
  });

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    const fetchData = async () => {
      try {
        const [sportsRes, videoRes] = await Promise.all([
          axios.get(`${API}/api/sports/`),
          axios.get(`${API}/api/media-assets/`),
        ]);
        setSports(sportsRes.data);
        setVideos(videoRes.data.filter((v: MediaAsset) => 
          v.media_type === 'video' || v.media_type === 'drill' || v.media_type === 'training'
        ));
      } catch (err) {
        console.error('Error fetching form data:', err);
      }
    };
    fetchData();
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        sport: form.sport ? Number(form.sport) : null,
        difficulty: form.difficulty,
        equipment: form.equipment,
        duration_minutes: Number(form.duration_minutes),
        reps_sets: form.reps_sets,
        skills_focused: form.skills_focused,
        video: form.video ? Number(form.video) : null,
      };

      await axios.post(`${API}/api/drills/create/`, payload);
      router.push('/drills?created=1');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.title?.[0] || 'Failed to create drill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="bg-gradient-to-r from-amber-900 to-orange-900 py-16 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">🏋️ SHARE A DRILL</h1>
          <p className="text-lg text-amber-300">
            Help other athletes level up by sharing your training drills.
          </p>
        </div>

        <div className="max-w-3xl mx-auto py-12 px-6">
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm font-bold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Drill Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Cone Drill for Lateral Quickness"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Description & Instructions
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe how to perform this drill, coaching tips, common mistakes to avoid..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Sport + Difficulty Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => updateField('sport', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Sports (General)</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => updateField('difficulty', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="beginner">🌱 Beginner</option>
                  <option value="intermediate">🔥 Intermediate</option>
                  <option value="advanced">💀 Advanced</option>
                </select>
              </div>
            </div>

            {/* Duration + Reps */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={form.duration_minutes}
                  onChange={(e) => updateField('duration_minutes', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Sets & Reps
                </label>
                <input
                  type="text"
                  value={form.reps_sets}
                  onChange={(e) => updateField('reps_sets', e.target.value)}
                  placeholder="e.g., 3x10, 5 sets of 30s"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Skills Focused */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Skills This Drill Develops
              </label>
              <input
                type="text"
                value={form.skills_focused}
                onChange={(e) => updateField('skills_focused', e.target.value)}
                placeholder="Comma-separated: e.g., lateral quickness, footwork, hand-eye coordination"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <p className="text-xs text-zinc-600 mt-1">Separate skills with commas</p>
            </div>

            {/* Equipment */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Required Equipment
              </label>
              <input
                type="text"
                value={form.equipment}
                onChange={(e) => updateField('equipment', e.target.value)}
                placeholder="Comma-separated: e.g., cones, resistance bands, jump rope"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <p className="text-xs text-zinc-600 mt-1">Separate items with commas</p>
            </div>

            {/* Video Demonstrations */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Video Demonstration (Optional)
              </label>
              <select
                value={form.video}
                onChange={(e) => updateField('video', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">No video</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-600 mt-1">
                Attach an existing uploaded video to demonstrate this drill.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 rounded-xl font-black text-lg transition ${
                  submitting
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {submitting ? '⏳ PUBLISHING DRILL...' : '🏋️ PUBLISH DRILL'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
