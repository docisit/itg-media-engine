'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Link from 'next/link';

interface SessionUser {
  accessToken: string;
  is_staff: boolean;
}

export default function EditShowPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    guest_name_override: '',
    air_date: '',
    video_url: '',
    transcript: '',
  });

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load the existing show data into the form
  useEffect(() => {
    const fetchShow = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/shows/${id}/`);
        const showData = res.data;
        setFormData({
          title: showData.title || '',
          guest_name_override: showData.guest_name_override || '',
          air_date: showData.air_date ? showData.air_date.split('T')[0] : '',
          video_url: showData.video_url || '',
          transcript: showData.transcript || '',
        });
      } catch (err: any) {
        console.error('Error fetching show:', err);
        setError('Failed to load show data');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchShow();
  }, [id]);

  // Handle saving the changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = (session?.user as SessionUser)?.accessToken;
      if (!token) {
        setError('Authentication required. Please log in again.');
        setSaving(false);
        return;
      }

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/shows/${id}/`,
        formData,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      alert('Show updated successfully!');
      router.push('/admin');
    } catch (err: any) {
      console.error('Update failed', err);
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to update show. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!session || !(session.user as SessionUser)?.is_staff) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-4 text-red-500">Access Denied</h1>
          <p className="text-zinc-400 mb-6">You don't have permission to edit shows.</p>
          <Link href="/" className="text-cyan-500 hover:text-cyan-400 transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black">Edit Show</h1>
              <p className="text-purple-200 mt-2">Update show details and settings</p>
            </div>
            <Link href="/admin" className="text-cyan-400 hover:text-white transition">
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 space-y-6">
            <h2 className="text-xl font-bold mb-4">Show Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Show Title *</label>
                <input 
                  className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:border-cyan-500 focus:outline-none transition"
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="Enter show title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Guest Name Override</label>
                <input 
                  className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:border-cyan-500 focus:outline-none transition"
                  value={formData.guest_name_override} 
                  onChange={e => setFormData({...formData, guest_name_override: e.target.value})} 
                  placeholder="Enter guest name"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Air Date</label>
                <input 
                  type="date"
                  className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:border-cyan-500 focus:outline-none transition"
                  value={formData.air_date} 
                  onChange={e => setFormData({...formData, air_date: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Video URL</label>
                <input 
                  type="url"
                  className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:border-cyan-500 focus:outline-none transition"
                  value={formData.video_url} 
                  onChange={e => setFormData({...formData, video_url: e.target.value})} 
                  placeholder="https://example.com/video"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Transcript</label>
              <textarea 
                className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:border-cyan-500 focus:outline-none transition resize-none"
                value={formData.transcript} 
                onChange={e => setFormData({...formData, transcript: e.target.value})} 
                placeholder="Show transcript (optional)"
                rows={5}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 text-white py-4 rounded-xl font-black text-lg hover:from-cyan-500 hover:to-purple-500 transition disabled:opacity-50"
            >
              {saving ? 'SAVING...' : '💾 SAVE CHANGES'}
            </button>
            <Link 
              href="/admin"
              className="flex-1 border border-zinc-700 py-4 rounded-xl font-bold text-center hover:bg-zinc-800 transition"
            >
              CANCEL
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
