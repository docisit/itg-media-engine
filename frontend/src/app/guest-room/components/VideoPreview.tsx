'use client';

import { useEffect, useRef, useState } from 'react';

export default function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize video stream
  useEffect(() => {
    const initializeVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(console.error);
        }

        // Initially mute audio for preview
        if (mediaStream.getAudioTracks().length > 0) {
          mediaStream.getAudioTracks()[0].enabled = false;
        }

      } catch (err: any) {
        console.error('Error accessing media devices:', err);
        setError(err.message || 'Failed to access camera/microphone');
      } finally {
        setIsLoading(false);
      }
    };

    initializeVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !videoTracks[0].enabled;
        videoTracks[0].enabled = newState;
        setIsVideoEnabled(newState);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled;
        audioTracks[0].enabled = newState;
        setIsAudioEnabled(newState);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-cyan-400 font-mono uppercase tracking-widest text-sm">
            Initializing Camera...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-5xl mb-4">📹</div>
          <h3 className="text-xl font-bold text-red-400 mb-2">Camera Error</h3>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-cyan-600 text-black px-4 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Video Element */}
      <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Video/Audio Status Overlay */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isVideoEnabled ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>
            {isVideoEnabled ? 'CAMERA ON' : 'CAMERA OFF'}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isAudioEnabled ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>
            {isAudioEnabled ? 'MIC ON' : 'MIC OFF'}
          </div>
        </div>

        {/* Resolution Indicator */}
        <div className="absolute bottom-4 left-4">
          <div className="px-3 py-1 bg-black/70 rounded-full text-xs font-mono text-cyan-300">
            720p • 30fps
          </div>
        </div>

        {/* Connection Quality Indicator */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-black/70 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-mono text-green-300">LIVE</span>
          </div>
        </div>
      </div>

      {/* Quick Toggle Buttons */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={toggleVideo}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${isVideoEnabled ? 'bg-red-900/30 text-red-400 hover:bg-red-800/40' : 'bg-green-900/30 text-green-400 hover:bg-green-800/40'}`}
        >
          <span className="text-lg">{isVideoEnabled ? '📹' : '📵'}</span>
          {isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>
        
        <button
          onClick={toggleAudio}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${isAudioEnabled ? 'bg-red-900/30 text-red-400 hover:bg-red-800/40' : 'bg-green-900/30 text-green-400 hover:bg-green-800/40'}`}
        >
          <span className="text-lg">{isAudioEnabled ? '🎤' : '🔇'}</span>
          {isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
        </button>
      </div>

      {/* Video Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <div className="text-2xl font-mono text-cyan-400">720p</div>
          <div className="text-xs text-zinc-500 mt-1">Resolution</div>
        </div>
        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <div className="text-2xl font-mono text-cyan-400">30</div>
          <div className="text-xs text-zinc-500 mt-1">FPS</div>
        </div>
        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
          <div className="text-2xl font-mono text-cyan-400">HD</div>
          <div className="text-xs text-zinc-500 mt-1">Quality</div>
        </div>
      </div>
    </div>
  );
}