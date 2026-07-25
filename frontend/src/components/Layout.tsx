'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Navigation from './Navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

const Footer = () => {
  return (
    <footer className="bg-black border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="text-2xl font-black tracking-tighter text-cyan-500 mb-4">IN THE GAME</div>
            <p className="text-zinc-400 text-sm">
              Professional streaming platform showcasing coaches and athletes in the digital age.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/shows" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Show Calendar</Link></li>
              <li><Link href="/blog" className="text-zinc-400 hover:text-cyan-400 transition text-sm">News Stories</Link></li>
              <li><Link href="/request" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Guest Request</Link></li>
              <li><Link href="/docket" className="text-cyan-400 hover:text-cyan-300 transition text-sm font-semibold">📋 The DOCket</Link></li>
              <li><Link href="/rankings" className="text-zinc-400 hover:text-cyan-400 transition text-sm">🏆 Rankings</Link></li>
              <li><Link href="/drills" className="text-zinc-400 hover:text-cyan-400 transition text-sm">🏋️ Drill Library</Link></li>
              <li><Link href="/tech" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Our Technology</Link></li>
              <li><Link href="/contact" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Contact DOC</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="text-zinc-400 hover:text-cyan-400 transition text-sm">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>Email: <a href="mailto:doc@yourdomain.com" className="text-cyan-400 hover:text-cyan-300">doc@yourdomain.com</a></li>
              <li>Speed Test: <Link href="/speedtest" className="text-cyan-400 hover:text-cyan-300">Network Speed Test</Link></li>
              <li>Live Diagnostics: <Link href="/speedtest" className="text-cyan-400 hover:text-cyan-300">Connection Check</Link></li>


            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-8 text-center">
          <p className="text-zinc-500 text-sm">
            © 2026 IN the GAME with DOC Media. Powered by <span className="text-zinc-400">I am iT</span>
          </p>
          <p className="text-zinc-600 text-xs mt-2">#itisandiamit</p>
        </div>
      </div>
    </footer>
  );
};

export default function Layout({ children, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navigation />
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}