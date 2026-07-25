// app/api/webrtc/rooms/[roomName]/participants/[participantIdentity]/mute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth-middleware';
import { LiveKitAPI } from '@/lib/livekit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string; participantIdentity: string }> }
) {
  try {
    // Check authentication — supports both NextAuth session AND JWT Bearer token
    await requireStaff(request);

    const { roomName, participantIdentity } = await params;
    const body = await request.json();
    const { mute } = body;

    // Call LiveKit API to mute participant
    const livekit = new LiveKitAPI();
    const result = await livekit.muteParticipant(roomName, participantIdentity, mute);

    return NextResponse.json({
      status: 'success',
      message: `Participant ${participantIdentity} ${mute ? 'muted' : 'unmuted'}`,
      result
    });
  } catch (error) {
    console.error('Error muting participant:', error);
    return NextResponse.json(
      { error: 'Failed to mute participant', details: String(error) },
      { status: 500 }
    );
  }
}
