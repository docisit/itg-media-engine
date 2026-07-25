'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Layout from '@/components/Layout';

type UserWithAccessToken = { accessToken?: string };

interface Sport {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

const STATES = [
  '', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function EditProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);

  const [formData, setFormData] = useState({
    bio: '',
    hudl_link: '',
    maxpreps_link: '',
    twitter_x_link: '',
    graduation_year: '',
    position: '',
    school_name: '',
    // === ATHLETE STATS ===
    state: '',
    sport_ids: [] as number[],
    height_ft: '',
    height_in: '',
    weight_lbs: '',
    vertical_jump_in: '',
    forty_yard_time: '',
    max_bench_lbs: '',
    max_squat_lbs: '',
    max_power_clean_lbs: '',
    shuttle_time: '',
    gpa: '',
  });

  useEffect(() => {
    const token = (session?.user as UserWithAccessToken)?.accessToken;
    if (token) {
      // Fetch sports list
      axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/sports/`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(res => setSports(res.data)).catch(() => {});

      // Fetch profile
      axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/profile/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => {
        const d = res.data;
        // Convert sport_ids from API response (sports is an array of objects)
        const existingSportIds = (d.sports || []).map((s: Sport) => s.id);
        setFormData({
          bio: d.bio || '',
          hudl_link: d.hudl_link || '',
          maxpreps_link: d.maxpreps_link || '',
          twitter_x_link: d.twitter_x_link || '',
          graduation_year: d.graduation_year?.toString() || '',
          position: d.position || '',
          school_name: d.school_name || '',
          state: d.state || '',
          sport_ids: existingSportIds,
          height_ft: d.height_ft?.toString() || '',
          height_in: d.height_in?.toString() || '',
          weight_lbs: d.weight_lbs?.toString() || '',
          vertical_jump_in: d.vertical_jump_in?.toString() || '',
          forty_yard_time: d.forty_yard_time?.toString() || '',
          max_bench_lbs: d.max_bench_lbs?.toString() || '',
          max_squat_lbs: d.max_squat_lbs?.toString() || '',
          max_power_clean_lbs: d.max_power_clean_lbs?.toString() || '',
          shuttle_time: d.shuttle_time?.toString() || '',
          gpa: d.gpa?.toString() || '',
        });
        if (d.profile_image) setPreviewUrl(d.profile_image);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading profile:', err);
        setLoading(false);
      });
    }
  }, [session]);

  const toggleSport = (sportId: number) => {
    setFormData(prev => ({
      ...prev,
      sport_ids: prev.sport_ids.includes(sportId)
        ? prev.sport_ids.filter(id => id !== sportId)
        : [...prev.sport_ids, sportId],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = (session?.user as UserWithAccessToken)?.accessToken;

    if (!token) {
      alert("Authentication error. Please log in again.");
      setSaving(false);
      return;
    }

    const data = new FormData();

    // Helper to append number or string
    const appendIf = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        data.append(key, value.toString());
      }
    };

    appendIf('bio', formData.bio);
    appendIf('hudl_link', formData.hudl_link);
    appendIf('maxpreps_link', formData.maxpreps_link);
    appendIf('twitter_x_link', formData.twitter_x_link);
    if (formData.graduation_year) {
      const year = parseInt(formData.graduation_year);
      if (!isNaN(year)) appendIf('graduation_year', year);
    }
    appendIf('position', formData.position);
    appendIf('school_name', formData.school_name);

    // Athlete Stats
    appendIf('state', formData.state);
    // sport_ids — append each as separate entry
    formData.sport_ids.forEach(id => data.append('sport_ids', id.toString()));
    
    appendIf('height_ft', formData.height_ft);
    appendIf('height_in', formData.height_in);
    appendIf('weight_lbs', formData.weight_lbs);
    appendIf('vertical_jump_in', formData.vertical_jump_in);
    appendIf('forty_yard_time', formData.forty_yard_time);
    appendIf('max_bench_lbs', formData.max_bench_lbs);
    appendIf('max_squat_lbs', formData.max_squat_lbs);
    appendIf('max_power_clean_lbs', formData.max_power_clean_lbs);
    appendIf('shuttle_time', formData.shuttle_time);
    appendIf('gpa', formData.gpa);

    if (profileImage) {
      data.append('profile_image', profileImage);
    }

    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/profile/`,
        data,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.status === 200) {
        alert("Profile updated successfully!");
        router.push('/dashboard');
      } else {
        throw new Error(`Failed to save profile: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      let errorMessage = "Error saving profile";
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.errors) {
        errorMessage = Object.entries(err.response.data.errors)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? (errors as string[]).join(', ') : errors}`)
          .join('\n');
      } else if (err.response?.data) {
        errorMessage = JSON.stringify(err.response.data);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      alert(`Profile save failed: ${errorMessage}`);
      setSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500 animate-pulse font-black">LOADING PROFILE...</div>;

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl shadow-neon">
        <h1 className="text-3xl font-black mb-8 tracking-tighter uppercase">
          Edit <span className="text-cyan-500">Scouting</span> Profile
        </h1>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* JERSEY IMAGE UPLOAD SECTION */}
          <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 mb-8">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-4">Jersey Profile Photo</label>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full border-2 border-cyan-500 overflow-hidden shadow-neon bg-zinc-900 shrink-0">
                <Image 
                  src={previewUrl || '/default-profile.jpg'} 
                  alt="Preview" 
                  className="object-cover w-full h-full"
                  fill
                  unoptimized
                  sizes="96px"
                />
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                title="Upload jersey profile photo"
                className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-cyan-600 file:text-black hover:file:bg-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* === SECTION: Basic Info === */}
          <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">📍 Location & Academics</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="school_name" className="block text-xs font-bold text-zinc-500 uppercase mb-2">School Name</label>
                <input 
                  id="school_name"
                  type="text" value={formData.school_name}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-xs font-bold text-zinc-500 uppercase mb-2">State</label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-white"
                >
                  <option value="">— Select State —</option>
                  {STATES.filter(s => s).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="position" className="block text-xs font-bold text-zinc-500 uppercase mb-2">Position</label>
                <input 
                  id="position"
                  type="text" value={formData.position}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="graduation_year" className="block text-xs font-bold text-zinc-500 uppercase mb-2">Grad Year</label>
                <input 
                  id="graduation_year"
                  type="number" value={formData.graduation_year} placeholder="e.g. 2026"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, graduation_year: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">GPA</label>
              <input 
                type="number" step="0.01" min="0" max="4.0"
                value={formData.gpa} placeholder="e.g. 3.50"
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all max-w-xs"
                onChange={(e) => setFormData({...formData, gpa: e.target.value})}
              />
            </div>
          </div>

          {/* === SECTION: Sports === */}
          <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">🏀 Sports I Play</h2>
            {sports.length === 0 ? (
              <p className="text-zinc-500 text-sm">Loading sports...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sports.map(sport => {
                  const selected = formData.sport_ids.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                        selected
                          ? 'bg-cyan-600 border-cyan-500 text-black'
                          : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {sport.icon} {sport.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* === SECTION: Measurables === */}
          <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">📏 Measurables</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Height (ft)</label>
                <select
                  value={formData.height_ft}
                  onChange={(e) => setFormData({...formData, height_ft: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-white"
                >
                  <option value="">— ft —</option>
                  {[4,5,6,7].map(ft => (
                    <option key={ft} value={ft}>{ft}'</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Height (in)</label>
                <select
                  value={formData.height_in}
                  onChange={(e) => setFormData({...formData, height_in: e.target.value})}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-white"
                >
                  <option value="">— in —</option>
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i}>{i}"</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Weight (lbs)</label>
                <input 
                  type="number" value={formData.weight_lbs} placeholder="e.g. 185"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, weight_lbs: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* === SECTION: Performance Stats === */}
          <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">⚡ Performance Stats</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">⬆️ Vertical Jump (inches)</label>
                <input 
                  type="number" step="0.5"
                  value={formData.vertical_jump_in} placeholder="e.g. 32"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, vertical_jump_in: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">🏃 40-Yard Dash (seconds)</label>
                <input 
                  type="number" step="0.01"
                  value={formData.forty_yard_time} placeholder="e.g. 4.5"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, forty_yard_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">↔️ Pro-Agility Shuttle (seconds)</label>
                <input 
                  type="number" step="0.01"
                  value={formData.shuttle_time} placeholder="e.g. 4.2"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, shuttle_time: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* === SECTION: Lifting Maxes === */}
          <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">🏋️ Lifting Maxes (lbs)</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Max Bench Press</label>
                <input 
                  type="number" value={formData.max_bench_lbs} placeholder="e.g. 225"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, max_bench_lbs: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Max Squat</label>
                <input 
                  type="number" value={formData.max_squat_lbs} placeholder="e.g. 315"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, max_squat_lbs: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Max Power Clean</label>
                <input 
                  type="number" value={formData.max_power_clean_lbs} placeholder="e.g. 275"
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, max_power_clean_lbs: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4 bg-black/40 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs text-zinc-500">
                💡 <strong className="text-cyan-400">Strength Ratios</strong> — These will auto-calculate based on your weight:
              </p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-center">
                <div>
                  <div className="text-xs text-zinc-600">Bench / BW</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {formData.weight_lbs && formData.max_bench_lbs
                      ? (parseFloat(formData.max_bench_lbs) / parseFloat(formData.weight_lbs)).toFixed(2) + 'x'
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Squat / BW</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {formData.weight_lbs && formData.max_squat_lbs
                      ? (parseFloat(formData.max_squat_lbs) / parseFloat(formData.weight_lbs)).toFixed(2) + 'x'
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600">Clean / BW</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {formData.weight_lbs && formData.max_power_clean_lbs
                      ? (parseFloat(formData.max_power_clean_lbs) / parseFloat(formData.weight_lbs)).toFixed(2) + 'x'
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === SECTION: Links === */}
          <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">🔗 Scouting Links</h2>
            <div>
              <label htmlFor="hudl_link" className="block text-xs font-bold text-zinc-500 uppercase mb-2">Hudl Highlight Link</label>
              <input 
                id="hudl_link"
                type="url" value={formData.hudl_link} placeholder="https://www.hudl.com..."
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] focus:outline-none transition-all"
                onChange={(e) => setFormData({...formData, hudl_link: e.target.value})}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div>
                <label htmlFor="maxpreps_link" className="block text-xs font-bold text-zinc-500 uppercase mb-2">MaxPreps Link</label>
                <input 
                  id="maxpreps_link"
                  type="url" value={formData.maxpreps_link}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, maxpreps_link: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="twitter_x_link" className="block text-xs font-bold text-zinc-500 uppercase mb-2">X (Twitter) Link</label>
                <input 
                  id="twitter_x_link"
                  type="url" value={formData.twitter_x_link}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
                  onChange={(e) => setFormData({...formData, twitter_x_link: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-xs font-bold text-zinc-500 uppercase mb-2">Short Bio</label>
            <textarea 
              id="bio"
              value={formData.bio} rows={4}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl focus:border-cyan-500 focus:outline-none transition-all"
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="submit" disabled={saving}
              className="flex-1 bg-cyan-600 text-black font-black py-4 rounded-xl hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            <button 
              type="button" onClick={() => router.push('/dashboard')}
              className="px-8 border border-zinc-800 font-bold rounded-xl hover:bg-zinc-800 transition-all text-sm uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
    </Layout>
  );
}
