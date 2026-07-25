'use client';
import { useState } from 'react';
import Link from 'next/link';
import NavDropdown from './NavDropdown';

interface UnauthenticatedNavProps {
  isLive?: boolean;
}

export default function UnauthenticatedNav({ isLive = false }: UnauthenticatedNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-black border-b border-zinc-800 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-black tracking-tighter text-cyan-500">
            IN THE GAME
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Home - no dropdown */}
            <Link href="/" className="text-zinc-400 hover:text-cyan-400 transition">Home</Link>

            {/* Calendar with dropdown */}
            <NavDropdown
              items={[
                { label: 'Show Calendar', href: '/shows', description: 'See upcoming shows, events, and stream schedules with DOC.', icon: '📅', gradient: 'bg-cyan-500/10' },
                { label: 'All Events', href: '/shows?view=all', description: 'Browse every show and event on the calendar.', icon: '🗓️', gradient: 'bg-blue-500/10' },
              ]}
            >
              <span className="text-zinc-400 hover:text-cyan-400 transition">Calendar</span>
            </NavDropdown>

            {/* The DOCket with dropdown */}
            <NavDropdown
              items={[
                { label: '📋 The DOCket', href: '/docket', description: 'DOC iT — Show Your Receipts. Verify your work with proof.', icon: '📋', gradient: 'bg-cyan-500/10' },
                { label: '🏆 Leaderboard', href: '/rankings', description: 'See how you stack up against athletes nationwide.', icon: '🏆', gradient: 'bg-yellow-500/10' },
                { label: 'Verified Stats', href: '/docket#stats', description: 'Track height, weight, 40yd, bench, squat & more.', icon: '📊', gradient: 'bg-green-500/10' },
                { label: '🏋️ Drill Library', href: '/drills', description: 'Training drills shared by coaches and athletes to level up your game.', icon: '🏋️', gradient: 'bg-amber-500/10' },
              ]}
            >
              <span className="text-cyan-400 hover:text-cyan-300 transition font-semibold">The DOCket</span>
            </NavDropdown>

            {/* News Stories with dropdown */}
            <NavDropdown
              items={[
                { label: 'News Stories', href: '/blog', description: 'Read the latest stories, interviews, and updates.', icon: '📰', gradient: 'bg-purple-500/10' },
                { label: 'Guest Request', href: '/request', description: 'Apply to be a guest on the show.', icon: '🎤', gradient: 'bg-pink-500/10' },
              ]}
            >
              <span className="text-zinc-400 hover:text-cyan-400 transition">News Stories</span>
            </NavDropdown>

            <Link href="/speedtest" className="text-zinc-400 hover:text-cyan-400 transition">Speed Test</Link>
            
            <Link href="/register" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-500 transition mr-2">
              Sign Up
            </Link>
            <Link href="/login" className="bg-cyan-600 text-black px-6 py-2 rounded-lg font-bold hover:bg-cyan-400 transition">
              Guest Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-zinc-400 hover:text-white focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-zinc-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                href="/" 
                className="block px-3 py-2 text-zinc-400 hover:text-cyan-400 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/shows" 
                className="block px-3 py-2 text-zinc-400 hover:text-cyan-400 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                Calendar
              </Link>
              <Link 
                href="/docket" 
                className="block px-3 py-2 text-cyan-400 hover:text-cyan-300 transition font-semibold"
                onClick={() => setIsMenuOpen(false)}
              >
                The DOCket
              </Link>
              <Link 
                href="/drills" 
                className="block px-3 py-2 text-amber-400 hover:text-amber-300 transition font-semibold"
                onClick={() => setIsMenuOpen(false)}
              >
                🏋️ Drill Library
              </Link>
              <Link 
                href="/contact" 
                className="block px-3 py-2 text-zinc-400 hover:text-cyan-400 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link 
                href="/blog" 
                className="block px-3 py-2 text-zinc-400 hover:text-cyan-400 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                News Stories
              </Link>
              
              <Link 
                href="/register" 
                className="block px-3 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition mb-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
              <Link 
                href="/login" 
                className="block px-3 py-2 bg-cyan-600 text-black font-bold rounded-lg hover:bg-cyan-400 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                Guest Login
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Live Badge Below Header */}
      <div className="flex justify-end px-4 sm:px-6 lg:px-8 py-2 border-t border-zinc-900">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isLive ? 'bg-red-900/20 border-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-zinc-800 border-zinc-700 opacity-50'}`}>
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500' : 'bg-zinc-500'}`}></span>
          <span className="text-white text-[10px] font-bold uppercase tracking-wider">{isLive ? 'On Air' : 'Offline'}</span>
        </div>
      </div>
    </nav>
  );
}
