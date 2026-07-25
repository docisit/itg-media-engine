import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://127.0.0.1:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string; participantIdentity: string }> }
) {
  try {
    // Await the params in Next.js 15+
    const { roomName, participantIdentity } = await params;
    const { status } = await request.json();

    if (!status || !['waiting', 'live'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "waiting" or "live"' },
        { status: 400 }
      );
    }

    // Call Django backend to update participant status
    const response = await fetch(
      `${DJANGO_API_URL}/api/webrtc/rooms/${encodeURIComponent(roomName)}/participants/${encodeURIComponent(participantIdentity)}/status/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      console.error('Django API error:', response.status, await response.text());
      return NextResponse.json(
        { error: 'Failed to update participant status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating participant status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
