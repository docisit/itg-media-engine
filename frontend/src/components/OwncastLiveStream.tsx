'use client';

import { useState, useEffect } from 'react';

interface OwncastStreamStatus {
  isLive: boolean;
  viewerCount: number;
  title: string;
  thumbnail?: string;
  lastLiveTime?: string;
}

export default function OwncastLiveStream() {
  const [streamStatus, setStreamStatus] = useState<OwncastStreamStatus>({
    isLive: false,
    viewerCount: 0,
    title: 'Don O\'Connor Show',
  });
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Fetch Owncast stream status
  useEffect(() => {
    const fetchStreamStatus = async () => {
      try {
        // Owncast API endpoint for stream status
        const response = await fetch('https://live.yourdomain.com/api/status', {
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setStreamStatus({
            isLive: data.online,
            viewerCount: data.viewerCount || 0,
            title: data.streamTitle || 'Don O\'Connor Show',
            thumbnail: data.thumbnail?.url,
            lastLiveTime: data.lastConnectTime,
          });
        }
      } catch (error) {
        console.error('Error fetching Owncast status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamStatus();
    // Poll every 30 seconds for live status updates
    const interval = setInterval(fetchStreamStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // In a real implementation, this would connect to a backend service
    // to track followers and send notifications
    alert(isFollowing ? 'You have unfollowed the stream' : 'You are now following the stream!');
  };

  const handleNotifications = async () => {
    if (!notificationsEnabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        alert('Notifications enabled! You\'ll be notified when we go live.');
      }
    } else {
      setNotificationsEnabled(false);
      alert('Notifications disabled');
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-zinc-800 rounded mb-4"></div>
          <div className="h-10 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Stream Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Live Broadcast</h3>
            <p className="text-zinc-400 text-sm">Powered by Owncast</p>
          </div>
          <div className="flex items-center gap-2">
            {streamStatus.isLive && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-bold text-sm">LIVE</span>
                <span className="text-zinc-400 text-sm">
                  {formatViewerCount(streamStatus.viewerCount)} watching
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stream Embed */}
      <div className="relative">
        {streamStatus.isLive ? (
          <>
            {/* Owncast Player */}
            <div className="aspect-video bg-black">
              <iframe
                src="https://live.yourdomain.com/embed/video"
                className="w-full h-full border-0"
                title="Don O'Connor Live Stream"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
            
            {/* Stream Info Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 max-w-md">
                <h4 className="font-bold text-white text-sm">{streamStatus.title}</h4>
                <p className="text-zinc-300 text-xs">Live Now</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                    isFollowing 
                      ? 'bg-cyan-600 text-black hover:bg-cyan-500' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {isFollowing ? 'Following ✓' : 'Follow'}
                </button>
                <button
                  onClick={handleNotifications}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                    notificationsEnabled 
                      ? 'bg-purple-600 text-white hover:bg-purple-500' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {notificationsEnabled ? 'Notify ✓' : 'Notify'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Offline State */
          <div className="aspect-video bg-gradient-to-br from-zinc-900 to-black flex flex-col items-center justify-center p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📺</div>
              <h4 className="text-xl font-bold text-white mb-2">Stream Offline</h4>
              <p className="text-zinc-400 mb-6 max-w-md">
                The broadcast will return soon. Follow to get notified when we go live!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleFollow}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    isFollowing 
                      ? 'bg-cyan-600 text-black hover:bg-cyan-500' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {isFollowing ? 'Following ✓' : 'Follow Stream'}
                </button>
                <button
                  onClick={handleNotifications}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    notificationsEnabled 
                      ? 'bg-purple-600 text-white hover:bg-purple-500' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {notificationsEnabled ? 'Notify ✓' : 'Get Notified'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stream Actions */}
      <div className="p-6 border-t border-zinc-800">
        <div className="flex flex-wrap gap-4">
          <a
            href="https://live.yourdomain.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cyan-600 text-black px-6 py-3 rounded-lg font-bold hover:bg-cyan-500 transition"
          >
            <span>Watch Full Screen</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            href="https://live.yourdomain.com/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-zinc-700 text-white px-6 py-3 rounded-lg font-bold hover:border-cyan-500 hover:text-cyan-400 transition"
          >
            <span>Join Chat</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </a>
          <a
            href="https://live.yourdomain.com/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-amber-700 text-amber-400 px-6 py-3 rounded-lg font-bold hover:border-amber-500 hover:text-amber-300 transition"
          >
            <span>Admin Panel</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}