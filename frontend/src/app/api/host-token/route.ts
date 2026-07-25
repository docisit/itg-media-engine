import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const roomName = request.nextUrl.searchParams.get('roomName');
    const hostName = request.nextUrl.searchParams.get('hostName') || 'Host';

    if (!roomName) {
      return NextResponse.json(
        { error: 'Missing roomName parameter' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json(
        { error: 'LiveKit configuration incomplete' },
        { status: 500 }
      );
    }

    const participantIdentity = `host_${Date.now()}`;

    // Create HOST token with admin powers
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: hostName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
      roomAdmin: true,  
      roomRecord: true,
      roomList: true,
      roomCreate: true,
      hidden: false,
      recorder: false,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      serverUrl,
      roomName,
      participantToken: token,
      participantName: hostName,
      participantRole: 'host',
    });

  } catch (error) {
    console.error('Error in host-token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}