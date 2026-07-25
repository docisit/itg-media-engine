'use client';

import React from 'react';
import {
  MediaDeviceMenu,
  TrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

export function CameraSettings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <section className="lk-button-group">
        <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
        <div className="lk-button-group-menu">
          <MediaDeviceMenu kind="videoinput" />
        </div>
      </section>
    </div>
  );
}