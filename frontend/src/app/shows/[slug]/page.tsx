import Link from 'next/link';
import Layout from '@/components/Layout';
import ReminderButton from '@/components/ReminderButton';

interface Show {
  id: number;
  title: string;
  guest_name: string;
  image_url?: string | null;
  air_date: string;
  video_url?: string;
  transcript?: string;
  questions_asked?: string;
  is_live: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function ShowDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let show: Show | null = null;

  // 1. Fetch from Django
  if (slug) {
    try {
      const url = `${API_BASE}/api/shows/${slug}/`;
      const res = await fetch(url, { cache: 'no-store' });
      
      if (res.ok) {
        show = await res.json();
      }
    } catch (err) {
      console.error(`[ShowDetail] Fetch error:`, err);
    }
  }

  // 2. If no show is found in the database, show the Error UI
  // (We removed the Coach Wolff mock so we can debug the real API)
  if (!show) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black mb-4 text-red-500">Show Not Found</h1>
            <p className="text-zinc-400 mb-6">Database record for ID "{slug}" could not be retrieved.</p>
            <Link href="/shows" className="text-cyan-500 hover:text-cyan-400 transition">
              ← Back to Shows
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 py-20 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <Link href="/shows" className="inline-block text-cyan-300 hover:text-white transition mb-6">
              ← Back to Shows
            </Link>

            {show.is_live && (
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-900/20 border border-red-600 animate-pulse">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-400 font-bold uppercase text-sm">LIVE NOW</span>
                </div>
              </div>
            )}

            {show.image_url && (
              <div className="mb-6 flex justify-center">
                <img src={show.image_url} alt={show.title} className="w-48 h-48 object-cover rounded-full border-4 border-zinc-800" />
              </div>
            )}

            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{show.title}</h1>
            <p className="text-xl text-cyan-300 mb-2">{formatDate(show.air_date)}</p>
            {show.guest_name && <p className="text-lg text-zinc-300">Featuring: {show.guest_name}</p>}
          </div>
        </div>

        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              {show.video_url ? (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 border-b border-cyan-500 pb-2 inline-block">Watch the Show</h2>
                  <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                    <a
                      href={show.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-500 transition"
                    >
                      Watch on YouTube →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-6 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-center">
                  Video link will be available after the broadcast.
                </div>
              )}

              {show.transcript && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 border-b border-cyan-500 pb-2 inline-block">Transcript</h2>
                  <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{show.transcript}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar with Admin Edit functionality */}
            <div>
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 sticky top-6">
                <h3 className="text-xl font-bold mb-4">Show Details</h3>

                <div className="space-y-4">
                  <div>
                    <span className="text-zinc-500 text-sm">Air Date</span>
                    <p className="text-white">{formatDate(show.air_date)}</p>
                  </div>

                  <div>
                    <span className="text-zinc-500 text-sm">Status</span>
                    <p className={show.is_live ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                      {show.is_live ? 'Live Now' : 'Completed'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {/* ADMIN EDIT BUTTON */}
                  <Link 
                    href={`/admin/dashboard/edit-show/${show.id}`} 
                    className="w-full bg-yellow-500 text-black text-center py-3 rounded-lg font-bold hover:bg-yellow-400 transition block shadow-lg"
                  >
                    ✎ Edit Show Info
                  </Link>

                  <ReminderButton />

                  <Link href="/request" className="w-full bg-cyan-600 text-black text-center py-3 rounded-lg font-bold hover:bg-cyan-400 transition block">
                    Be a Guest
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