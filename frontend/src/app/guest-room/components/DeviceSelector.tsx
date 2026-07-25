'use client';

import { useState, useEffect } from 'react';
import { MediaDevice } from '../types/webrtc-types';

export default function DeviceSelector() {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load available devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        // Get all devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        
        const mediaDevices: MediaDevice[] = deviceList.map(device => ({
          deviceId: device.deviceId,
          kind: device.kind as 'audioinput' | 'audiooutput' | 'videoinput',
          label: device.label || `Unknown ${device.kind}`,
          groupId: device.groupId
        }));

        setDevices(mediaDevices);
        
        // Filter by type
        const audioIns = mediaDevices.filter(d => d.kind === 'audioinput');
        const videoIns = mediaDevices.filter(d => d.kind === 'videoinput');
        
        setAudioInputs(audioIns);
        setVideoInputs(videoIns);
        
        // Set default selections
        if (audioIns.length > 0 && !selectedAudio) {
          setSelectedAudio(audioIns[0].deviceId);
        }
        if (videoIns.length > 0 && !selectedVideo) {
          setSelectedVideo(videoIns[0].deviceId);
        }
        
      } catch (error) {
        console.error('Error loading devices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, []);

  const handleAudioChange = (deviceId: string) => {
    setSelectedAudio(deviceId);
    // In a real implementation, this would switch the audio track
    console.log('Switching to audio device:', deviceId);
  };

  const handleVideoChange = (deviceId: string) => {
    setSelectedVideo(deviceId);
    // In a real implementation, this would switch the video track
    console.log('Switching to video device:', deviceId);
  };

  const refreshDevices = async () => {
    setIsLoading(true);
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      
      const mediaDevices: MediaDevice[] = deviceList.map(device => ({
        deviceId: device.deviceId,
        kind: device.kind as 'audioinput' | 'audiooutput' | 'videoinput',
        label: device.label || `Unknown ${device.kind}`,
        groupId: device.groupId
      }));

      setDevices(mediaDevices);
      setAudioInputs(mediaDevices.filter(d => d.kind === 'audioinput'));
      setVideoInputs(mediaDevices.filter(d => d.kind === 'videoinput'));
    } catch (error) {
      console.error('Error refreshing devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-zinc-300">Devices</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
        <p className="text-zinc-500 text-sm">Loading available devices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audio Input Selection */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-zinc-300">Microphone</label>
          <span className="text-xs text-zinc-500">
            {audioInputs.length} available
          </span>
        </div>
        
        {audioInputs.length === 0 ? (
          <p className="text-red-400 text-sm">No microphones detected</p>
        ) : (
          <select
            value={selectedAudio}
            onChange={(e) => handleAudioChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            {audioInputs.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Video Input Selection */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-zinc-300">Camera</label>
          <span className="text-xs text-zinc-500">
            {videoInputs.length} available
          </span>
        </div>
        
        {videoInputs.length === 0 ? (
          <p className="text-red-400 text-sm">No cameras detected</p>
        ) : (
          <select
            value={selectedVideo}
            onChange={(e) => handleVideoChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            {videoInputs.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Device Info */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-zinc-500">Total devices:</span>
          <span className="text-xs font-mono text-cyan-400">{devices.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-zinc-500">Permissions:</span>
          <span className="text-xs font-mono text-green-400">Granted ✓</span>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={refreshDevices}
        disabled={isLoading}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-2 px-4 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Refreshing...' : 'Refresh Devices'}
      </button>
    </div>
  );
}