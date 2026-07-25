// app/components/SpeedTest.tsx
'use client';

import { useState, useCallback } from 'react';

interface SpeedTestResult {
  downloadSpeed: number | null;
  uploadSpeed: number | null;
  latency: number | null;
  duration: number;
  status: 'idle' | 'testing' | 'complete' | 'error';
}

interface SpeedTestProps {
  onClose: () => void;
}

export default function SpeedTest({ onClose }: SpeedTestProps) {
  const [result, setResult] = useState<SpeedTestResult>({
    downloadSpeed: null,
    uploadSpeed: null,
    latency: null,
    duration: 0,
    status: 'idle',
  });
  const [testPhase, setTestPhase] = useState<'latency' | 'download' | 'upload'>('latency');

  // Measure latency using your server
  const measureLatency = async (): Promise<number> => {
    const startTime = performance.now();
    try {
      await fetch('/api/speedtest-download?size=1024', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const endTime = performance.now();
      return endTime - startTime;
    } catch (error) {
      console.error('Latency test failed:', error);
      return -1;
    }
  };

  // Measure download speed using YOUR API endpoint (generates random data)
  const measureDownloadSpeed = async (): Promise<number> => {
    const testSizeMB = 5; // 5MB test
    const testSizeBytes = testSizeMB * 1024 * 1024;
    
    const startTime = performance.now();
    try {
      const response = await fetch(`/api/speedtest-download?size=${testSizeBytes}`, {
        cache: 'no-store',
      });
      const data = await response.blob();
      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const actualSizeMB = data.size / (1024 * 1024);
      const speedMbps = (actualSizeMB * 8) / durationSeconds;
      return speedMbps;
    } catch (error) {
      console.error('Download test failed:', error);
      return -1;
    }
  };

  // Measure upload speed using YOUR API endpoint
  const measureUploadSpeed = async (): Promise<number> => {
    const testSizeMB = 2; // 2MB upload test
    const testSizeBytes = testSizeMB * 1024 * 1024;
    
    // Create test payload of random data
    const payload = new Blob([new Uint8Array(testSizeBytes)]);
    
    const startTime = performance.now();
    try {
      const response = await fetch('/api/speedtest-upload', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const sizeMB = payload.size / (1024 * 1024);
      const speedMbps = (sizeMB * 8) / durationSeconds;
      return speedMbps;
    } catch (error) {
      console.error('Upload test failed:', error);
      return -1;
    }
  };

  const runSpeedTest = useCallback(async () => {
    setResult({ downloadSpeed: null, uploadSpeed: null, latency: null, duration: 0, status: 'testing' });
    
    const totalStartTime = performance.now();
    let latency = null;
    let downloadSpeed = null;
    let uploadSpeed = null;

    try {
      // 1. Test Latency
      setTestPhase('latency');
      latency = await measureLatency();
      if (latency === -1) throw new Error('Latency test failed');

      // 2. Test Download Speed
      setTestPhase('download');
      downloadSpeed = await measureDownloadSpeed();
      if (downloadSpeed === -1) throw new Error('Download test failed');

      // 3. Test Upload Speed
      setTestPhase('upload');
      uploadSpeed = await measureUploadSpeed();
      if (uploadSpeed === -1) throw new Error('Upload test failed');

      const totalEndTime = performance.now();
      const totalDuration = (totalEndTime - totalStartTime) / 1000;

      setResult({
        latency: Math.round(latency),
        downloadSpeed: parseFloat(downloadSpeed.toFixed(2)),
        uploadSpeed: parseFloat(uploadSpeed.toFixed(2)),
        duration: parseFloat(totalDuration.toFixed(2)),
        status: 'complete',
      });
    } catch (error) {
      console.error('Speed test error:', error);
      setResult(prev => ({ ...prev, status: 'error' }));
    }
  }, []);

  const getQualityColor = (value: number | null, type: 'speed' | 'latency') => {
    if (!value) return 'text-zinc-400';
    if (type === 'latency') {
      if (value < 50) return 'text-green-400';
      if (value < 100) return 'text-cyan-400';
      if (value < 200) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value >= 10) return 'text-green-400';
      if (value >= 5) return 'text-cyan-400';
      if (value >= 2) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getSpeedLabel = (speed: number | null) => {
    if (!speed) return 'Unknown';
    if (speed >= 10) return 'Excellent (4K)';
    if (speed >= 5) return 'Good (1080p)';
    if (speed >= 2) return 'Fair (720p)';
    return 'Poor (480p)';
  };

  const getLatencyLabel = (latency: number | null) => {
    if (!latency) return 'Unknown';
    if (latency < 50) return 'Excellent';
    if (latency < 100) return 'Good';
    if (latency < 200) return 'Fair';
    return 'Poor';
  };

  const getTestPhaseMessage = () => {
    switch (testPhase) {
      case 'latency': return 'Measuring connection latency...';
      case 'download': return 'Testing download speed...';
      case 'upload': return 'Testing upload speed...';
      default: return 'Running speed test...';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full mx-4 border border-zinc-800 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Network Speed Test</h2>
        <button 
          onClick={onClose} 
          className="text-zinc-400 hover:text-white text-2xl transition"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-5">
        {/* Test in Progress */}
        {result.status === 'testing' && (
          <div className="text-center p-6 bg-zinc-800/50 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cyan-400 font-medium">{getTestPhaseMessage()}</p>
              <p className="text-xs text-zinc-500">Please wait, this may take a few seconds...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result.status === 'complete' && (
          <>
            {/* Latency */}
            <div className="text-center p-3 bg-zinc-800/30 rounded-lg">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Latency (Ping)</div>
              <div className={`text-2xl font-bold ${getQualityColor(result.latency, 'latency')}`}>
                {result.latency} ms
              </div>
              <div className={`text-xs font-medium ${getQualityColor(result.latency, 'latency')}`}>
                {getLatencyLabel(result.latency)}
              </div>
            </div>

            {/* Download & Upload Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-zinc-800/30 rounded-lg">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Download</div>
                <div className={`text-xl font-bold ${getQualityColor(result.downloadSpeed, 'speed')}`}>
                  {result.downloadSpeed} Mbps
                </div>
                <div className={`text-xs font-medium ${getQualityColor(result.downloadSpeed, 'speed')}`}>
                  {getSpeedLabel(result.downloadSpeed)}
                </div>
              </div>

              <div className="text-center p-3 bg-zinc-800/30 rounded-lg">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Upload</div>
                <div className={`text-xl font-bold ${getQualityColor(result.uploadSpeed, 'speed')}`}>
                  {result.uploadSpeed} Mbps
                </div>
                <div className={`text-xs font-medium ${getQualityColor(result.uploadSpeed, 'speed')}`}>
                  {getSpeedLabel(result.uploadSpeed)}
                </div>
              </div>
            </div>
            
            <p className="text-xs text-zinc-500 text-center">
              Test completed in {result.duration} seconds
            </p>
          </>
        )}

        {/* Error State */}
        {result.status === 'error' && (
          <div className="text-center p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
            <p className="text-red-400 text-sm font-medium mb-1">Test Failed</p>
            <p className="text-xs text-red-400/80">
              Unable to complete speed test. Please check your connection and try again.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={runSpeedTest}
            disabled={result.status === 'testing'}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition transform hover:scale-[1.02]"
          >
            {result.status === 'testing' ? 'Testing...' : result.status === 'complete' ? 'Test Again' : 'Start Speed Test'}
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>

        {/* Info Text */}
        <div className="text-xs text-zinc-600 text-center space-y-1 pt-2 border-t border-zinc-800">
          <p>📊 Recommended speeds for streaming:</p>
          <p>• 10+ Mbps: 4K streaming</p>
          <p>• 5-10 Mbps: 1080p HD</p>
          <p>• 2-5 Mbps: 720p</p>
          <p>• Below 2 Mbps: May experience buffering</p>
        </div>
      </div>
    </div>
  );
}