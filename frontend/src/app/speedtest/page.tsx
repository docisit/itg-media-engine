'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type TestPhase = 'idle' | 'ip' | 'latency' | 'download' | 'upload' | 'complete' | 'error';

interface LatencySample {
  ms: number;
  serverTime: number;
}

interface LatencyResults {
  samples: LatencySample[];
  min: number;
  max: number;
  avg: number;
  jitter: number;
}

interface SpeedResults {
  mbps: number;
  sizeMB: number;
  duration: number;
}

interface TestHistoryItem {
  timestamp: number;
  date: string;
  ip: string;
  latency: number;
  jitter: number;
  download: number;
  upload: number;
}

interface SessionUser {
  accessToken?: string;
  is_staff?: boolean;
  username?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function getQualityColor(value: number, type: 'speed' | 'latency'): string {
  if (type === 'latency') {
    if (value < 30) return 'text-green-400';
    if (value < 60) return 'text-cyan-400';
    if (value < 120) return 'text-yellow-400';
    if (value < 250) return 'text-orange-400';
    return 'text-red-400';
  }
  if (value >= 100) return 'text-green-400';
  if (value >= 50) return 'text-cyan-400';
  if (value >= 25) return 'text-teal-400';
  if (value >= 10) return 'text-yellow-400';
  if (value >= 5) return 'text-orange-400';
  return 'text-red-400';
}

function getQualityBg(value: number, type: 'speed' | 'latency'): string {
  if (type === 'latency') {
    if (value < 30) return 'bg-green-500';
    if (value < 60) return 'bg-cyan-500';
    if (value < 120) return 'bg-yellow-500';
    if (value < 250) return 'bg-orange-500';
    return 'bg-red-500';
  }
  if (value >= 100) return 'bg-green-500';
  if (value >= 50) return 'bg-cyan-500';
  if (value >= 25) return 'bg-teal-500';
  if (value >= 10) return 'bg-yellow-500';
  if (value >= 5) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRating(speed: number): string {
  if (speed >= 100) return '🔥 Blazing Fast';
  if (speed >= 50) return '⚡ Excellent';
  if (speed >= 25) return '✅ Great';
  if (speed >= 10) return '👍 Good';
  if (speed >= 5) return '⚠️ Fair';
  return '❌ Poor';
}

function getStreamingRecommendation(download: number, latency: number): string[] {
  const recs: string[] = [];
  if (download >= 50) recs.push('4K Ultra HD streaming • flawless');
  if (download >= 25) recs.push('1440p QHD streaming • smooth');
  if (download >= 10) recs.push('1080p Full HD streaming • great');
  if (download >= 5) recs.push('720p HD streaming • watchable');
  if (download >= 2) recs.push('480p SD streaming • limited');
  if (download < 2) recs.push('May buffer on video content');
  
  if (latency < 30) recs.push('🎮 Excellent for gaming & video calls');
  else if (latency < 60) recs.push('🎮 Good for video calls & casual gaming');
  else if (latency < 120) recs.push('🎮 OK for video calls, not ideal for gaming');
  else recs.push('🎮 High latency — may lag on calls');
  
  return recs;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SpeedTestPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;

  // State
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [clientIP, setClientIP] = useState<string>('');
  const [userAgent, setUserAgent] = useState<string>('');
  const [latency, setLatency] = useState<LatencyResults | null>(null);
  const [download, setDownload] = useState<SpeedResults | null>(null);
  const [upload, setUpload] = useState<SpeedResults | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('speedtest_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
    
    // Detect user agent on client
    setUserAgent(navigator.userAgent);
  }, []);

  // Save history whenever it changes
  const saveHistory = useCallback((item: TestHistoryItem) => {
    const updated = [item, ...history].slice(0, 10); // keep last 10
    setHistory(updated);
    try {
      localStorage.setItem('speedtest_history', JSON.stringify(updated));
    } catch {}
  }, [history]);

  // ─── Step 1: Get IP ─────────────────────────────────────────────────────
  const fetchIP = useCallback(async (signal: AbortSignal): Promise<string> => {
    setProgressLabel('Locating your connection...');
    try {
      const res = await fetch('/api/speedtest/ip', { signal, cache: 'no-store' });
      if (!res.ok) throw new Error('IP lookup failed');
      const data = await res.json();
      setClientIP(data.ip);
      return data.ip;
    } catch {
      // Fallback: detect from WebRTC or just use "Unknown"
      setClientIP('Unknown');
      return 'Unknown';
    }
  }, []);


  // ─── Step 2: Latency ────────────────────────────────────────────────────
  const runLatencyTest = useCallback(async (signal: AbortSignal): Promise<LatencyResults> => {
    setProgressLabel('Measuring ping — 5 samples...');
    setProgress(5);
    
    const samples: LatencySample[] = [];
    const numSamples = 5;
    
    for (let i = 0; i < numSamples; i++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      
      const start = performance.now();
      // Use our lightweight nextjs latency endpoint
      const res = await fetch('/api/speedtest/latency', {
        signal,
        cache: 'no-store',
      });
      const data = await res.json();
      const end = performance.now();
      
      samples.push({
        ms: end - start,
        serverTime: data.serverTime,
      });
      
      setProgress(5 + ((i + 1) / numSamples) * 25);
      
      // Small delay between pings to not flood
      if (i < numSamples - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    const values = samples.map(s => s.ms);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
    const jitter = Math.sqrt(variance);
    
    const result: LatencyResults = { samples, min, max, avg, jitter };
    setLatency(result);
    return result;
  }, []);

  // ─── Step 3: Download Speed ─────────────────────────────────────────────
  const runDownloadTest = useCallback(async (signal: AbortSignal): Promise<SpeedResults> => {
    setProgressLabel('Testing download — 5MB...');
    setProgress(35);
    
    // Test sizes: 1MB warmup, then 5MB main test
    const warmupSize = 1 * 1024 * 1024;
    const mainSize = 5 * 1024 * 1024;
    
    // Warmup
    setProgressLabel('Warming up...');
    try {
      await fetch(`/api/speedtest-download?size=${warmupSize}`, {
        signal, cache: 'no-store',
      });
    } catch {
      // warmup failure is non-fatal
    }
    
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    
    setProgressLabel('Downloading 5MB test file...');
    setProgress(40);
    
    const start = performance.now();
    const response = await fetch(`/api/speedtest-download?size=${mainSize}`, {
      signal,
      cache: 'no-store',
    });
    
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    
    // Read the response as a blob to measure actual transfer time
    const blob = await response.blob();
    const end = performance.now();
    
    const durationSec = (end - start) / 1000;
    const sizeBytes = blob.size;
    const sizeMB = sizeBytes / (1024 * 1024);
    const mbps = (sizeMB * 8) / durationSec;
    
    const result: SpeedResults = { mbps, sizeMB, duration: durationSec };
    setDownload(result);
    setProgress(65);
    
    return result;
  }, []);

  // ─── Step 4: Upload Speed ───────────────────────────────────────────────
  const runUploadTest = useCallback(async (signal: AbortSignal): Promise<SpeedResults> => {
    setProgressLabel('Testing upload — 2MB payload...');
    setProgress(70);
    
    const uploadSize = 2 * 1024 * 1024; // 2MB
    
    // Generate payload client-side using Uint8Array
    const payload = new Uint8Array(uploadSize);
    // Fill with pseudo-random data (fast enough for this purpose)
    for (let i = 0; i < uploadSize; i += 4096) {
      const chunk = Math.min(4096, uploadSize - i);
      for (let j = 0; j < chunk; j++) {
        payload[i + j] = (i + j * 7) & 0xFF;
      }
    }
    const blob = new Blob([payload], { type: 'application/octet-stream' });
    
    setProgress(75);
    
    const start = performance.now();
    const response = await fetch('/api/speedtest-upload', {
      method: 'POST',
      signal,
      body: blob,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    
    if (!response.ok) throw new Error(`Upload server returned ${response.status}`);
    
    const end = performance.now();
    const durationSec = (end - start) / 1000;
    const sizeMB = blob.size / (1024 * 1024);
    const mbps = (sizeMB * 8) / durationSec;
    
    const result: SpeedResults = { mbps, sizeMB, duration: durationSec };
    setUpload(result);
    setProgress(90);
    
    return result;
  }, []);

  // ─── Main Test Runner ───────────────────────────────────────────────────
  const runFullTest = useCallback(async () => {
    // Clean up any previous test
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setPhase('ip');
    setErrorMsg('');
    setProgress(0);
    setLatency(null);
    setDownload(null);
    setUpload(null);

    try {
      // Step 1: Get IP
      setPhase('ip');
      const ip = await fetchIP(signal);
      
      // Step 2: Latency
      setPhase('latency');
      const latResult = await runLatencyTest(signal);
      
      // Step 3: Download
      setPhase('download');
      const dlResult = await runDownloadTest(signal);
      
      // Step 4: Upload
      setPhase('upload');
      const ulResult = await runUploadTest(signal);
      
      setProgress(100);
      setProgressLabel('Test complete!');
      setPhase('complete');

      // Save to history
      const historyItem: TestHistoryItem = {
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        ip,
        latency: Math.round(latResult.avg),
        jitter: Math.round(latResult.jitter * 10) / 10,
        download: Math.round(dlResult.mbps * 100) / 100,
        upload: Math.round(ulResult.mbps * 100) / 100,
      };
      saveHistory(historyItem);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Speed test error:', err);
      setPhase('error');
      setErrorMsg(err.message || 'An unexpected error occurred');
    }
  }, [fetchIP, runLatencyTest, runDownloadTest, runUploadTest, saveHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ─── Share / Copy Results ───────────────────────────────────────────────
  const copyResults = useCallback(() => {
    if (!latency || !download || !upload) return;
    
    const text = [
      `📊 DonOConnnor.com Speed Test Results`,
      `📅 ${new Date().toLocaleString()}`,
      `🌐 IP: ${clientIP}`,
      ``,
      `📶 Latency: ${Math.round(latency.avg)}ms`,
      `   Min: ${Math.round(latency.min)}ms | Max: ${Math.round(latency.max)}ms | Jitter: ${Math.round(latency.jitter * 10) / 10}ms`,
      ``,
      `⬇️ Download: ${download.mbps.toFixed(2)} Mbps`,
      `⬆️ Upload: ${upload.mbps.toFixed(2)} Mbps`,
      ``,
      `📺 ${getStreamingRecommendation(download.mbps, latency.avg)[0]}`,
      ``,
      `Tested at yourdomain.com/speedtest`,
    ].join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [latency, download, upload, clientIP]);

  // ─── Clear History ──────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem('speedtest_history'); } catch {}
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  const isTesting = phase === 'ip' || phase === 'latency' || phase === 'download' || phase === 'upload';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-900 via-black to-blue-900 py-8 px-6 border-b border-cyan-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            <span className="text-cyan-400">Network</span> Speed Test
          </h1>
          <p className="text-zinc-400 mt-2 max-w-xl">
            Measure your connection speed, latency, and jitter to ensure optimal streaming performance.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* IP Display */}
        {clientIP && (
          <div className="text-center mb-8 bg-zinc-900/40 border border-zinc-800 rounded-xl py-3 px-6 inline-block w-full sm:w-auto">
            <span className="text-zinc-500 text-sm">Your IP: </span>
            <span className="text-cyan-400 font-mono font-bold">{clientIP}</span>
            {sessionUser?.username && (
              <span className="text-zinc-500 ml-3 text-sm">
                | Logged in as <span className="text-green-400">{sessionUser.username}</span>
              </span>
            )}
          </div>
        )}

        {/* Main Test Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 mb-8 backdrop-blur-sm">
          
          {/* Test Button / Idle State */}
          {phase === 'idle' && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Ready to Test</h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                This will measure your ping, download speed, and upload speed. Takes about 15-20 seconds.
              </p>
              <button
                onClick={runFullTest}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-10 py-4 rounded-xl text-lg transition transform hover:scale-105 active:scale-95"
              >
                🚀 Start Test
              </button>
            </div>
          )}

          {/* Testing State */}
          {isTesting && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-xl font-bold mb-2 text-cyan-400">{progressLabel}</h2>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto mt-6">
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-600">
                  <span>IP</span>
                  <span>Ping</span>
                  <span>Download</span>
                  <span>Upload</span>
                  <span>Done</span>
                </div>
              </div>

              {/* Phase indicators */}
              <div className="flex justify-center gap-3 mt-6 flex-wrap">
                {(['ip', 'latency', 'download', 'upload'] as TestPhase[]).map((p) => (
                  <span
                    key={p}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      phase === p
                        ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/50 animate-pulse'
                        : ['complete', 'error'].includes(phase)
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {p === 'ip' ? '📍 Locating' : p === 'latency' ? '📶 Ping' : p === 'download' ? '⬇️ Download' : '⬆️ Upload'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'complete' && latency && download && upload && (
            <div>
              {/* Score Summary */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-zinc-800/80 rounded-full px-6 py-2 mb-4">
                  <span className="text-sm text-zinc-400">Connection Rating:</span>
                  <span className={`font-bold ${getQualityColor(download.mbps, 'speed')}`}>
                    {getRating(download.mbps)}
                  </span>
                </div>
              </div>

              {/* Three main metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {/* Latency */}
                <div className="bg-zinc-800/50 rounded-xl p-5 text-center border border-zinc-700/50">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Latency</div>
                  <div className={`text-3xl font-black ${getQualityColor(latency.avg, 'latency')}`}>
                    {Math.round(latency.avg)}<span className="text-lg font-normal">ms</span>
                  </div>
                  <div className="flex justify-center gap-3 mt-2 text-xs text-zinc-500">
                    <span>Min: {Math.round(latency.min)}ms</span>
                    <span>Max: {Math.round(latency.max)}ms</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Jitter: <span className={latency.jitter < 10 ? 'text-green-400' : latency.jitter < 20 ? 'text-yellow-400' : 'text-red-400'}>
                      {latency.jitter.toFixed(1)}ms
                    </span>
                  </div>
                </div>

                {/* Download */}
                <div className="bg-zinc-800/50 rounded-xl p-5 text-center border border-zinc-700/50">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Download</div>
                  <div className={`text-3xl font-black ${getQualityColor(download.mbps, 'speed')}`}>
                    {download.mbps.toFixed(1)}<span className="text-lg font-normal"> Mbps</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {formatBytes(download.sizeMB * 1024 * 1024)} in {download.duration.toFixed(1)}s
                  </div>
                  <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getQualityBg(download.mbps, 'speed')}`}
                      style={{ width: `${Math.min(download.mbps / 2, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Upload */}
                <div className="bg-zinc-800/50 rounded-xl p-5 text-center border border-zinc-700/50">
                  <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Upload</div>
                  <div className={`text-3xl font-black ${getQualityColor(upload.mbps, 'speed')}`}>
                    {upload.mbps.toFixed(1)}<span className="text-lg font-normal"> Mbps</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {formatBytes(upload.sizeMB * 1024 * 1024)} in {upload.duration.toFixed(1)}s
                  </div>
                  <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getQualityBg(upload.mbps, 'speed')}`}
                      style={{ width: `${Math.min(upload.mbps / 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Streaming Recommendations */}
              <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50 mb-6">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-3">📺 Streaming Recommendations</h3>
                <ul className="space-y-1.5">
                  {getStreamingRecommendation(download.mbps, latency.avg).map((rec, i) => (
                    <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={runFullTest}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6 py-3 rounded-xl transition transform hover:scale-105 active:scale-95"
                >
                  🔄 Test Again
                </button>
                <button
                  onClick={copyResults}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-xl transition flex items-center gap-2"
                >
                  {copied ? (
                    <>✅ Copied!</>
                  ) : (
                    <>📋 Copy Results</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {phase === 'error' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Test Failed</h2>
              <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
                {errorMsg || 'Unable to complete the speed test. Check your connection and try again.'}
              </p>
              <button
                onClick={runFullTest}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-8 py-3 rounded-xl transition"
              >
                🔄 Try Again
              </button>
            </div>
          )}
        </div>

        {/* Test History */}
        {history.length > 0 && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-zinc-300 hover:text-white transition"
              >
                <svg className={`w-5 h-5 transition-transform ${showHistory ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-bold">Test History</span>
                <span className="text-zinc-500 text-sm">({history.length})</span>
              </button>
              <button
                onClick={clearHistory}
                className="text-xs text-zinc-600 hover:text-red-400 transition"
              >
                Clear All
              </button>
            </div>

            {showHistory && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.map((item, i) => (
                  <div key={i} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800 text-sm grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                    <span className="text-zinc-500 text-xs truncate col-span-2 sm:col-span-1">{item.date}</span>
                    <span className={getQualityColor(item.latency, 'latency')}>{item.latency}ms</span>
                    <span className={getQualityColor(item.download, 'speed')}>{item.download.toFixed(1)} Mbps ↓</span>
                    <span className={getQualityColor(item.upload, 'speed')}>{item.upload.toFixed(1)} Mbps ↑</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-3">📖 About This Test</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-zinc-400">
            <div>
              <p className="font-medium text-zinc-300">How it works</p>
              <p className="mt-1">We download a 5MB random data file and upload a 2MB payload to measure your real-world connection speed. 5 latency samples determine your ping and jitter.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-300">What is Jitter?</p>
              <p className="mt-1">Jitter measures the variability in latency. Lower jitter ({'<'}10ms) means a stable connection — important for video calls and gaming.</p>

            </div>
            <div>
              <p className="font-medium text-zinc-300">Data Usage</p>
              <p className="mt-1">Each full test uses approximately 7MB of data (5MB down + 2MB up). Results are stored locally in your browser only.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-300">Accuracy Tips</p>
              <p className="mt-1">For best results: close other apps/tabs using the internet, use a wired connection if possible, and run the test 2-3 times.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
