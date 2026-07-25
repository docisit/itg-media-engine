// app/api/webrtc/rooms/[roomName]/participants/[participantIdentity]/kick/route.ts
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

    // Call LiveKit API to kick participant
    const livekit = new LiveKitAPI();
    const result = await livekit.kickParticipant(roomName, participantIdentity);

    return NextResponse.json({
      status: 'success',
      message: `Participant ${participantIdentity} kicked from room`,
      result
    });
  } catch (error) {
    console.error('Error kicking participant:', error);
    return NextResponse.json(
      { error: 'Failed to kick participant', details: String(error) },
      { status: 500 }
    );
  }
}
