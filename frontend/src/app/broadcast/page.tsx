'use client';

import Layout from '@/components/Layout';
import LiveKitBroadcastPlayer from './LiveKitBroadcastPlayer';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function BroadcastPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const user = session?.user as { is_staff?: boolean } | undefined;
  const isStaff = user?.is_staff === true;
  const showJoinButton = isLoggedIn && !isStaff;
  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-cyan-900 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2">LIVE BROADCAST</h1>
                <p className="text-cyan-300 text-lg">Watch live with ultra-low latency WebRTC</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-bold text-sm">LIVE STREAM</span>
                  </div>
                  <span className="text-zinc-400 text-sm">•</span>
                  <span className="text-zinc-400 text-sm">Watch, follow, and share the stream</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Link 
                  href="/"
                  className="border border-zinc-700 text-white px-6 py-3 rounded-lg font-bold hover:border-cyan-500 hover:text-cyan-400 transition"
                >
                  ← Back to Home
                </Link>
                <Link
                  href="/director-control"
                  className="bg-cyan-600 text-black px-6 py-3 rounded-lg font-bold hover:bg-cyan-500 transition"
                >
                  Director Control
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-8 px-6">
          {/* Live Stream — Powered by LiveKit */}
          <div className="mb-8">
            <LiveKitBroadcastPlayer />
          </div>

          {/* Additional Information */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Schedule Info */}
            <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-xl font-bold mb-4 text-white">📅 Broadcast Schedule</h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center">
                  <span className="text-zinc-400">Regular Shows:</span>
                  <span className="text-cyan-400 font-bold">Tue & Thu 7PM CT</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-zinc-400">Special Events:</span>
                  <span className="text-purple-400 font-bold">As Announced</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-zinc-400">Guest Interviews:</span>
                  <span className="text-green-400 font-bold">Weekly</span>
                </li>
              </ul>
              <Link 
                href="/shows"
                className="inline-block mt-6 w-full text-center border border-zinc-700 text-white px-4 py-2 rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition"
              >
                View Full Calendar →
              </Link>
            </div>

            {/* Chat & Community */}
            <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-xl font-bold mb-4 text-white">💬 Join the Conversation</h3>
              <p className="text-zinc-400 mb-4">
                Chat with other viewers, ask questions, and engage with the community during live broadcasts.
              </p>
              <div className="space-y-3">
                {showJoinButton && (
                  <Link 
                    href="/guest-room/Broadcast_Studio_A1"
                    className="flex items-center justify-center gap-2 w-full text-center bg-green-600 hover:bg-green-500 text-white px-4 py-4 rounded-lg font-bold transition animate-pulse"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    🎙️ Join the Show!
                  </Link>
                )}
                <Link 
                  href="/guest-room/Broadcast_Studio_A1"
                  className="block w-full text-center bg-purple-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-purple-500 transition"
                >
                  Open Viewer Chat
                </Link>
                {!session && (
                  <Link
                    href="/login"
                    className="block w-full text-center border border-cyan-700 text-cyan-400 px-4 py-3 rounded-lg font-bold hover:border-cyan-500 hover:text-cyan-300 transition"
                  >
                    Sign in to Join the Show
                  </Link>
                )}
              </div>
            </div>

            {/* Technical Info */}
            <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-xl font-bold mb-4 text-white">🔧 Technical Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Stream Quality:</span>
                  <span className="text-green-400 font-bold">1080p HD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Latency:</span>
                  <span className="text-cyan-400 font-bold">~200ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Platform:</span>
                  <span className="text-amber-400 font-bold">LiveKit WebRTC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Status:</span>
                  <span className="text-green-400 font-bold">Operational ✓</span>
                </div>
              </div>
              <Link 
                href="/speedtest"
                className="inline-block mt-6 w-full text-center border border-amber-700 text-amber-400 px-4 py-2 rounded-lg hover:border-amber-500 hover:text-amber-300 transition"
              >
                Run Speed Test →
              </Link>
            </div>
          </div>

          {/* Guest Information */}
          <div className="mt-12 bg-gradient-to-r from-blue-900 to-cyan-900 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-2xl font-black mb-2">Want to Be a Guest?</h3>
                <p className="text-cyan-200">
                  Coaches, athletes, and industry professionals - join DOC live on air!
                </p>
              </div>
              <Link 
                href="/request"
                className="bg-white text-black px-8 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition"
              >
                APPLY AS GUEST
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-900 bg-black py-8 px-6 text-center">
          <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">
            © 2026 Donnie DOC OConnor Media • Professional Live Broadcasting
          </p>
          <p className="text-zinc-700 text-xs mt-2">
            Streaming from Broadcast Studio A1 • Powered by LiveKit WebRTC
          </p>
        </footer>
      </div>
    </Layout>
  );
}
