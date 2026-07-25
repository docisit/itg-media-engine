'use client';

import { useState } from 'react';

interface VideoControlsProps {
  onOpenSettings?: () => void;
}

export default function VideoControls({ onOpenSettings }: VideoControlsProps) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const toggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
    console.log(isAudioMuted ? 'Unmuting audio' : 'Muting audio');
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    console.log(isVideoEnabled ? 'Disabling video' : 'Enabling video');
  };

  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-black/50 backdrop-blur-lg rounded-full border border-zinc-800">
      {/* Audio Control */}
      <button
        onClick={toggleAudio}
        className={`p-3 rounded-full transition-all ${
          isAudioMuted 
            ? 'bg-red-600 text-white' 
            : 'bg-zinc-800 text-green-400 hover:bg-zinc-700'
        }`}
      >
        <span className="text-2xl">{isAudioMuted ? '🔇' : '🎤'}</span>
      </button>

      {/* Video Control */}
      <button
        onClick={toggleVideo}
        className={`p-3 rounded-full transition-all ${
          isVideoEnabled 
            ? 'bg-zinc-800 text-cyan-400 hover:bg-zinc-700' 
            : 'bg-red-600 text-white'
        }`}
      >
        <span className="text-2xl">{isVideoEnabled ? '📹' : '📵'}</span>
      </button>

      {/* Settings Button */}
      <button
        onClick={openSettings}
        className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition-all transform hover:scale-110"
      >
        <span className="text-2xl">⚙️</span>
      </button>
    </div>
  );
}