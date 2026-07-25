import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LiveKitAPI } from '@/lib/livekit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const roomName = searchParams.get('roomName') || 'Broadcast_Studio_A1';
    const userName = searchParams.get('participantName') || session.user.name || 'Viewer';

    // Generate a viewer identity
    const identity = `viewer_${session.user.email?.replace(/[^a-zA-Z0-9]/g, '_') || Math.random().toString(36).slice(2, 10)}`;

    // Get LiveKit connection details with audio-only, muted-by-default permission
    const livekit = new LiveKitAPI();
    const { participantToken, serverUrl } = await livekit.generateViewerToken(
      roomName,
      identity,
      userName
    );

    return NextResponse.json({
      status: 'success',
      participantToken,
      serverUrl,
      roomName,
      identity,
      userName,
    });
  } catch (error) {
    console.error('Error generating viewer token:', error);
    return NextResponse.json(
      { error: 'Failed to generate viewer token', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST supports raising/lowering hand metadata updates
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, roomName, viewerIdentity } = body;

    if (!action || !roomName || !viewerIdentity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const livekit = new LiveKitAPI();
    const participants = await livekit.getParticipants(roomName);
    const viewer = participants.find(p => p.identity === viewerIdentity);

    if (!viewer) {
      return NextResponse.json({ error: 'Viewer not found in room' }, { status: 404 });
    }

    if (action === 'raise_hand') {
      // Update viewer metadata to indicate raised hand
      // Note: This is handled client-side by the viewer updating their own metadata
      return NextResponse.json({
        status: 'success',
        message: 'Hand raised',
      });
    }

    if (action === 'lower_hand') {
      return NextResponse.json({
        status: 'success',
        message: 'Hand lowered',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in viewer action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
