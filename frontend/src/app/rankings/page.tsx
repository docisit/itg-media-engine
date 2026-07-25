'use client';
import Link from 'next/link';
import { useState } from 'react';

const SPORTS = ['All Sports', 'Football', 'Basketball', 'Baseball', 'Track & Field', 'Soccer', 'Wrestling'];
const STAT_CATEGORIES = [
  { id: 'bench', label: 'Max Bench', unit: 'lbs', icon: '🏋️', color: 'text-cyan-400' },
  { id: 'squat', label: 'Max Squat', unit: 'lbs', icon: '🦵', color: 'text-blue-400' },
  { id: 'clean', label: 'Power Clean', unit: 'lbs', icon: '💪', color: 'text-purple-400' },
  { id: 'forty', label: '40-Yard Dash', unit: 's', icon: '⚡', color: 'text-green-400' },
  { id: 'vertical', label: 'Vertical Jump', unit: '"', icon: '⬆️', color: 'text-yellow-400' },
  { id: 'shuttle', label: 'Shuttle Time', unit: 's', icon: '🔄', color: 'text-orange-400' },
];

const SAMPLE_ATHLETES: Record<string, { rank: number; name: string; val: string; state: string; school: string; sports: string[] }[]> = {
  bench: [
    { rank: 1, name: 'J. Williams', val: '405', state: 'TX', school: 'Duncanville HS', sports: ['Football', 'Track & Field'] },
    { rank: 2, name: 'M. Thompson', val: '385', state: 'FL', school: 'IMG Academy', sports: ['Football'] },
    { rank: 3, name: 'D. Johnson', val: '370', state: 'CA', school: 'Mater Dei', sports: ['Football', 'Basketball'] },
    { rank: 4, name: 'K. Anderson', val: '365', state: 'OH', school: 'St. Edward', sports: ['Football', 'Wrestling'] },
    { rank: 5, name: 'T. Brooks', val: '355', state: 'GA', school: 'Buford HS', sports: ['Football'] },
  ],
  forty: [
    { rank: 1, name: 'T. Harris', val: '4.32', state: 'GA', school: 'Mill Creek', sports: ['Football', 'Track & Field'] },
    { rank: 2, name: 'K. Brooks', val: '4.38', state: 'OH', school: 'Pickerington', sports: ['Football'] },
    { rank: 3, name: 'A. Martinez', val: '4.41', state: 'TX', school: 'North Shore', sports: ['Football', 'Baseball'] },
    { rank: 4, name: 'J. Carter', val: '4.43', state: 'FL', school: 'Miami Central', sports: ['Football', 'Track & Field'] },
    { rank: 5, name: 'D. Smith', val: '4.45', state: 'CA', school: 'Serra HS', sports: ['Football', 'Basketball'] },
  ],
  vertical: [
    { rank: 1, name: 'L. Davis', val: '42.0', state: 'NC', school: 'Hough HS', sports: ['Basketball', 'Track & Field'] },
    { rank: 2, name: 'C. Wilson', val: '40.0', state: 'FL', school: 'Dr. Phillips', sports: ['Basketball', 'Football'] },
    { rank: 3, name: 'R. Jones', val: '39.5', state: 'TX', school: 'Duncanville HS', sports: ['Basketball'] },
    { rank: 4, name: 'M. Brown', val: '38.0', state: 'CA', school: 'Centennial', sports: ['Volleyball', 'Basketball'] },
    { rank: 5, name: 'J. Taylor', val: '37.5', state: 'GA', school: 'McEachern', sports: ['Basketball', 'Football'] },
  ],
  squat: [
    { rank: 1, name: 'D. Johnson', val: '585', state: 'CA', school: 'Mater Dei', sports: ['Football'] },
    { rank: 2, name: 'M. Thompson', val: '560', state: 'FL', school: 'IMG Academy', sports: ['Football'] },
    { rank: 3, name: 'K. Anderson', val: '545', state: 'OH', school: 'St. Edward', sports: ['Football', 'Wrestling'] },
    { rank: 4, name: 'J. Williams', val: '525', state: 'TX', school: 'Duncanville HS', sports: ['Football', 'Track & Field'] },
    { rank: 5, name: 'T. Brooks', val: '515', state: 'GA', school: 'Buford HS', sports: ['Football'] },
  ],
  clean: [
    { rank: 1, name: 'M. Thompson', val: '345', state: 'FL', school: 'IMG Academy', sports: ['Football'] },
    { rank: 2, name: 'D. Johnson', val: '335', state: 'CA', school: 'Mater Dei', sports: ['Football', 'Basketball'] },
    { rank: 3, name: 'J. Williams', val: '320', state: 'TX', school: 'Duncanville HS', sports: ['Football', 'Track & Field'] },
    { rank: 4, name: 'K. Anderson', val: '310', state: 'OH', school: 'St. Edward', sports: ['Football', 'Wrestling'] },
    { rank: 5, name: 'T. Brooks', val: '305', state: 'GA', school: 'Buford HS', sports: ['Football'] },
  ],
  shuttle: [
    { rank: 1, name: 'T. Harris', val: '4.12', state: 'GA', school: 'Mill Creek', sports: ['Football', 'Track & Field'] },
    { rank: 2, name: 'K. Brooks', val: '4.22', state: 'OH', school: 'Pickerington', sports: ['Football'] },
    { rank: 3, name: 'A. Martinez', val: '4.28', state: 'TX', school: 'North Shore', sports: ['Football', 'Baseball'] },
    { rank: 4, name: 'J. Carter', val: '4.31', state: 'FL', school: 'Miami Central', sports: ['Football', 'Track & Field'] },
    { rank: 5, name: 'L. Davis', val: '4.35', state: 'NC', school: 'Hough HS', sports: ['Basketball', 'Track & Field'] },
  ],
};

