// app/api/room-status/[roomName]/route.ts
// Queries LiveKit RoomServiceClient directly for Director Control page
// No longer proxies to Django (Django async LiveKit API fails on production)
import { RoomServiceClient, ParticipantInfo } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth-middleware';

// ---- Host ID matcher (must match director-control/page.tsx) ----
function isHostIdentity(identity: string): boolean {
  const lower = identity.toLowerCase();
  return (
    identity === 'whip_ingress_host' ||
    identity === 'host-user' ||
    identity === 'host' ||
    lower.includes('whip') ||
    lower.includes('ingress') ||
    lower === 'obs' ||
    (lower.includes('host') && !lower.includes('guest') && !lower.includes('viewer'))
  );
}

function isViewerIdentity(identity: string): boolean {
  return identity.toLowerCase().startsWith('viewer_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string }> }
) {
  try {
    // Check authentication — supports both NextAuth session AND JWT Bearer token
    await requireStaff(request);

    const { roomName } = await params;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({
        room_name: roomName,
        is_live: false,
        participant_count: 0,
        host_connected: false,
        whip_ingress_active: false,
        participants: [],
      });
    }

    // Convert wss:// to http:// for RoomServiceClient
    const serverUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const client = new RoomServiceClient(serverUrl, apiKey, apiSecret);

    try {
      // Get room participants
      const participants = await client.listParticipants(roomName);

      // Detect WHIP ingress host
      const whipIngressActive = participants.some(
        p => p.identity === 'whip_ingress_host' ||
             (p.name && (p.name.toLowerCase().includes('whip') || p.name.toLowerCase().includes('ingress')))
      );

      // Detect host
      const hostConnected = participants.some(p => isHostIdentity(p.identity));

      // Build full participant data with track info
      const participantsData = participants.map((p: ParticipantInfo) => {
        const metaObj = p.metadata ? tryParseJSON(p.metadata) : {};
        
        // Determine track info from participant's tracks array
        const hasVideo = p.tracks?.some(t => t.type === 1) || false; // 1 = VIDEO
        const hasAudio = p.tracks?.some(t => t.type === 0) || false; // 0 = AUDIO
        
        // Get track IDs
        const videoTrackId = p.tracks?.find(t => t.type === 1)?.sid || null;
        const audioTrackId = p.tracks?.find(t => t.type === 0)?.sid || null;

        return {
          identity: p.identity,
          name: p.name || p.identity,
          is_connected: true,
          joined_at: new Date().toLocaleTimeString(),
          has_video: hasVideo,
          has_audio: hasAudio,
          video_track_id: videoTrackId,
          audio_track_id: audioTrackId,
          metadata: p.metadata || '{}',
          raised_hand: metaObj?.raised_hand || false,
          status: metaObj?.status || (isViewerIdentity(p.identity) ? 'waiting' : 'live'),
        };
      });

      return NextResponse.json({
        success: true,
        room_id: roomName,
        name: 'Broadcast Studio A1',
        is_live: participants.length > 0,
        participant_count: participants.length,
        host_connected: hostConnected,
        whip_ingress_active: whipIngressActive,
        participants: participantsData,
        last_updated: new Date().toISOString(),
      });

    } catch (livekitError: any) {
      // Room might not exist yet or no participants
      if (livekitError.message && livekitError.message.includes('not found')) {
        return NextResponse.json({
          success: true,
          room_id: roomName,
          name: 'Broadcast Studio A1',
          is_live: false,
          participant_count: 0,
          host_connected: false,
          whip_ingress_active: false,
          participants: [],
          last_updated: new Date().toISOString(),
        });
      }
      
      // Log and return empty on error
      console.error('LiveKit listParticipants error:', livekitError);
      return NextResponse.json({
        success: false,
        error: livekitError.message || 'LiveKit error',
        room_id: roomName,
        is_live: false,
        participant_count: 0,
        host_connected: false,
        whip_ingress_active: false,
        participants: [],
        last_updated: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Error in room-status/[roomName]:', error);
    return NextResponse.json({
      room_name: params ? (await params).roomName : 'Broadcast_Studio_A1',
      is_live: false,
      participant_count: 0,
      host_connected: false,
      whip_ingress_active: false,
      participants: [],
    });
  }
}

function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
