'use client';

import React from 'react';
import {
  MediaDeviceMenu,
  TrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

export function MicrophoneSettings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <section className="lk-button-group">
        <TrackToggle source={Track.Source.Microphone}>Microphone</TrackToggle>
        <div className="lk-button-group-menu">
          <MediaDeviceMenu kind="audioinput" />
        </div>
      </section>
    </div>
  );
}
