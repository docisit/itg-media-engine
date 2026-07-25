import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string }> }
) {
  try {
    const { roomName } = await params;
    const body = await request.json();
    const guestName = body.guestName || 'Guest';

    // 1. Point to your NEW Django LiveKit endpoint on .59
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.yourdomain.com';
    
    const response = await fetch(`${backendUrl}/api/livekit/guest-token/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Use the new VIP Pass we just set up
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET}` 
      },
      body: JSON.stringify({
        room_name: roomName,
        participant_name: guestName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Django rejected the join: ${response.statusText}`);
    }

    const data = await response.json();

    // 2. Return the LiveKit Data
    // We send an empty ice_servers list so the SDK uses the Port 5349 bypass
    return NextResponse.json({
      success: true,
      token: data.token,
      url: data.url, // wss://vdo.yourdomain.com
      room_id: roomName,
      guest_name: guestName,
      ice_servers: [], // LiveKit handles this automatically
      web_rtc_link: `/guest-room/${roomName}?token=${data.token}`
    });

  } catch (error) {
    console.error('Green Room Join Error:', error);
    return NextResponse.json({ error: 'Failed to sync with LiveKit' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string }> }
) {
  const { roomName } = await params;
  return NextResponse.json({
    room_id: roomName,
    room_name: roomName,
    is_active: true,
    // LiveKit handles TURN on 5349 internally
    note: 'Signaling via vdo.yourdomain.com'
  });
}
