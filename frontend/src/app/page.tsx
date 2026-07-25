'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Layout from '@/components/Layout';
import SiteChatAssistant from '@/components/SiteChatAssistant';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface NavigationCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  gradient: string;
}

interface FeaturedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  author_name: string;
  author_role: string;
  featured_image_url: string | null;
  category: string;
  tags_list: string[];
  published_at: string;
  comment_count: number;
  reading_time: number;
}

interface StreamStats {
  latency: string;
  uptime: string;
  quality: string;
  security: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  profile_image: string | null;
  school_name: string;
  state: string;
  position: string;
  value: number;
}

// ═══════════════════════════════════════════════════════════════
// PAGE LOADER COMPONENT
// ═══════════════════════════════════════════════════════════════

const PageLoader = () => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('ready'), 300);
          return 100;
        }
        const increment = prev < 40 ? 8 : prev < 70 ? 5 : prev < 90 ? 3 : 1.5;
        return Math.min(prev + increment, 100);
      });
    }, 120);

    const timeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setPhase('ready'), 300);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (phase === 'ready') return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)]"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }}></div>

      <div className="relative z-10 text-center">
        <div className="mb-8 relative">
          <div className="text-6xl mb-4 animate-pulse">🎙️</div>
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-2xl animate-pulse"></div>
        </div>

        <h1 className="text-4xl font-black tracking-tighter mb-2">
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            IN the GAME
          </span>
        </h1>
        <p className="text-zinc-500 text-sm mb-8 tracking-widest uppercase">Loading Broadcast Platform...</p>

        <div className="w-64 mx-auto relative">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-600">
            <span>Connecting</span>
            <span>{Math.round(progress)}%</span>
            <span>Ready</span>
          </div>
        </div>

        <div className="flex justify-center gap-1 mt-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// NAVIGATION CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

