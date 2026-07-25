import { RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Check authentication — supports both NextAuth session AND JWT Bearer token
    await requireStaff(request);

    const roomName = request.nextUrl.searchParams.get('roomName') || 'Broadcast_Studio_A1';
    
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json(
        { error: 'LiveKit configuration incomplete' },
        { status: 500 }
      );
    }

    // Create LiveKit RoomServiceClient
    const client = new RoomServiceClient(serverUrl, apiKey, apiSecret);

    try {
      // Get room participants
      const participants = await client.listParticipants(roomName);
      
      // Detect WHIP ingress host
      const whipIngressActive = participants.some(
        p => p.identity === 'whip_ingress_host' || 
             (p.name && p.name.toLowerCase().includes('whip')) ||
             (p.name && p.name.toLowerCase().includes('ingress'))
      );

      // Detect host (either 'host' identity or 'whip_ingress_host')
      const hostConnected = participants.some(
        p => p.identity === 'host' || p.identity === 'whip_ingress_host'
      );

      // Format participants data (simplified)
      const formattedParticipants = participants.map(participant => ({
        identity: participant.identity,
        name: participant.name || participant.identity,
        is_connected: true,
        joined_at: new Date().toLocaleTimeString(),
        has_video: false, // Simplified
        has_audio: false, // Simplified
        metadata: '{}',
        permissions: {
          can_publish: true,
          can_subscribe: true,
          can_publish_data: true,
          is_admin: false,
        }
      }));

      return NextResponse.json({
        success: true,
        room_id: roomName,
        name: 'Broadcast Studio A1',
        is_live: participants.length > 0,
        participant_count: participants.length,
        host_connected: hostConnected,
        whip_ingress_active: whipIngressActive,
        participants: formattedParticipants,
        last_updated: new Date().toISOString(),
      });

    } catch (livekitError) {
      // Room might not exist yet or no participants
      if (livekitError instanceof Error && livekitError.message.includes('not found')) {
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
      throw livekitError;
    }

  } catch (error) {
    console.error('Error in room-status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        room_id: request.nextUrl.searchParams.get('roomName') || 'Broadcast_Studio_A1',
        is_live: false,
        participant_count: 0,
        host_connected: false,
        participants: [],
      },
      { status: 500 }
    );
  }
}