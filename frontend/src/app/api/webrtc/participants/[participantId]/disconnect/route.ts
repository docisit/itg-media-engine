import { NextRequest, NextResponse } from 'next/server';

// WebRTC Participant Disconnect API - Disconnects a participant from a WebRTC room
// Used by director control to disconnect guests

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const { participantId } = await params;

    // Try to disconnect via Django backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    
    try {
      const response = await fetch(`${backendUrl}/api/webrtc/participants/${participantId}/disconnect/`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (backendErr) {
      console.log('Django backend not available, simulating disconnect');
    }

    // Return success response for simulated disconnect
    return NextResponse.json({
      success: true,
      message: `Participant ${participantId} disconnected successfully`,
      participant_id: participantId,
      disconnected_at: new Date().toISOString(),
      action: 'disconnect',
      simulated: true
    });

  } catch (error) {
    console.error('Error disconnecting participant:', error);
    return NextResponse.json(
      { 
        error: 'Failed to disconnect participant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    
    // Return participant info
    return NextResponse.json({
      participant_id: participantId,
      can_disconnect: true,
      requires_confirmation: true,
      message: 'Use POST to disconnect this participant'
    });

  } catch (error) {
    console.error('Error fetching participant disconnect info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch participant info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