const NavigationCard = ({ title, description, href, icon, gradient }: NavigationCardProps) => (
  <Link href={href} className="block group">
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] cursor-pointer h-full`}>
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  </Link>
);

// ═══════════════════════════════════════════════════════════════
// MINI LEADERBOARD COMPONENT — Shows top 3 of any stat
// ═══════════════════════════════════════════════════════════════

const STAT_DISPLAY: Record<string, { label: string; unit: string }> = {
  vertical_jump: { label: 'Vertical Jump', unit: 'in' },
  max_bench: { label: 'Max Bench', unit: 'lbs' },
  forty_yard: { label: '40-Yard Dash', unit: 's' },
};

const MiniLeaderboard = ({ stat, data }: { stat: string; data: LeaderboardEntry[] }) => {
  const info = STAT_DISPLAY[stat] || { label: stat, unit: '' };
  return (
    <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold">{info.label}</h4>
        <span className="text-xs text-zinc-500">{info.unit}</span>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-4">No entries yet</p>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 3).map((entry) => (
            <Link
              key={`${stat}-${entry.rank}`}
              href={`/profiles/${entry.username}`}
              className="flex items-center justify-between text-xs hover:bg-zinc-800/50 rounded-lg px-2 py-1.5 transition group"
            >
              <div className="flex items-center gap-2">
                <span className={`font-black ${
                  entry.rank === 1 ? 'text-yellow-400' :
                  entry.rank === 2 ? 'text-zinc-300' :
                  'text-amber-600'
                }`}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                </span>
                <span className="text-zinc-300 group-hover:text-cyan-400 transition">{entry.username}</span>
                {entry.state && <span className="text-zinc-600">{entry.state}</span>}
              </div>
              <span className="font-bold text-emerald-400">
                {entry.value % 1 === 0 ? entry.value : entry.value.toFixed(2)}{info.unit ? ` ${info.unit}` : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function HomePage() {
  const [featuredPost, setFeaturedPost] = useState<FeaturedPost | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('broadcast');
  const [streamStats] = useState<StreamStats>({
    latency: '<500ms',
    uptime: '99.9%',
    quality: '4K',
    security: 'A+'
  });

  // Leaderboard data
  const [verticalData, setVerticalData] = useState<LeaderboardEntry[]>([]);
  const [benchData, setBenchData] = useState<LeaderboardEntry[]>([]);
  const [fortyData, setFortyData] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchFeaturedPost();
    fetchLeaderboards();
    const timer = setTimeout(() => setPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const [vertical, bench, forty] = await Promise.all([
        axios.get(`${API_BASE}/api/leaderboard/vertical_jump/?limit=3`),
        axios.get(`${API_BASE}/api/leaderboard/max_bench/?limit=3`),
        axios.get(`${API_BASE}/api/leaderboard/forty_yard/?limit=3`),
      ]);
      setVerticalData(vertical.data.leaderboard || []);
      setBenchData(bench.data.leaderboard || []);
      setFortyData(forty.data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
    } finally {
      setLoadingLB(false);
    }
  };

  const fetchFeaturedPost = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/blog/featured/`);
      setFeaturedPost(response.data);
    } catch (error) {
      console.error('Error fetching featured post:', error);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION CARDS DATA
  // ═══════════════════════════════════════════════════════════════

  const navigationCards: NavigationCardProps[] = [
    {
      title: "Live Broadcast",
      description: "Watch live shows, join chat, and follow the stream in real-time with ultra-low latency",
      href: "/broadcast",
      icon: "📡",
      gradient: "from-purple-900/30 to-violet-900/30 border-purple-500/50"
    },
    {
      title: "🥇 Elite Leaderboard",
      description: "NEW — See top athletes ranked by vertical jump, 40-yard dash, bench press, strength ratios, GPA, and more. Filter by sport & state!",
      href: "/leaderboard",
      icon: "🏆",
      gradient: "from-emerald-900/30 to-green-900/30 border-emerald-500/50"
    },
    {
      title: "Show Calendar",
      description: "Upcoming broadcasts and past episodes featuring top coaches and athletes",
      href: "/shows",
      icon: "📺",
      gradient: "from-cyan-900/30 to-blue-900/30 border-cyan-500/50"
    },
    {
      title: "Guest Portal",
      description: "Member login to access your profile, broadcast links, and exclusive content",
      href: "/login",
      icon: "🎙️",
      gradient: "from-green-900/30 to-emerald-900/30 border-green-500/50"
    },
    {
      title: "Guest Request",
      description: "Apply to be a guest on the show and share your athletic journey with the world",
      href: "/request",
      icon: "🌟",
      gradient: "from-yellow-900/30 to-amber-900/30 border-yellow-500/50"
    },
    {
      title: "Contact DOC",
      description: "Get in touch for collaborations, media inquiries, or technical support",
      href: "/contact",
      icon: "📧",
      gradient: "from-blue-900/30 to-indigo-900/30 border-blue-500/50"
    },
    {
      title: "🏋️ Drill Library",
      description: "Training drills shared by coaches and athletes. Level up your game with sport-specific workouts and skills development.",
      href: "/drills",
      icon: "🏋️",
      gradient: "from-amber-900/30 to-orange-900/30 border-amber-500/50"
    },
    {
      title: "Our Technology",
      description: "LiveKit-powered WebRTC infrastructure for professional-grade broadcasting",
      href: "/tech",
      icon: "🔧",
      gradient: "from-orange-900/30 to-red-900/30 border-orange-500/50"
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // TECH SHOWCASE GRID DATA
  // ═══════════════════════════════════════════════════════════════

  const techFeatures = [
    {
      title: "LiveKit WebRTC",
      description: "Enterprise-grade real-time video infrastructure powering every broadcast",
      icon: "🎥",
      gradient: "from-purple-900/40 to-violet-900/40 border-purple-500/60"
    },
    {
      title: "TrackEgress System",
      description: "Direct multi-platform streaming to YouTube, Facebook, TikTok, and our in-app LiveKit WebRTC player",
      icon: "📡",
      gradient: "from-cyan-900/40 to-blue-900/40 border-cyan-500/60"
    },
    {
      title: "RTMP/WHIP Ingress",
      description: "Professional OBS Studio integration with auto-reconnect and health monitoring",
      icon: "⚡",
      gradient: "from-green-900/40 to-emerald-900/40 border-green-500/60"
    },
    {
      title: "Next.js 16 + React 19",
      description: "Cutting-edge frontend with Turbopack, Server Components, and instant hot reloads",
      icon: "⚛️",
      gradient: "from-blue-900/40 to-cyan-900/40 border-blue-500/60"
    },
    {
      title: "Django REST API",
      description: "High-performance Python backend with JWT auth, WebSockets, and real-time data",
      icon: "🐍",
      gradient: "from-emerald-900/40 to-green-900/40 border-emerald-500/60"
    },
    {
      title: "Ubuntu Bare Metal",
      description: "Containerized deployment on dedicated infrastructure with Nginx, Redis, and PostgreSQL",
      icon: "🐳",
      gradient: "from-orange-900/40 to-red-900/40 border-orange-500/60"
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE HIGHLIGHT DATA
  // ═══════════════════════════════════════════════════════════════

  const performanceMetrics = [
    { label: "Stream Latency", value: streamStats.latency, gradient: "from-cyan-900/30 to-blue-900/30 border-cyan-500/50", color: "text-cyan-400" },
    { label: "Uptime SLA", value: streamStats.uptime, gradient: "from-green-900/30 to-emerald-900/30 border-green-500/50", color: "text-green-400" },
    { label: "Video Quality", value: "4K", gradient: "from-purple-900/30 to-violet-900/30 border-purple-500/50", color: "text-purple-400" },
    { label: "SSL Security", value: "A+", gradient: "from-blue-900/30 to-indigo-900/30 border-blue-500/50", color: "text-blue-400" },
  ];

  // ═══════════════════════════════════════════════════════════════
  // TABS DATA
  // ═══════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'broadcast', label: 'Live Broadcast', icon: '📡' },
    { id: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
    { id: 'athletes', label: 'Athlete Hub', icon: '🏀' },
    { id: 'media', label: 'Media Center', icon: '🎬' },
  ];

  const tabContent: Record<string, { title: string; description: string; actions: { label: string; href: string; variant: 'primary' | 'secondary' }[] }> = {
    broadcast: {
      title: "Professional Live Broadcasting",
      description: "Powered by LiveKit WebRTC — watch live shows with ultra-low latency, real-time chat, and multi-platform streaming to YouTube, Facebook, and more.",
      actions: [
        { label: "WATCH LIVE", href: "/broadcast", variant: "primary" },
        { label: "OUR TECHNOLOGY", href: "/tech", variant: "secondary" },
      ]
    },
    leaderboard: {
      title: "🏆 Elite Athlete Leaderboard",
      description: "See who's top in vertical jump, 40-yard dash, max bench, squat, power clean, shuttle time, GPA, and strength-to-weight ratios. Filter by sport and state to find elite talent near you. Shareable rankings with 🥇🥈🥉 medals.",
      actions: [
        { label: "VIEW FULL LEADERBOARD", href: "/leaderboard", variant: "primary" },
        { label: "ENTER YOUR STATS", href: "/profile/edit", variant: "secondary" },
      ]
    },
    athletes: {
      title: "Athlete & Coach Showcase",
      description: "Explore profiles of featured athletes and coaches. View highlights, read their stories, and see who's coming up next on IN the GAME with DOC.",
      actions: [
        { label: "VIEW PROFILES", href: "/profiles", variant: "primary" },
        { label: "BECOME A GUEST", href: "/request", variant: "secondary" },
      ]
    },
    media: {
      title: "Media & Highlights",
      description: "Game footage, interviews, and exclusive content from our featured athletes and coaches. Watch the best moments from the DOC Show.",
      actions: [
        { label: "WATCH HIGHLIGHTS", href: "/media", variant: "primary" },
        { label: "NEWS STORIES", href: "/blog", variant: "secondary" },
      ]
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      {pageLoading && <PageLoader />}

      <Layout>
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">

          {/* ═══════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════ */}
          <section className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-cyan-900 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.15),rgba(255,255,255,0))] opacity-60"></div>
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px)`,
              backgroundSize: '80px 80px'
            }}></div>
            
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10 pt-24 pb-32 px-6">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <span className="bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-cyan-500/50 text-cyan-400 text-xs font-bold tracking-wider">
                    🎥 LiveKit WebRTC
                  </span>
                  <span className="bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-emerald-500/50 text-emerald-400 text-xs font-bold tracking-wider">
                    🏆 New: Athlete Rankings
                  </span>
                  <span className="bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-green-500/50 text-green-400 text-xs font-bold tracking-wider">
                    ⚡ 4K Streaming
                  </span>
                </div>

                <h2 className="text-cyan-400 font-bold tracking-[0.2em] uppercase mb-4 text-sm">Hello, I AM DOC.</h2>
                <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
                  Host of{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                    IN the GAME
                  </span>
                </h1>
                <p className="text-lg text-zinc-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                  Professional live production platform powered by <span className="text-cyan-400 font-bold">LiveKit WebRTC</span> — 
                  streaming coaches, athletes, and their journeys with enterprise-grade broadcasting technology.
                </p>
                
                <div className="flex flex-col md:flex-row justify-center gap-6">
                  <Link
                    href="/broadcast"
                    className="group bg-white text-black px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] inline-flex items-center gap-2"
                  >
                    📺 WATCH LIVE
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link
                    href="/request"
                    className="group border-2 border-cyan-400 text-cyan-400 px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 hover:text-black transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                  >
                    🎤 BECOME A GUEST
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="group border-2 border-emerald-400 text-emerald-400 px-10 py-4 rounded-xl font-black text-lg hover:bg-emerald-400 hover:text-black transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                  >
                    🏆 LEADERBOARD
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-10">
                  {['LiveKit', 'WebRTC', 'TrackEgress', 'RTMP', 'WHIP', 'Next.js 16'].map(tech => (
                    <span key={tech} className="text-xs text-zinc-600 bg-black/20 px-2.5 py-1 rounded-full border border-zinc-800 font-mono">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent"></div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          FEATURED NEWS STORY — Moved right after Hero
          ═══════════════════════════════════════════════════════ */}
          {!loadingFeatured && featuredPost && (
            <section className="py-16 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                  <h2 className="text-3xl font-black text-center">
                    <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      📰 Latest News Story
                    </span>
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                </div>

                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="group block relative overflow-hidden rounded-3xl border border-zinc-800 hover:border-purple-500/50 transition-all duration-500"
                >
                  <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative md:flex items-stretch">
                      <div className="md:w-1/2 relative overflow-hidden min-h-[280px]">
                        {featuredPost.featured_image_url ? (
                          <img
                            src={featuredPost.featured_image_url}
                            alt={featuredPost.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
                            <div className="text-8xl opacity-20">📰</div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/40 md:to-transparent"></div>
                        
                        {featuredPost.category && (
                          <div className="absolute top-4 left-4 z-10">
                            <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                              {featuredPost.category}
                            </span>
                          </div>
                        )}
                        
                        <div className="absolute bottom-4 left-4 right-4 md:hidden z-10">
                          <h3 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
                            {featuredPost.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-zinc-300">
                            <span>{formatDate(featuredPost.published_at)}</span>
                            <span>•</span>
                            <span>{featuredPost.reading_time} min read</span>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
                        <div className="hidden md:block">
                          <h3 className="text-3xl md:text-4xl font-black text-white mb-4 group-hover:text-purple-400 transition-colors duration-300 leading-tight">
                            {featuredPost.title}
                          </h3>
                        </div>

                        <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-6 line-clamp-3">
                          {featuredPost.excerpt || 'Click to read the full story...'}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-600 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                              {featuredPost.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{featuredPost.author_name}</p>
                              <p className="text-xs text-zinc-500 capitalize">{featuredPost.author_role}</p>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {featuredPost.comment_count}
                            </span>
                            <span>{formatDate(featuredPost.published_at)}</span>
                          </div>
                        </div>

                        {featuredPost.tags_list && featuredPost.tags_list.length > 0 && (
                          <div className="flex gap-2 mt-5 flex-wrap">
                            {featuredPost.tags_list.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs text-zinc-600 bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-700/50">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-6">
                          <span className="inline-flex items-center gap-2 text-purple-400 font-bold text-sm group-hover:gap-3 transition-all duration-300">
                            Read Full Story
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="text-center mt-6">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-purple-400 transition text-sm"
                  >
                    View All News Stories
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
          PERFORMANCE METRICS BAR
          ═══════════════════════════════════════════════════════ */}
          <section className="py-12 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${metric.gradient} rounded-xl p-5 text-center border-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]`}
                >
                  <div className={`text-3xl font-black ${metric.color} mb-1`}>{metric.value}</div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider">{metric.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          🏆 LEADERBOARD SPOTLIGHT — Prominent homepage promotion
          ═══════════════════════════════════════════════════════ */}
          <section className="py-16 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                <h2 className="text-3xl font-black text-center">
                  <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    🏆 Elite Athlete Rankings
                  </span>
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
              </div>
              <p className="text-zinc-500 text-center mb-10 max-w-2xl mx-auto">
                See who's dominating across every stat. College coaches are watching. 
                <span className="text-emerald-400 font-bold"> Enter your stats</span> to get ranked.
              </p>

              {loadingLB ? (
                <div className="text-center py-8">
                  <div className="text-4xl animate-bounce mb-4">🏆</div>
                  <p className="text-zinc-500 animate-pulse">Loading rankings...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <MiniLeaderboard stat="vertical_jump" data={verticalData} />
                  <MiniLeaderboard stat="max_bench" data={benchData} />
                  <MiniLeaderboard stat="forty_yard" data={fortyData} />
                </div>
              )}

              <div className="text-center">
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black px-8 py-3 rounded-xl transition-all hover:scale-105"
                >
                  VIEW FULL LEADERBOARD →
                </Link>
                <Link
                  href="/profile/edit"
                  className="inline-flex items-center gap-2 ml-4 border-2 border-emerald-500 text-emerald-400 px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 hover:text-black transition-all"
                >
                  ✏️ ENTER YOUR STATS
                </Link>
              </div>

              {/* Feature highlights */}
              <div className="grid md:grid-cols-4 gap-4 mt-12">
                {[
                  { icon: '📊', label: '10 Stats Categories', desc: 'Vertical, 40yd, Bench, Squat, Clean, Shuttle, GPA & more' },
                  { icon: '🏀', label: 'Filter by Sport', desc: 'Compare within your sport — Football, Basketball, Track, etc.' },
                  { icon: '🗺️', label: 'State Rankings', desc: 'See top talent in your state or nationwide' },
                  { icon: '⬆️', label: 'PR Tracking', desc: '⬆️ UP arrows when you beat your personal record' },
                ].map((feature, i) => (
                  <div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <h4 className="text-sm font-bold mb-1">{feature.label}</h4>
                    <p className="text-xs text-zinc-500">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          INTERACTIVE TABS SECTION
          ═══════════════════════════════════════════════════════ */}
          <section className="py-16 px-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
              <h2 className="text-3xl font-black text-center">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  🎯 Platform Hub
                </span>
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/50 border border-zinc-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-br from-zinc-900/50 to-black/50 rounded-2xl p-8 md:p-10 border-2 border-cyan-500/30 transition-all duration-300 hover:border-cyan-500/50">
              <h2 className="text-3xl font-black mb-4">{tabContent[activeTab]?.title || ''}</h2>
              <p className="text-lg text-cyan-300 mb-6 max-w-3xl">
                {tabContent[activeTab]?.description || ''}
              </p>
              <div className="flex flex-wrap gap-4">
                {tabContent[activeTab]?.actions.map((action, i) => (
                  <Link
                    key={i}
                    href={action.href}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 ${
                      action.variant === 'primary'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : 'border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black'
                    }`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          NAVIGATION CARDS GRID
          ═══════════════════════════════════════════════════════ */}
          <section id="navigation" className="py-16 px-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              <h2 className="text-3xl font-black text-center">
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  🚀 Explore Our Platform
                </span>
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {navigationCards.map((card, index) => (
                <NavigationCard key={index} {...card} />
              ))}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          TECH SHOWCASE GRID
          ═══════════════════════════════════════════════════════ */}
          <section id="tech" className="py-16 px-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
              <h2 className="text-3xl font-black text-center">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  ⚡ Our Production Technology
                </span>
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {techFeatures.map((tech, i) => (
                <div
                  key={i}
                  className={`bg-gradient-to-br ${tech.gradient} rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]`}
                >
                  <div className="text-4xl mb-4">{tech.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-white">{tech.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{tech.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-gradient-to-br from-zinc-900/50 to-black/50 rounded-2xl p-8 border-2 border-cyan-500/30">
              <h3 className="text-2xl font-black mb-6 text-center">Broadcast Architecture</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center items-center">
                <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 p-4 rounded-xl border-2 border-blue-500/50">
                  <div className="text-3xl mb-2">🎤</div>
                  <h4 className="font-bold text-sm">OBS Studio</h4>
                  <p className="text-xs text-zinc-400">RTMP/WHIP Ingress</p>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <span className="text-2xl text-cyan-400 animate-pulse">→</span>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 p-4 rounded-xl border-2 border-purple-500/50">
                  <div className="text-3xl mb-2">🎥</div>
                  <h4 className="font-bold text-sm">LiveKit Server</h4>
                  <p className="text-xs text-zinc-400">WebRTC SFU</p>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <span className="text-2xl text-cyan-400 animate-pulse">→</span>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 p-4 rounded-xl border-2 border-cyan-500/50">
                  <div className="text-3xl mb-2">📡</div>
                  <h4 className="font-bold text-sm">TrackEgress</h4>
                  <p className="text-xs text-zinc-400">Multi-Platform</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[
                  { name: 'YouTube', color: 'bg-red-900/20 border-red-500/30' },
                  { name: 'Facebook', color: 'bg-blue-900/20 border-blue-500/30' },
                  { name: 'TikTok', color: 'bg-zinc-900 border-zinc-700' },
                  { name: 'In-App Player', color: 'bg-cyan-900/20 border-cyan-500/30' },
                ].map((platform, i) => (
                  <div key={i} className={`${platform.color} p-3 rounded-lg border text-center text-sm font-bold`}>
                    {platform.name}
                  </div>
                ))}
              </div>
              <p className="text-center text-zinc-500 text-sm mt-6">
                <span className="text-cyan-400 font-bold">No double encoding:</span> OBS → LiveKit → Direct multicasting via TrackEgress
              </p>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════════════════ */}
          <section className="py-20 px-6">
            <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-cyan-900 rounded-2xl p-12 md:p-16 text-center relative overflow-hidden max-w-6xl mx-auto">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }}></div>
              <div className="relative z-10">
                <h3 className="text-3xl md:text-5xl font-black mb-6">
                  Ready to{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    Get IN the GAME
                  </span>
                  ?
                </h3>
                <p className="text-cyan-200 mb-8 max-w-2xl mx-auto text-lg">
                  Experience professional-grade broadcasting with LiveKit WebRTC technology. Apply to be a guest, watch live shows, or explore our platform.
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-6">
                  <Link
                    href="/request"
                    className="group bg-white text-black px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2 shadow-lg"
                  >
                    🎤 BECOME A GUEST
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link
                    href="/broadcast"
                    className="group border-2 border-cyan-400 text-cyan-400 px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 hover:text-black transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                  >
                    📺 WATCH LIVE
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
                <p className="text-sm text-cyan-300/70 mt-8 font-mono">
                  Powered by LiveKit WebRTC • TrackEgress • Next.js 16 • Django
                </p>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
          FOOTER BRAND BAR
          ═══════════════════════════════════════════════════════ */}
          <footer className="border-t border-zinc-900 bg-black py-16 px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="text-5xl mb-4">🏈</div>
              <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase mb-2">
                YOU NEED TO GET IN the GAME with DOC!
              </p>
              <p className="text-zinc-700 text-xs font-mono">
                LiveKit WebRTC • TrackEgress • RTMP/WHIP • 4K Streaming
              </p>
            </div>
          </footer>
        </div>
      </Layout>
    </>
  );
}