export default function RankingsPage() {
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [selectedStat, setSelectedStat] = useState('bench');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20" />
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              The DOCket Leaderboard
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
              <span className="text-white">The</span>{' '}
              <span className="text-cyan-400">Rankings</span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-8">
              Filter by sport and stat. See who's really about it. All stats are <span className="text-cyan-400 font-semibold">video verified</span>.
            </p>
            
            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25"
              >
                Get on The Leaderboard
              </Link>
              <Link
                href="/docket"
                className="px-8 py-3 border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
              >
                About The DOCket
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-t border-zinc-800 bg-zinc-900/30 sticky top-0 z-40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sport Filter */}
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Sport</label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSport(sport)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedSport === sport
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stat Category Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {STAT_CATEGORIES.map((stat) => (
              <button
                key={stat.id}
                onClick={() => setSelectedStat(stat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedStat === stat.id
                    ? 'bg-zinc-800 text-white border border-zinc-600 shadow-lg'
                    : 'bg-black/50 text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-400'
                }`}
              >
                <span>{stat.icon}</span>
                <span>{stat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Display */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Current Stat Header */}
          {STAT_CATEGORIES.filter(s => s.id === selectedStat).map(stat => (
            <div key={stat.id} className="flex items-center gap-3 mb-8">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <h2 className="text-2xl font-black">{stat.label} Leaderboard</h2>
                <p className="text-zinc-500 text-sm">
                  Ranked by {stat.label.toLowerCase()} · {selectedSport} · Nationwide
                </p>
              </div>
            </div>
          ))}

          {/* Table */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Athlete</div>
              <div className="col-span-2">School</div>
              <div className="col-span-2">State</div>
              <div className="col-span-2">Sports</div>
              <div className="col-span-2 text-right">
                {STAT_CATEGORIES.filter(s => s.id === selectedStat)[0]?.unit === 's' ? 'Time' : 'Max'}
              </div>
            </div>

            {/* Rows */}
            {SAMPLE_ATHLETES[selectedStat]?.map((athlete, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center group"
              >
                {/* Rank */}
                <div className="col-span-1">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    athlete.rank === 1 ? 'bg-yellow-500 text-black' :
                    athlete.rank === 2 ? 'bg-zinc-400 text-black' :
                    athlete.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    #{athlete.rank}
                  </span>
                </div>

                {/* Name */}
                <div className="col-span-3 font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {athlete.name}
                </div>

                {/* School */}
                <div className="col-span-2 text-zinc-400 text-sm">
                  {athlete.school}
                </div>

                {/* State */}
                <div className="col-span-2">
                  <span className="px-2 py-1 bg-zinc-800 rounded-lg text-zinc-400 text-xs font-medium">
                    {athlete.state}
                  </span>
                </div>

                {/* Sports */}
                <div className="col-span-2 flex gap-1 flex-wrap">
                  {athlete.sports.map((sport, si) => (
                    <span key={si} className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-500 text-[10px]">
                      {sport}
                    </span>
                  ))}
                </div>

                {/* Value */}
                <div className="col-span-2 text-right">
                  <span className={`text-xl font-black ${
                    selectedStat === 'bench' || selectedStat === 'squat' || selectedStat === 'clean'
                      ? 'text-cyan-400'
                      : selectedStat === 'forty' || selectedStat === 'shuttle'
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}>
                    {athlete.val}
                    <span className="text-sm font-normal text-zinc-600 ml-1">
                      {STAT_CATEGORIES.filter(s => s.id === selectedStat)[0]?.unit}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-12 p-6 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-2xl max-w-3xl mx-auto text-center">
            <span className="text-2xl mb-3 block">🚀</span>
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Full Leaderboard Coming Soon</h3>
            <p className="text-zinc-400 text-sm">
              This is a preview with sample data. Once athletes start creating profiles and uploading verified stats,
              the real leaderboard will populate with live, filterable results. 
              <Link href="/register" className="text-cyan-400 hover:text-cyan-300 underline ml-1">Be the first to get on it</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-zinc-800 py-8 text-center">
        <p className="text-zinc-600 text-sm">
          <span className="text-cyan-400 font-bold">DOC</span>ket · Powered by{' '}
          <span className="text-zinc-400">I am iT</span> · #itisandiamit
        </p>
      </div>
    </div>
  );
}
