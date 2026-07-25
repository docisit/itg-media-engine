'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

const TechCard = ({ title, description, icon, features, security, gradient, hoverEffect = true }: {
  title: string;
  description: string;
  icon: string;
  features: string[];
  security?: boolean;
  gradient: string;
  hoverEffect?: boolean;
}) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 border-2 transition-all duration-300 ${hoverEffect ? 'hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]' : ''}`}>
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-zinc-300 mb-4">{description}</p>
    
    {security && (
      <div className="mb-4">
        <span className="inline-block bg-green-600 text-white px-2 py-1 rounded text-xs font-bold mb-2">
          SECURE BY DESIGN
        </span>
      </div>
    )}
    
    <ul className="space-y-2">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center text-sm text-zinc-400">
          <span className="text-cyan-400 mr-2">✓</span>
          {feature}
        </li>
      ))}
    </ul>
  </div>
);

const FeatureHighlight = ({ title, description, stats, color }: {
  title: string;
  description: string;
  stats: { label: string; value: string }[];
  color: string;
}) => (
  <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-102`}>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-zinc-300 mb-6">{description}</p>
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-3xl font-black mb-1">{stat.value}</div>
          <div className="text-xs text-zinc-400 uppercase tracking-wider">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
);

export default function TechPage() {
  const [activeTab, setActiveTab] = useState('livekit');
  const [streamStats, setStreamStats] = useState({
    latency: '<500ms',
    uptime: '99.9%',
    quality: '4K',
    security: 'A+'
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamStats(prev => ({
        ...prev,
        latency: `<${Math.floor(Math.random() * 200) + 300}ms`,
        uptime: `${(99.8 + Math.random() * 0.2).toFixed(1)}%`
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const techStack = [
    {
      title: "LiveKit WebRTC",
      description: "Enterprise-grade real-time video infrastructure",
      icon: "🎥",
      features: [
        "TrackEgress multicasting",
        "RTMP Ingress support",
        "SFU architecture",
        "Automatic scaling",
        "Global edge network"
      ],
      security: true,
      gradient: 'from-purple-900/30 to-violet-900/30 border-purple-500/50'
    },
    {
      title: "TrackEgress System", 
      description: "Direct multicasting to social platforms",
      icon: "📡",
      features: [
        "No double encoding",
        "Multi-platform streaming",
        "Real-time monitoring",
        "Automatic failover",
        "Bitrate optimization"
      ],
      security: true,
      gradient: 'from-cyan-900/30 to-blue-900/30 border-cyan-500/50'
    },
    {
      title: "RTMP Ingress",
      description: "Professional OBS/Streamlabs integration",
      icon: "⚡",
      features: [
        "OBS Studio support",
        "WHIP protocol ready",
        "Auto-reconnect",
        "Stream health monitoring",
        "Multi-source input"
      ],
      security: true,
      gradient: 'from-green-900/30 to-emerald-900/30 border-green-500/50'
    },
    {
      title: "Next.js 16 + React",
      description: "Modern framework with Turbopack & Server Components",
      icon: "⚛️",
      features: [
        "Server-side rendering",
        "React Server Components",
        "Turbopack dev server",
        "Image optimization", 
        "Edge runtime ready"
      ],
      gradient: 'from-blue-900/30 to-cyan-900/30 border-blue-500/50'
    },
    {
      title: "Django REST API",
      description: "High-performance Python backend",
      icon: "🐍",
      features: [
        "JWT authentication",
        "Real-time WebSockets",
        "Email verification",
        "Rate limiting",
        "Admin dashboard"
      ],
      security: true,
      gradient: 'from-emerald-900/30 to-green-900/30 border-emerald-500/50'
    },
    {
      title: "Ubuntu Server 24.04",
      description: "Bare metal infrastructure with Docker",
      icon: "🐳",
      features: [
        "Docker containerization",
        "Nginx reverse proxy",
        "Redis caching",
        "PostgreSQL database",
        "Automated backups"
      ],
      security: true,
      gradient: 'from-orange-900/30 to-red-900/30 border-orange-500/50'
    }
  ];

  const livekitFeatures = [
    {
      title: "Real-time Video",
      description: "Ultra-low latency WebRTC streaming with SFU architecture",
      stats: [
        { label: "Latency", value: streamStats.latency },
        { label: "Quality", value: "4K" }
      ],
      color: 'from-purple-900/30 to-violet-900/30 border-purple-500/50'
    },
    {
      title: "TrackEgress",
      description: "Direct multicasting to YouTube, Facebook, TikTok, Owncast",
      stats: [
        { label: "Platforms", value: "4+" },
        { label: "Encoding", value: "1x" }
      ],
      color: 'from-cyan-900/30 to-blue-900/30 border-cyan-500/50'
    },
    {
      title: "RTMP Ingress",
      description: "Professional broadcast software integration",
      stats: [
        { label: "Sources", value: "Unlimited" },
        { label: "Protocols", value: "RTMP/WHIP" }
      ],
      color: 'from-green-900/30 to-emerald-900/30 border-green-500/50'
    }
  ];

  const tabs = [
    { id: 'livekit', label: 'LiveKit Infrastructure', icon: '🎥' },
    { id: 'frontend', label: 'Next.js Frontend', icon: '⚛️' },
    { id: 'backend', label: 'Django Backend', icon: '🐍' },
    { id: 'deployment', label: 'Deployment', icon: '🚀' }
  ];

  const tabContent = {
    livekit: {
      title: "LiveKit WebRTC Infrastructure",
      description: "Enterprise-grade real-time video platform powering our broadcasts",
      features: [
        "SFU (Selective Forwarding Unit) architecture for optimal bandwidth usage",
        "TrackEgress for direct multicasting to social platforms without re-encoding",
        "RTMP Ingress for professional broadcast software like OBS Studio",
        "Global edge network with automatic failover",
        "Real-time monitoring and analytics dashboard"
      ]
    },
    frontend: {
      title: "Next.js 16 + React 19",
      description: "Cutting-edge frontend with Turbopack and Server Components",
      features: [
        "React Server Components for zero-bundle-size components",
        "Turbopack dev server for instant hot reloads",
        "Image optimization with next/image for optimal performance",
        "Edge runtime for global CDN distribution",
        "TypeScript for type-safe development"
      ]
    },
    backend: {
      title: "Django REST Framework",
      description: "High-performance Python backend with real-time capabilities",
      features: [
        "JWT authentication with refresh tokens",
        "Django Channels for WebSocket support",
        "Email verification system with rate limiting",
        "Admin dashboard with real-time analytics",
        "PostgreSQL database with connection pooling"
      ]
    },
    deployment: {
      title: "Docker + Ubuntu Deployment",
      description: "Containerized deployment on bare metal infrastructure",
      features: [
        "Docker containerization for consistent environments",
        "Nginx reverse proxy with SSL termination",
        "Redis for caching and real-time messaging",
        "Automated backups with retention policies",
        "24/7 monitoring with alerting system"
      ]
    }
  };

  const securityFeatures = [
    {
      title: "End-to-End Encryption",
      description: "All video streams encrypted using WebRTC DTLS-SRTP"
    },
    {
      title: "Token Authentication", 
      description: "Secure guest access with time-limited JWT tokens"
    },
    {
      title: "DDoS Protection",
      description: "Cloudflare protection with rate limiting"
    },
    {
      title: "Secure API",
      description: "JWT tokens with refresh mechanisms"
    },
    {
      title: "Data Privacy", 
      description: "GDPR compliant, no third-party tracking"
    },
    {
      title: "Automated Updates",
      description: "Security patch deployment within 24 hours"
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
      {/* Hero Section with animated gradient */}
      <div className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-cyan-900 py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-30"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            TECHNOLOGY STACK
          </h1>
          <p className="text-2xl text-cyan-300 max-w-3xl mx-auto mb-8">
            Enterprise-grade broadcasting infrastructure powering the DOC Show
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-cyan-500/50">
              <span className="text-cyan-400">🎥 LiveKit WebRTC</span>
            </div>
            <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-500/50">
              <span className="text-purple-400">📡 TrackEgress</span>
            </div>
            <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-green-500/50">
              <span className="text-green-400">⚡ RTMP Ingress</span>
            </div>
            <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/50">
              <span className="text-blue-400">⚛️ Next.js 16</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-16 px-6">
        {/* Interactive Tabs */}
        <section className="mb-16">
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white scale-105' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/50'}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className="bg-gradient-to-br from-zinc-900/50 to-black/50 rounded-2xl p-8 border-2 border-cyan-500/30">
            <h2 className="text-3xl font-black mb-4">{tabContent[activeTab as keyof typeof tabContent].title}</h2>
            <p className="text-xl text-cyan-300 mb-6">{tabContent[activeTab as keyof typeof tabContent].description}</p>
            <ul className="space-y-3">
              {tabContent[activeTab as keyof typeof tabContent].features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-cyan-400 mr-3 mt-1">▶</span>
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* LiveKit Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-12 text-center border-b border-purple-500 pb-2 inline-block">
            LiveKit Infrastructure
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {livekitFeatures.map((feature, index) => (
              <FeatureHighlight key={index} {...feature} />
            ))}
          </div>
        </section>

        {/* Technology Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-12 text-center border-b border-cyan-500 pb-2 inline-block">
            Complete Technology Stack
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {techStack.map((tech, index) => (
              <TechCard key={index} {...tech} />
            ))}
          </div>
        </section>

        {/* Modern Network Diagram */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-8 text-center border-b border-cyan-500 pb-2 inline-block">
            Broadcast Architecture
          </h2>
          
          <div className="bg-gradient-to-br from-zinc-900/50 to-black/50 rounded-2xl p-8 border-2 border-cyan-500/30">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-center mb-8">
              <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 p-6 rounded-xl border-2 border-blue-500/50">
                <div className="text-3xl mb-3">🎤</div>
                <h4 className="font-bold mb-1">OBS Studio</h4>
                <p className="text-sm text-zinc-400">RTMP Ingress</p>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="text-2xl text-cyan-400 animate-pulse">→</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 p-6 rounded-xl border-2 border-purple-500/50">
                <div className="text-3xl mb-3">🎥</div>
                <h4 className="font-bold mb-1">LiveKit</h4>
                <p className="text-sm text-zinc-400">WebRTC SFU</p>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="text-2xl text-cyan-400 animate-pulse">→</div>
              </div>
              
              <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 p-6 rounded-xl border-2 border-cyan-500/50">
                <div className="text-3xl mb-3">📡</div>
                <h4 className="font-bold mb-1">TrackEgress</h4>
                <p className="text-sm text-zinc-400">Multi-Platform</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30 text-center">
                <div className="text-xl">YouTube</div>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 text-center">
                <div className="text-xl">Facebook</div>
              </div>
              <div className="bg-black p-4 rounded-lg border border-zinc-700 text-center">
                <div className="text-xl">TikTok</div>
              </div>
              <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30 text-center">
                <div className="text-xl">Owncast</div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-zinc-400 max-w-3xl mx-auto">
                <span className="text-cyan-400 font-bold">No double encoding:</span> OBS → LiveKit → Direct multicasting to social platforms.
                TrackEgress eliminates re-encoding waste, reducing latency and improving quality.
              </p>
            </div>
          </div>
        </section>

        {/* Real-time Performance Metrics */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-8 text-center border-b border-cyan-500 pb-2 inline-block">
            Real-time Performance
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 p-6 rounded-2xl border-2 border-cyan-500/50">
              <div className="text-4xl font-black text-cyan-400 mb-2 animate-pulse">{streamStats.latency}</div>
              <p className="text-sm text-zinc-400">Stream Latency</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 p-6 rounded-2xl border-2 border-green-500/50">
              <div className="text-4xl font-black text-green-400 mb-2">{streamStats.uptime}</div>
              <p className="text-sm text-zinc-400">Uptime SLA</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 p-6 rounded-2xl border-2 border-purple-500/50">
              <div className="text-4xl font-black text-purple-400 mb-2">4K</div>
              <p className="text-sm text-zinc-400">Video Quality</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 p-6 rounded-2xl border-2 border-blue-500/50">
              <div className="text-4xl font-black text-blue-400 mb-2">A+</div>
              <p className="text-sm text-zinc-400">SSL Security</p>
            </div>
          </div>
        </section>

        {/* Security Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-12 text-center border-b border-green-500 pb-2 inline-block">
            Security & Reliability
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-6 border-2 border-green-500/30 transition-all duration-300 hover:scale-102">
                <h3 className="text-xl font-bold mb-3 text-green-400">{feature.title}</h3>
                <p className="text-zinc-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-900 via-purple-900 to-cyan-900 rounded-2xl p-12 mt-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black mb-6">Experience Professional Streaming</h3>
            <p className="text-cyan-200 mb-8 max-w-2xl mx-auto text-lg">
              Join the DOC Show and experience our cutting-edge broadcasting technology firsthand.
              Apply to be a guest or contact us for technical inquiries.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <Link href="/request" className="bg-white text-black px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition-all duration-300 hover:scale-105 inline-block shadow-lg">
                🎤 BECOME A GUEST
              </Link>
              <Link href="/contact" className="border-2 border-cyan-400 text-cyan-400 px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 hover:text-black transition-all duration-300 hover:scale-105 inline-block">
                🔧 TECHNICAL INQUIRY
              </Link>
            </div>
            <p className="text-sm text-cyan-300/70 mt-8">
              Powered by LiveKit WebRTC • Next.js 16 • Django • TrackEgress
            </p>
          </div>
        </section>
      </div>
      </div>
    </Layout>
  );
}
