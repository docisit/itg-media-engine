'use client';
import * as React from 'react';
import { Track } from 'livekit-client';
import {
  MediaDeviceMenu,
  useRoomContext,
} from '@livekit/components-react';
import styles from '../../../styles/SettingsMenu.module.css';
import { CameraSettings } from './CameraSettings';
import { MicrophoneSettings } from './MicrophoneSettings';

/**
 * @alpha
 */
export interface SettingsMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
}

/**
 * @alpha
 */
export function SettingsMenu({ onClose, ...props }: SettingsMenuProps) {
  const room = useRoomContext();
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const screenShareVideoTrackRef = React.useRef<MediaStreamTrack | null>(null);

  const stopScreenShare = React.useCallback(() => {
    if (screenShareVideoTrackRef.current) {
      screenShareVideoTrackRef.current.stop();
      screenShareVideoTrackRef.current = null;
    }
    setIsScreenSharing(false);
    console.log('🖥️ Screen sharing stopped');
  }, []);

  const toggleScreenShare = React.useCallback(async () => {
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

        screenShareVideoTrackRef.current = videoTrack;
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
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} {...props}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Settings</span>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Media Devices Section */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Camera</div>
          <div className={styles.deviceGroup}>
            <CameraSettings />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Microphone</div>
          <div className={styles.deviceGroup}>
            <MicrophoneSettings />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Speaker & Headphones</div>
          <div className={styles.deviceGroup}>
            <div className={styles.deviceHeader}>
              <span className={styles.deviceIcon}>🔊</span>
              <span className={styles.deviceLabel}>Audio Output</span>
            </div>
            <MediaDeviceMenu kind="audiooutput" />
          </div>
        </div>

        {/* Screen Share Section */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Screen Share</div>
          <button
            onClick={toggleScreenShare}
            className={`${styles.screenShareBtn} ${isScreenSharing ? styles.screenShareBtnActive : ''}`}
          >
            <span className={styles.screenShareIcon}>🖥️</span>
            <span>{isScreenSharing ? 'Stop Sharing Screen' : 'Share Your Screen'}</span>
          </button>
          {isScreenSharing && (
            <p style={{ fontSize: 12, color: 'rgba(192, 132, 252, 0.7)', textAlign: 'center', marginTop: 8 }}>
              You are currently sharing your screen
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
