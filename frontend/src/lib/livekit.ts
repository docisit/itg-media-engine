// lib/livekit.ts
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'http://127.0.0.1:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'your-livekit-api-key';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'your-livekit-api-secret';

export class LiveKitAPI {
  private roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );
  }

  async muteParticipant(roomName: string, participantIdentity: string, mute: boolean) {
    try {
      // 1. List participants to find the target participant and their tracks
      const participants = await this.roomService.listParticipants(roomName);
      const participant = participants.find(p => p.identity === participantIdentity);

      if (!participant) {
        console.warn(`Participant ${participantIdentity} not found in room ${roomName}`);
        return { success: false, reason: 'participant_not_found' };
      }

      // 2. Mute/unmute all audio tracks for this participant
      const audioTracks = participant.tracks.filter(t => t.type === 0); // type 0 = audio
      
      for (const track of audioTracks) {
        try {
          await this.roomService.mutePublishedTrack(
            roomName,
            participantIdentity,
            track.sid,
            mute
          );
          console.log(`✅ ${mute ? 'Muted' : 'Unmuted'} track ${track.sid} for ${participantIdentity}`);
        } catch (trackErr) {
          console.warn(`⚠️ Could not ${mute ? 'mute' : 'unmute'} track ${track.sid}:`, trackErr);
        }
      }

      // 3. Update participant permissions to prevent re-publishing when muted
      //    Setting canPublish: false stops the participant from sending new tracks
      //    This is a secondary measure - mutePublishedTrack handles the active track
      await this.roomService.updateParticipant(roomName, participantIdentity, {
        permission: {
          canPublish: !mute,           // Block re-publishing when muted
          canSubscribe: true,
          canPublishData: !mute,        // Block data (chat) when muted
          canPublishSources: mute ? [] : undefined, // Empty array = no sources allowed when muted
          hidden: false,
          recorder: false,
        },
      });

      console.log(`✅ Participant ${participantIdentity} ${mute ? 'muted' : 'unmuted'} successfully`);
      return { success: true, muted: mute, tracksMuted: audioTracks.length };
    } catch (error) {
      console.error('Error muting participant:', error);
      throw error;
    }
  }

  async kickParticipant(roomName: string, participantIdentity: string) {
    try {
      await this.roomService.removeParticipant(roomName, participantIdentity);
      console.log(`✅ Participant ${participantIdentity} kicked from room ${roomName}`);
      return { success: true, kicked: true };
    } catch (error) {
      console.error('Error kicking participant:', error);
      throw error;
    }
  }

  async getParticipants(roomName: string) {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants.map(p => ({
        identity: p.identity,
        name: p.name,
        is_connected: true,
        has_video: p.tracks.some(t => t.type === 1), // type 1 = video
        has_audio: p.tracks.some(t => t.type === 0), // type 0 = audio
        joined_at: p.joinedAt ? new Date(Number(p.joinedAt) / 1000000).toISOString() : '',
        metadata: (() => {
          try { return p.metadata ? JSON.parse(p.metadata) : {}; } 
          catch { return {}; }
        })(),
      }));
    } catch (error) {
      console.error('Error listing participants:', error);
      throw error;
    }
  }

  async isRoomActive(roomName: string): Promise<boolean> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants.length > 0;
    } catch {
      return false;
    }
  }

  async generateViewerToken(roomName: string, identity: string, userName: string) {
    // Generate a token with viewer permissions:
    // - Can publish audio only (mic)
    // - Can subscribe to all tracks
    // - No video publish
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: userName,
      metadata: JSON.stringify({
        role: 'viewer',
        raised_hand: false,
        status: 'waiting',
      }),
    });
    
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Restrict to audio only - don't add video publish source
      canPublishSources: [TrackSource.MICROPHONE],
      // Hide viewer from the main participant list used by egress composition
      hidden: false,
    });

    return {
      participantToken: await at.toJwt(),
      serverUrl: LIVEKIT_URL,
    };
  }
}
