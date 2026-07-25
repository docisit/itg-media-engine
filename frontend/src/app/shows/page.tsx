'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface Show {
  id: number;
  title: string;
  guest?: string;
  image_url?: string | null;
  air_date: string;
  video_url?: string;
  is_live: boolean;
}

export default function ShowsCalendar() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        // Use the public shows endpoint that doesn't require authentication
        const response = await axios.get('/api/shows/public/');
        setShows(response.data);
      } catch (error) {
        console.error('Error fetching shows:', error);
        // Fallback to mock data if API fails
        setShows([
          {
            id: 1,
            title: "Building Championship Teams",
            guest: "Coach Michael Thompson",
            air_date: "2024-01-15T19:00:00Z",
            is_live: false
          },
          {
            id: 2,
            title: "COMING BACK FROM BIG INJURIES",
            guest: "TATE BEDFORD",
            air_date: "2026-02-20T18:30:00Z",
            is_live: false
          },
          {
            id: 3,
            title: "Digital Recruiting Strategies",
            guest: "A",
            air_date: "2024-01-25T20:00:00Z",
            is_live: false
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const upcomingShows = shows.filter(show => new Date(show.air_date) > new Date());
  const pastShows = shows.filter(show => new Date(show.air_date) <= new Date());

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500 text-xl font-black animate-pulse">LOADING SHOW CALENDAR...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-cyan-900 py-20 px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-4">SHOW CALENDAR</h1>
          <p className="text-xl text-cyan-300 max-w-3xl mx-auto">
            Upcoming broadcasts, past episodes, and exclusive content featuring coaches and athletes
          </p>
        </div>

        <div className="max-w-6xl mx-auto py-12 px-6">
        {/* Live Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-900/20 border border-red-600 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-400 font-bold uppercase text-sm">ON AIR: Streaming Live Now</span>
          </div>
        </div>

        {/* Upcoming Shows Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-8 text-center border-b border-cyan-500 pb-2 inline-block mx-auto">
            UPCOMING SHOWS
          </h2>
          
          {upcomingShows.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingShows.map((show) => (
                <div key={show.id} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 hover:border-cyan-500 transition-all">
                  {show.image_url && (
                    <div className="mb-4">
                      <img src={show.image_url} alt={show.title} className="w-full h-40 object-cover rounded-lg mb-3" />
                    </div>
                  )}
                  <div className="mb-4">
                    <span className="text-sm text-cyan-400 font-bold uppercase tracking-wider">
                      {formatDate(show.air_date)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3">{show.title}</h3>
                  
                  {show.guest && (
                    <p className="text-zinc-400 mb-4">Featuring: {show.guest}</p>
                  )}
                  
                  <div className="flex gap-3">
                    <button className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition">
                      Set Reminder
                    </button>
                    <Link href={`/shows/${show.id}`} className="border border-zinc-700 px-4 py-2 rounded-lg hover:border-cyan-500 transition">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400 text-lg">UPDATING PLEASE RETURN SOON!</p>
              <Link href="/request" className="inline-block mt-4 bg-cyan-600 text-black px-6 py-3 rounded-xl font-bold hover:bg-cyan-400 transition">
                Request to Be a Guest
              </Link>
            </div>
          )}
        </section>

        {/* Past Shows Section */}
        <section>
          <h2 className="text-3xl font-black mb-8 text-center border-b border-zinc-700 pb-2 inline-block mx-auto">
            PAST EPISODES
          </h2>
          
          {pastShows.length > 0 ? (
            <div className="space-y-6">
              {pastShows.slice(0, 5).map((show) => (
                <div key={show.id} className="bg-zinc-900/30 rounded-lg p-6 border border-zinc-800">
                  {show.image_url && (
                    <div className="mb-4">
                      <img src={show.image_url} alt={show.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{show.title}</h3>
                      <p className="text-zinc-400">{formatDate(show.air_date)}</p>
                      {show.guest && <p className="text-zinc-500">Guest: {show.guest}</p>}
                    </div>
                    
                    <div className="flex gap-3">
                      {show.video_url && (
                        <a 
                          href={show.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-500 transition"
                        >
                          Watch
                        </a>
                      )}
                      <Link href={`/shows/${show.id}`} className="border border-zinc-700 px-4 py-2 rounded-lg hover:border-cyan-500 transition">
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400 text-lg">No past shows available yet.</p>
            </div>
          )}

          {pastShows.length > 5 && (
            <div className="text-center mt-8">
              <button className="border border-zinc-700 px-6 py-3 rounded-xl hover:border-cyan-500 transition">
                Load More Episodes
              </button>
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-900 to-cyan-900 rounded-2xl p-8 mt-16 text-center">
          <h3 className="text-2xl font-black mb-4">Want to Be a Guest?</h3>
          <p className="text-cyan-200 mb-6 max-w-2xl mx-auto">
            Join DOC in the studio and share your coaching journey, athletic achievements, or technical insights.
          </p>
          <Link href="/request" className="bg-white text-black px-8 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition inline-block">
            SUBMIT GUEST REQUEST
          </Link>
        </section>
        </div>
      </div>
    </Layout>
  );
}