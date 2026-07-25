'use client';
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function DocketPage() {
  return (
    <Layout showFooter={true}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20" />
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            {/* Wordplay Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              DOC iT — Show Your Receipts
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
              <span className="text-white">THE</span>{' '}
              <span className="text-cyan-400">DOC</span>
              <span className="text-white">et</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-4 font-light">
              <span className="text-cyan-400 font-bold">DOC iT</span> — Show Your Receipts. Verify Your Work. Compete with Proof.
            </p>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-8">
              Your athletic résumé backed by verified video proof. Get highlighted by <span className="text-cyan-400 font-semibold">IN the GAME with DOC</span> and compete against the best.
            </p>

            {/* Tagline */}
            <p className="text-sm text-zinc-600 mb-12 tracking-wider uppercase">
              #itisandiamit · DOC iT · Show the Receipts
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-lg rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25"
              >
                Get on The DOCket
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/rankings"
                className="inline-flex items-center gap-2 px-8 py-4 border border-zinc-700 text-zinc-300 font-bold text-lg rounded-xl hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
              >
                View the Leaderboard
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </Link>
            </div>

            {/* Parent Callout */}
            <div className="mt-12 p-6 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-2xl max-w-2xl mx-auto">
              <div className="flex items-start gap-4">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <div className="text-left">
                  <p className="text-yellow-400 font-bold text-lg mb-1">Parents — Get Your Athlete on The DOCket</p>
                  <p className="text-zinc-400 text-sm">
                    College coaches are searching for verified talent right now. Help your athlete stand out with verified stats, 
                    video proof, and a professional recruiting profile. <Link href="/register" className="text-cyan-400 hover:text-cyan-300 underline">Sign them up today</Link>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is The DOCket */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">What is The DOCket?</h2>
            <p className="text-zinc-400 text-lg max-w-3xl mx-auto">
              The DOCket is your verified athletic résumé — a living record of your stats, your progress, and your proof. 
              No more "trust me bro." Show the receipts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-cyan-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Verified Stats</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Upload video proof for every stat — your 40-yard dash, max bench, vertical jump, and more. 
                Each stat gets a <span className="text-cyan-400 font-semibold">verified badge</span> once approved.
              </p>
            </div>

            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-cyan-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track Your Progress</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Every time you set a new PR, your profile updates with an <span className="text-green-400 font-semibold">up arrow badge</span>. 
                Watch yourself climb the leaderboards as you get stronger, faster, and better.
              </p>
            </div>

            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-cyan-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coach-Ready Profile</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your own recruiting hub — height, weight, stats, sports, video highlights, and verified badges. 
                Everything a college coach needs in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-zinc-900/50 to-black border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">How It Works</h2>
            <p className="text-zinc-400 text-lg">Three steps to get on The DOCket and start building your verified athletic profile.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/40 to-cyan-500/20" />

            {[
              {
                step: '01',
                title: 'Create Your Profile',
                desc: 'Sign up and build your athlete profile. Add your sports, your stats, and your basic info. It takes 2 minutes.',
                color: 'from-cyan-500 to-blue-600',
                link: '/register',
                linkText: 'Sign Up Free →'
              },
              {
                step: '02',
                title: 'Upload Verified Video Proof',
                desc: 'Record and upload video proof for each stat. We verify the footage and award verified badges. Client-side compression keeps uploads fast.',
                color: 'from-blue-500 to-purple-600',
                link: '#',
                linkText: 'See How Verification Works →'
              },
              {
                step: '03',
                title: 'Get Discovered by Coaches',
                desc: 'Your profile is live on the leaderboard. College coaches filter by sport, state, and stats to find athletes like you.',
                color: 'from-purple-500 to-cyan-500',
                link: '/rankings',
                linkText: 'View the Leaderboard →'
              }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-black font-black text-xl mb-6 shadow-lg`}>
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">{item.desc}</p>
                <Link href={item.link} className="mt-auto text-cyan-400 hover:text-cyan-300 font-semibold text-sm transition-colors">
                  {item.linkText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Categories */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Stats That Matter to Coaches</h2>
            <p className="text-zinc-400 text-lg">Every number on The DOCket is backed by video proof. No filler. No exaggeration.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Height / Weight', icon: '📏', desc: 'Verified measurements' },
              { label: 'Vertical Jump', icon: '⬆️', desc: 'Inches, video verified' },
              { label: '40-Yard Dash', icon: '⚡', desc: 'Electronic timing' },
              { label: 'Max Bench', icon: '🏋️', desc: 'One-rep max, verified' },
              { label: 'Max Squat', icon: '🦵', desc: 'Depth-checked' },
              { label: 'Power Clean', icon: '💪', desc: 'Explosiveness metric' },
              { label: 'Shuttle Time', icon: '🔄', desc: 'Agility measured' },
              { label: 'GPA', icon: '📚', desc: 'Academic eligibility' },
              { label: 'Sport', icon: '🏈', desc: 'Multi-sport athletes' },
              { label: 'State', icon: '🗺️', desc: 'Location matters' },
            ].map((stat, i) => (
              <div key={i} className="p-5 bg-zinc-900/30 rounded-xl border border-zinc-800 hover:border-cyan-500/30 transition-all duration-300 text-center group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{stat.icon}</div>
                <div className="font-bold text-sm text-white mb-1">{stat.label}</div>
                <div className="text-xs text-zinc-500">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-20 bg-gradient-to-b from-black to-zinc-900/50 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">The Leaderboard</h2>
              <p className="text-zinc-400 text-lg">See how you stack up. Filter by sport, stat, and state.</p>
            </div>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
            >
              View Full Leaderboard
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Bench Press Leaderboard */}
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🏋️</span>
                <h3 className="font-bold text-lg">Max Bench</h3>
              </div>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'J. Williams', val: '405 lbs', state: 'TX' },
                  { rank: 2, name: 'M. Thompson', val: '385 lbs', state: 'FL' },
                  { rank: 3, name: 'D. Johnson', val: '370 lbs', state: 'CA' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-black/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        a.rank === 1 ? 'bg-yellow-500 text-black' :
                        a.rank === 2 ? 'bg-zinc-400 text-black' :
                        'bg-amber-700 text-white'
                      }`}>#{a.rank}</span>
                      <div>
                        <span className="text-white font-semibold text-sm">{a.name}</span>
                        <span className="text-zinc-500 text-xs ml-2">{a.state}</span>
                      </div>
                    </div>
                    <span className="text-cyan-400 font-bold text-sm">{a.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 40-Yard Dash */}
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚡</span>
                <h3 className="font-bold text-lg">40-Yard Dash</h3>
              </div>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'T. Harris', val: '4.32s', state: 'GA' },
                  { rank: 2, name: 'K. Brooks', val: '4.38s', state: 'OH' },
                  { rank: 3, name: 'A. Martinez', val: '4.41s', state: 'TX' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-black/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        a.rank === 1 ? 'bg-yellow-500 text-black' :
                        a.rank === 2 ? 'bg-zinc-400 text-black' :
                        'bg-amber-700 text-white'
                      }`}>#{a.rank}</span>
                      <div>
                        <span className="text-white font-semibold text-sm">{a.name}</span>
                        <span className="text-zinc-500 text-xs ml-2">{a.state}</span>
                      </div>
                    </div>
                    <span className="text-green-400 font-bold text-sm">{a.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical Jump */}
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⬆️</span>
                <h3 className="font-bold text-lg">Vertical Jump</h3>
              </div>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'L. Davis', val: '42"', state: 'NC' },
                  { rank: 2, name: 'C. Wilson', val: '40"', state: 'FL' },
                  { rank: 3, name: 'R. Jones', val: '39.5"', state: 'TX' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-black/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        a.rank === 1 ? 'bg-yellow-500 text-black' :
                        a.rank === 2 ? 'bg-zinc-400 text-black' :
                        'bg-amber-700 text-white'
                      }`}>#{a.rank}</span>
                      <div>
                        <span className="text-white font-semibold text-sm">{a.name}</span>
                        <span className="text-zinc-500 text-xs ml-2">{a.state}</span>
                      </div>
                    </div>
                    <span className="text-purple-400 font-bold text-sm">{a.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Sport Athletes */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Multi-Sport? <span className="text-cyan-400">Even Better.</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                College coaches love multi-sport athletes. The DOCket lets you add every sport you play — 
                football, basketball, track, baseball, soccer, wrestling. Your profile shows all of them.
              </p>
              <ul className="space-y-3">
                {[
                  'One profile for all your sports',
                  'Separate stats per sport',
                  'Coaches see your athletic versatility',
                  'State & national leaderboards for each sport'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-1/2">
              <div className="p-8 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-3xl border border-cyan-500/20">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-2xl font-bold mb-2">Sport Versatility Score</h3>
                  <p className="text-zinc-400 text-sm mb-6">Coming soon — a proprietary metric showing athletic versatility across sports</p>
                  <div className="flex justify-center gap-4 text-3xl">
                    <span>🏈</span>
                    <span>🏀</span>
                    <span>⚾</span>
                    <span>⚽</span>
                    <span>🎯</span>
                    <span>🤼</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-20 bg-gradient-to-r from-cyan-900/20 via-blue-900/20 to-black border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            Ready to Show Your <span className="text-cyan-400">Receipts</span>?
          </h2>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            Join The DOCket. Upload your proof. Get discovered by college coaches.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-lg rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/25"
            >
              Create Your Profile
            </Link>
            <Link
              href="/rankings"
              className="px-10 py-4 border border-zinc-700 text-zinc-300 font-bold text-lg rounded-xl hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
            >
              Browse Leaderboard
            </Link>
          </div>
          <p className="mt-8 text-zinc-500 text-sm">
            Parents: <Link href="/register" className="text-cyan-400 hover:text-cyan-300 underline">Create an account for your athlete</Link> and manage their verified profile.
          </p>
        </div>
      </section>

    </Layout>
  );
}
