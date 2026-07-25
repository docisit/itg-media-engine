'use client';

import { useState } from 'react';

export default function Controls() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const toggleBroadcast = () => {
    setIsBroadcasting(!isBroadcasting);
    // In a real implementation, this would start/stop the WebRTC connection
    console.log(isBroadcasting ? 'Stopping broadcast' : 'Starting broadcast');
  };

  const toggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
    // In a real implementation, this would mute/unmute the audio track
    console.log(isAudioMuted ? 'Unmuting audio' : 'Muting audio');
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    // In a real implementation, this would enable/disable the video track
    console.log(isVideoEnabled ? 'Disabling video' : 'Enabling video');
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // In a real implementation, this would start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setIsScreenSharing(true);
        console.log('Screen sharing started');
        
        // Handle stream cleanup when sharing stops
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          console.log('Screen sharing stopped');
        };
      } catch (error) {
        console.error('Error starting screen share:', error);
      }
    } else {
      setIsScreenSharing(false);
      console.log('Screen sharing stopped');
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real implementation, this would start/stop recording
    console.log(isRecording ? 'Stopping recording' : 'Starting recording');
  };

  const openSettings = () => {
    // In a real implementation, this would open a settings modal
    console.log('Opening settings');
  };

  const requestHelp = () => {
    // In a real implementation, this would open a help modal or chat
    console.log('Requesting help');
  };

  return (
    <div className="space-y-6">
      {/* Main Broadcast Control */}
      <div className="text-center">
        <button
          onClick={toggleBroadcast}
          className={`px-8 py-4 rounded-xl font-black text-lg transition-all transform hover:scale-105 ${isBroadcasting ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-black'}`}
        >
          {isBroadcasting ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span>STOP BROADCAST</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-black rounded-full"></div>
              <span>START BROADCAST</span>
            </div>
          )}
        </button>
        <p className="text-zinc-500 text-sm mt-2">
          {isBroadcasting ? 'Live to Broadcast_Studio_A1' : 'Ready to connect'}
        </p>
      </div>

      {/* Quick Controls Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Audio Control */}
        <button
          onClick={toggleAudio}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isAudioMuted ? 'bg-red-900/30 border-red-700/50 text-red-400' : 'bg-green-900/30 border-green-700/50 text-green-400'}`}
        >
          <span className="text-2xl mb-2">{isAudioMuted ? '🔇' : '🎤'}</span>
          <span className="text-sm font-bold uppercase">{isAudioMuted ? 'Muted' : 'Mic On'}</span>
        </button>

        {/* Video Control */}
        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isVideoEnabled ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-red-900/30 border-red-700/50 text-red-400'}`}
        >
          <span className="text-2xl mb-2">{isVideoEnabled ? '📹' : '📵'}</span>
          <span className="text-sm font-bold uppercase">{isVideoEnabled ? 'Camera On' : 'Camera Off'}</span>
        </button>

        {/* Screen Share Control */}
        <button
          onClick={toggleScreenShare}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isScreenSharing ? 'bg-purple-900/30 border-purple-700/50 text-purple-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
        >
          <span className="text-2xl mb-2">🖥️</span>
          <span className="text-sm font-bold uppercase">{isScreenSharing ? 'Sharing' : 'Share Screen'}</span>
        </button>

        {/* Recording Control */}
        <button
          onClick={toggleRecording}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isRecording ? 'bg-red-900/30 border-red-700/50 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
        >
          <span className="text-2xl mb-2">⏺️</span>
          <span className="text-sm font-bold uppercase">{isRecording ? 'Recording' : 'Record'}</span>
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={openSettings}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors"
        >
          <span>⚙️</span>
          <span className="text-sm font-medium">Settings</span>
        </button>

        <button
          onClick={requestHelp}
          className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 hover:bg-amber-800/40 text-amber-400 rounded-lg border border-amber-700/50 transition-colors"
        >
          <span>❓</span>
          <span className="text-sm font-medium">Help</span>
        </button>

        <button
          onClick={() => window.open('https://yourdomain.com/api/webrtc/diagnostics/', '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 rounded-lg border border-blue-700/50 transition-colors"
        >
          <span>🔧</span>
          <span className="text-sm font-medium">Diagnostics</span>
        </button>

        <button
          onClick={() => window.open('https://yourdomain.com/api/webrtc/speedtest/', '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 rounded-lg border border-purple-700/50 transition-colors"
        >
          <span>📊</span>
          <span className="text-sm font-medium">Speed Test</span>
        </button>
      </div>

      {/* Status Bar */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></div>
            <span className="text-sm text-zinc-400">
              {isBroadcasting ? 'Broadcasting live' : 'Standby mode'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
              <span className="text-xs text-cyan-400">TURN: Active</span>
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-green-500"></div>
              <span className="text-xs text-green-400">WebRTC: Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}