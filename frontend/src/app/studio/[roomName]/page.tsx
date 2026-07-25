'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';

export const dynamic = 'force-dynamic';

export default function HostStudioPage() {
  const params = useParams();
  const roomName = (params?.roomName as string) || 'Broadcast_Studio_A1';
  
  const [token, setToken] = useState<string>();
  const [serverUrl, setServerUrl] = useState<string>();
  const [obsDeviceId, setObsDeviceId] = useState<string>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [showSelector, setShowSelector] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [vbCableId, setVbCableId] = useState<string>();
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  
  // WHIP status tracking
  const [whipStatus, setWhipStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
  const [useWhipPrimary, setUseWhipPrimary] = useState(false);
  const [whipCheckDone, setWhipCheckDone] = useState(false);

  // Step 1: Request camera permission FIRST
const requestPermissions = async () => {
  try {
    // Request BOTH to unlock labels for camera AND mic
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => track.stop());
    setPermissionGranted(true);

    const deviceList = await navigator.mediaDevices.enumerateDevices();
    
    // Handle Video
    const videoInputs = deviceList.filter(d => d.kind === 'videoinput');
    setDevices(videoInputs);
    const obs = videoInputs.find(d => d.label.toLowerCase().includes('obs'));
    if (obs) setObsDeviceId(obs.deviceId);

    // Handle Audio + Fallback Logic
    const audioInputs = deviceList.filter(d => d.kind === 'audioinput');
    setAudioDevices(audioInputs);

    const vbCable = audioInputs.find(d => 
      d.label.toLowerCase().includes('vb-audio') || 
      d.label.toLowerCase().includes('cable output')
    );

    if (vbCable) {
      setVbCableId(vbCable.deviceId);
    } else if (audioInputs.length > 0) {
      // FALLBACK: Auto-select the first available mic if Cable isn't found
      setVbCableId(audioInputs[0].deviceId);
    }
  } catch (err) {
    console.error('Permission denied:', err);
  }
};

  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.log('=== ALL AUDIO INPUT DEVICES ===');
      audioInputs.forEach((d, i) => {
        console.log(`${i + 1}. Label: "${d.label}"`);
        console.log(`   DeviceId: ${d.deviceId}`);
      });
    };
    getDevices();
  }, []);

  useEffect(() => {
    requestPermissions();
  }, []);

  // Check if WHIP ingress is active in the room
  useEffect(() => {
    const checkWhipStatus = async () => {
      try {
        const res = await fetch(`/api/room-status/?roomName=${encodeURIComponent(roomName)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.whip_ingress_active) {
            setWhipStatus('active');
            setUseWhipPrimary(true);
          } else {
            setWhipStatus('inactive');
          }
        }
      } catch (err) {
        console.error('Failed to check WHIP status:', err);
        setWhipStatus('inactive');
      } finally {
        setWhipCheckDone(true);
      }
    };
    
    // Poll every 5 seconds to detect when WHIP connects
    const interval = setInterval(checkWhipStatus, 5000);
    checkWhipStatus(); // Initial check
    
    return () => clearInterval(interval);
  }, [roomName]);

  const handleSelectDevice = async (deviceId: string) => {
    setObsDeviceId(deviceId);
    setShowSelector(false);
    
    const res = await fetch(`/api/host-token?roomName=${encodeURIComponent(roomName)}&hostName=Host`);
    const data = await res.json();
    setToken(data.participantToken);
    setServerUrl(data.serverUrl);
  };

  if (!permissionGranted) {
    return (
      <div style={{ padding: 20, background: 'black', color: 'white', minHeight: '100vh' }}>
        <h3>Requesting Camera Access...</h3>
        <p>Please allow camera access when prompted.</p>
      </div>
    );
  }

if (showSelector) {
  return (
    <div style={{ padding: 20, background: 'black', color: 'white', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#06b6d4' }}>🎥 Studio Control</h1>
        <p style={{ marginBottom: '2rem', color: '#a1a1aa' }}>Select your OBS sources to start broadcasting</p>

        {/* WHIP Status Banner */}
        {whipCheckDone && whipStatus === 'active' && (
          <div style={{ 
            background: '#065f46', 
            border: '1px solid #10b981', 
            borderRadius: '0.75rem', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#10b981' }}>WHIP Ingress Active</div>
              <div style={{ fontSize: '0.875rem', color: '#a7f3d0' }}>
                OBS is connected via WHIP. VirtualCam will be used as fallback only.
              </div>
            </div>
          </div>
        )}

        {whipCheckDone && whipStatus === 'inactive' && (
          <div style={{ 
            background: '#1c1917', 
            border: '1px solid #292524', 
            borderRadius: '0.75rem', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>Waiting for WHIP Connection</div>
              <div style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>
                Connect OBS via WHIP (streaming-admin.tsx) or use VirtualCam below.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* LEFT COLUMN: Media Selection */}
          <div style={{ background: '#18181b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #27272a' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Step 1: Video & Audio</h3>
            
            {/* Video Dropdown */}
            <label style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Camera Source</label>
            <select 
              onChange={(e) => setObsDeviceId(e.target.value)} 
              style={{ padding: '0.75rem', marginTop: '0.25rem', marginBottom: '1rem', width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '0.5rem' }} 
              value={obsDeviceId || ''} 
            >
              <option value="">Choose camera...</option>
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${devices.indexOf(device) + 1}`}</option>
              ))}
            </select>

            {/* Audio Dropdown */}
            <label style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Audio Source (Virtual Cable)</label>
            <select 
              onChange={(e) => setVbCableId(e.target.value)} 
              style={{ padding: '0.75rem', marginTop: '0.25rem', width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '0.5rem' }} 
              value={vbCableId || ''} 
            >
              <option value="">Choose audio...</option>
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Mic ${audioDevices.indexOf(device) + 1}`}</option>
              ))}
            </select>

            {/* Start Button */}
            <button 
              onClick={() => handleSelectDevice(obsDeviceId || '')} 
              disabled={!obsDeviceId || !vbCableId}
              style={{ 
                padding: '0.75rem 1.5rem', 
                marginTop: '1.5rem', 
                width: '100%', 
                background: (obsDeviceId && vbCableId) ? '#06b6d4' : '#3f3f46', 
                color: 'black', 
                border: 'none', 
                borderRadius: '0.5rem', 
                fontWeight: 'bold', 
                cursor: (obsDeviceId && vbCableId) ? 'pointer' : 'not-allowed' 
              }} 
            >
              Start Broadcast
            </button>
          </div>

          {/* RIGHT COLUMN: Director Control */}
          <div style={{ background: '#18181b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #27272a' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>🎬 Director Control</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ background: '#27272a', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Room Name</div>
                <div style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{roomName}</div>
              </div>

              <div style={{ background: '#27272a', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Device Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: permissionGranted ? '#10b981' : '#ef4444' }}></div>
                    <span style={{ fontSize: '0.875rem' }}>Permissions Granted</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: vbCableId ? '#10b981' : '#f59e0b' }}></div>
                    <span style={{ fontSize: '0.875rem' }}>{vbCableId ? 'Audio Ready' : 'Audio Missing'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: whipStatus === 'active' ? '#10b981' : whipStatus === 'checking' ? '#f59e0b' : '#6b7280' }}></div>
                    <span style={{ fontSize: '0.875rem' }}>
                      {whipStatus === 'active' ? 'WHIP Connected' : whipStatus === 'checking' ? 'Checking WHIP...' : 'WHIP Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => window.open('/director-control', '_blank')} style={{ padding: '0.75rem 1.5rem', width: '100%', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }} >
              Open Director Panel
            </button>
          </div>
        </div>

        {/* BOTTOM: Instructions */}
        <div style={{ background: '#18181b', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #27272a', fontSize: '0.875rem', color: '#a1a1aa' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#06b6d4' }}>Setup Instructions:</div>
          <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
            <li>Start OBS Virtual Camera (Tools → Start Virtual Camera)</li>
            <li>In OBS Audio Mixer → Advanced Audio Properties → Set sources to "Monitor and Output"</li>
            <li>Select "OBS Virtual Camera" and "CABLE Output" above</li>
            <li>Click "Start Broadcast" to begin</li>
            <li style={{ color: '#10b981', marginTop: '0.5rem' }}>
              💡 <strong>WHIP Alternative:</strong> Use streaming-admin.tsx to generate a WHIP URL. 
              When WHIP is active, VirtualCam becomes a fallback.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={true}
      audio={true}
      options={{
		adaptiveStream: false,  
		dynacast: false,
		
        videoCaptureDefaults: {
          deviceId: obsDeviceId,
          resolution: { width: 1080, height: 1920 }
        },
        audioCaptureDefaults: {
		  deviceId: vbCableId,  
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        publishDefaults: {
          videoCodec: 'vp9' as const,
          videoEncoding: { 
            maxBitrate: 5000000,
            maxFramerate: 30,
          },
        }
      }}
    />
  );
}
