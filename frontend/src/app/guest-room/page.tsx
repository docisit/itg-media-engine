'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Play, CheckCircle, User, Headphones } from 'lucide-react';

export default function GreenRoom() {
  const router = useRouter();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [guestName, setGuestName] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [camChecked, setCamChecked] = useState(false);
  const [headphoneChecked, setHeadphoneChecked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Initial Device Permissions & List
  useEffect(() => {
    async function init() {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setStream(initialStream);
        if (videoRef.current) videoRef.current.srcObject = initialStream;

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(allDevices);
        
        const videoDev = allDevices.find(d => d.kind === 'videoinput');
        const audioDev = allDevices.find(d => d.kind === 'audioinput');
        if (videoDev) setSelectedVideo(videoDev.deviceId);
        if (audioDev) setSelectedAudio(audioDev.deviceId);
      } catch (err) {
        console.error("Device access denied", err);
        alert("Camera/Microphone access is required. Please allow permissions and refresh.");
      }
    }
    init();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 2. Switch Devices on the fly
  useEffect(() => {
    async function updatePreview() {
      if (!selectedVideo && !selectedAudio) return;
      
      // Stop old stream
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideo ? { deviceId: selectedVideo } : false,
          audio: selectedAudio ? { deviceId: selectedAudio } : false
        });
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;
      } catch (err) {
        console.error("Error switching devices:", err);
      }
    }
    
    if (selectedVideo || selectedAudio) {
      updatePreview();
    }
  }, [selectedVideo, selectedAudio]);

  // 3. Audio Meter Logic
  useEffect(() => {
    if (!stream) return;
    
    let audioContext: AudioContext | null = null;
    let animationId: number;
    
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        setAudioLevel(sum / bufferLength);
        animationId = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (err) {
      console.error("Audio meter error:", err);
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
    };
  }, [stream]);

  // 4. Chime sound for checklist item toggle
  const audioContextRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch {
      // Audio context may not be available
    }
  };

  const handleStart = () => {
    // Validate name
    if (!guestName.trim()) {
      alert("Please enter your name first!");
      return;
    }
    
    // Stop preview stream (will restart in broadcast room)
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    
    // Go directly to the broadcast room
    const name = encodeURIComponent(guestName.trim());
    router.push(`/guest-room/Broadcast_Studio_A1`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gradient-to-b from-gray-800/40 to-gray-900/20 border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/10 backdrop-blur-sm">
        
        {/* VIDEO PREVIEW */}
        <div className="aspect-video bg-black relative overflow-hidden border-b border-cyan-500/20">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <div className="absolute top-4 left-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
            🎬 A1 Green Room
          </div>
          
          {/* Device Status Indicators */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-sm ${selectedVideo ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' : 'bg-gradient-to-r from-red-600 to-orange-600 text-white'}`}>
              <Camera size={12} className="inline mr-1.5" />
              {selectedVideo ? 'CAM ON' : 'NO CAM'}
            </div>
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-sm ${selectedAudio ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' : 'bg-gradient-to-r from-red-600 to-orange-600 text-white'}`}>
              <Mic size={12} className="inline mr-1.5" />
              {selectedAudio ? 'MIC ON' : 'NO MIC'}
            </div>
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full border border-cyan-500/40 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Broadcast Ready Check</span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
              Technical Setup
            </h1>
            <p className="text-gray-300 mt-2 text-sm">Configure your broadcast equipment</p>
          </div>
          
          <div className="space-y-5 mb-8">
            {/* NAME INPUT */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <User className="w-5 h-5 text-cyan-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Your Broadcast Name (e.g. Coach Smith)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black/40 border-2 border-gray-700/50 rounded-xl text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-gray-500 hover:border-cyan-500/50"
                maxLength={50}
                autoFocus
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {guestName.length}/50
              </div>
            </div>

            {/* CAMERA SELECT */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Camera className="w-5 h-5 text-cyan-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <select 
                value={selectedVideo} 
                onChange={(e) => setSelectedVideo(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-black/40 border-2 border-gray-700/50 rounded-xl text-white focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all hover:border-cyan-500/50 appearance-none cursor-pointer"
              >
                {devices.filter(d => d.kind === 'videoinput').length === 0 && (
                  <option value="" className="bg-gray-900">No cameras detected</option>
                )}
                {devices.filter(d => d.kind === 'videoinput').map(d => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-gray-900">
                    {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <div className="w-2 h-2 border-r-2 border-b-2 border-cyan-400 transform rotate-45 -translate-y-1/2"></div>
              </div>
            </div>

            {/* MIC SELECT & METER */}
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Mic className="w-5 h-5 text-purple-500 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <select 
                  value={selectedAudio} 
                  onChange={(e) => setSelectedAudio(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border-2 border-gray-700/50 rounded-xl text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all hover:border-purple-500/50 appearance-none cursor-pointer"
                >
                  {devices.filter(d => d.kind === 'audioinput').length === 0 && (
                    <option value="" className="bg-gray-900">No microphones detected</option>
                  )}
                  {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-gray-900">
                      {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 border-r-2 border-b-2 border-purple-400 transform rotate-45 -translate-y-1/2"></div>
                </div>
              </div>

              {/* VU METER */}
              <div className="bg-gradient-to-r from-gray-900/30 to-black/30 p-4 rounded-xl border border-gray-700/50">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-300">Audio Signal</span>
                  </div>
                  <span className={`text-xs font-bold ${audioLevel > 5 ? 'text-green-400' : 'text-gray-500'}`}>
                    {audioLevel > 5 ? "🎤 ACTIVE" : "🔇 SILENT"}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-800/50 rounded-full flex gap-1 overflow-hidden p-0.5">
                  {[...Array(16)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-full flex-1 rounded-sm transition-all duration-100 ${
                        audioLevel > i * 4 
                          ? (i < 12 ? 'bg-gradient-to-t from-green-500 to-emerald-500' : 'bg-gradient-to-t from-red-500 to-orange-500') 
                          : 'bg-gray-900'
                      }`} 
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                  <span>Low</span>
                  <span>Optimal</span>
                  <span>Peak</span>
                </div>
              </div>
            </div>

            {/* 🎬 PRE-FLIGHT CHECKLIST */}
            <div className={`bg-gradient-to-r from-gray-900/30 to-black/30 p-4 rounded-xl border transition-all duration-500 ${
              camChecked && headphoneChecked
                ? 'border-green-500/60 shadow-lg shadow-green-500/10'
                : 'border-gray-700/50'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                    camChecked && headphoneChecked ? 'bg-green-500 animate-pulse' : 'bg-cyan-500'
                  }`}></div>
                  <span className="text-xs font-medium text-gray-300">Pre-Flight Checklist</span>
                </div>
                <span className={`text-xs font-bold transition-all duration-500 ${
                  camChecked && headphoneChecked ? 'text-green-400' : camChecked || headphoneChecked ? 'text-cyan-400' : 'text-gray-500'
                }`}>
                  {camChecked && headphoneChecked
                    ? "✅ READY"
                    : `${[camChecked, headphoneChecked].filter(Boolean).length}/2 Complete`}
                </span>
              </div>

              <div className="space-y-2">
                {/* Item 1: Look Good on Camera */}
                <button
                  onClick={() => { setCamChecked(!camChecked); if (!camChecked) playChime(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 group hover:scale-[1.01] active:scale-[0.98] ${
                    camChecked
                      ? 'bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                      : 'bg-black/30 border-gray-700/40 hover:border-cyan-500/30'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 ${
                    camChecked
                      ? 'bg-gradient-to-br from-cyan-500 to-purple-600 scale-110 shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-800 border border-gray-600'
                  }`}>
                    {camChecked && (
                      <span className="text-white text-xs font-black transition-all duration-300 animate-[ping_0.3s_ease-out]">✓</span>
                    )}
                  </div>
                  <Camera size={16} className={`transition-all duration-300 ${
                    camChecked ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400'
                  }`} />
                  <span className={`text-sm font-medium transition-all duration-300 ${
                    camChecked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                  }`}>
                    I Look Good on Camera
                  </span>
                  {camChecked && (
                    <span className="ml-auto text-[10px] text-cyan-400 font-bold uppercase tracking-wider opacity-80">Done</span>
                  )}
                </button>

                {/* Item 2: Headphones / Earbuds */}
                <button
                  onClick={() => { setHeadphoneChecked(!headphoneChecked); if (!headphoneChecked) playChime(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 group hover:scale-[1.01] active:scale-[0.98] ${
                    headphoneChecked
                      ? 'bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                      : 'bg-black/30 border-gray-700/40 hover:border-purple-500/30'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 ${
                    headphoneChecked
                      ? 'bg-gradient-to-br from-cyan-500 to-purple-600 scale-110 shadow-lg shadow-purple-500/30'
                      : 'bg-gray-800 border border-gray-600'
                  }`}>
                    {headphoneChecked && (
                      <span className="text-white text-xs font-black transition-all duration-300 animate-[ping_0.3s_ease-out]">✓</span>
                    )}
                  </div>
                  <Headphones size={16} className={`transition-all duration-300 ${
                    headphoneChecked ? 'text-purple-400' : 'text-gray-500 group-hover:text-purple-400'
                  }`} />
                  <span className={`text-sm font-medium transition-all duration-300 ${
                    headphoneChecked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                  }`}>
                    Headphones / Earbuds On
                  </span>
                  {headphoneChecked && (
                    <span className="ml-auto text-[10px] text-purple-400 font-bold uppercase tracking-wider opacity-80">Done</span>
                  )}
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    camChecked && headphoneChecked
                      ? 'w-full bg-gradient-to-r from-green-500 to-emerald-500'
                      : camChecked || headphoneChecked
                      ? 'w-1/2 bg-gradient-to-r from-cyan-500 to-purple-500'
                      : 'w-0'
                  }`}
                />
              </div>

              {/* Ready badge */}
              {camChecked && headphoneChecked && (
                <div className="mt-3 text-center animate-[fadeIn_0.5s_ease-out]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500/40 text-[10px] font-bold text-green-300 uppercase tracking-widest">
                    ✅ All Set — You're Ready to Broadcast
                  </span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleStart}
            disabled={!guestName.trim() || !selectedVideo || !selectedAudio}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 via-cyan-500 to-purple-600 text-white font-black uppercase tracking-widest rounded-xl hover:from-cyan-500 hover:via-cyan-400 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden transform hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Play size={18} className="fill-current" />
              <span className="drop-shadow-lg">Enter Broadcast Studio</span>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          </button>
          
          <div className="mt-6 pt-4 border-t border-gray-800/50">
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span>LiveKit Enterprise</span>
              </div>
              <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-green-500" />
                <span>Connection Optimized</span>
              </div>
              <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                <span>Low Latency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
