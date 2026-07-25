'use client';

import React, { useState, useCallback } from 'react';
import { TrackToggle, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import styles from '../../../styles/GuestBottomBar.module.css';

interface GuestBottomBarProps {
  onOpenSettings: () => void;
}

export default function GuestBottomBar({ onOpenSettings }: GuestBottomBarProps) {
  const room = useRoomContext();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const stopScreenShare = useCallback(() => {
    setIsScreenSharing(false);
    console.log('🖥️ Screen sharing stopped');
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Publish the screen share track
        await room.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.ScreenShare,
        });

        setIsScreenSharing(true);

        // Listen for user stopping sharing via browser UI
        videoTrack.onended = () => {
          stopScreenShare();
        };

        console.log('✅ Screen sharing started');
      } catch (error) {
        console.error('❌ Error starting screen share:', error);
      }
    } else {
      stopScreenShare();
    }
  }, [isScreenSharing, room, stopScreenShare]);

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        {/* Camera Toggle */}
        <div className={styles.controlItem}>
          <TrackToggle
            source={Track.Source.Camera}
            className={styles.trackToggle}
          >
            <span className={styles.icon}>📹</span>
          </TrackToggle>
          <span className={styles.label}>Camera</span>
        </div>

        {/* Microphone Toggle */}
        <div className={styles.controlItem}>
          <TrackToggle
            source={Track.Source.Microphone}
            className={styles.trackToggle}
          >
            <span className={styles.icon}>🎤</span>
          </TrackToggle>
          <span className={styles.label}>Mic</span>
        </div>

        {/* Screen Share Toggle */}
        <div className={styles.controlItem}>
          <button
            onClick={toggleScreenShare}
            className={`${styles.trackToggle} ${isScreenSharing ? styles.screenSharingActive : ''}`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
          >
            <span className={styles.icon}>🖥️</span>
          </button>
          <span className={styles.label}>{isScreenSharing ? 'Sharing' : 'Screen'}</span>
        </div>

        {/* Settings Button */}
        <div className={styles.controlItem}>
          <button
            onClick={onOpenSettings}
            className={`${styles.trackToggle} ${styles.settingsBtn}`}
            title="Settings"
          >
            <span className={styles.icon}>⚙️</span>
          </button>
          <span className={styles.label}>Settings</span>
        </div>
      </div>
    </div>
  );
}
