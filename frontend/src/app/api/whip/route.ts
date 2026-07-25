import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const sdpOffer = await req.text();
    const roomId = req.headers.get('x-room-id') || 'default-room';
    const authHeader = req.headers.get('authorization') ?? '';

    if (!sdpOffer) {
      return new NextResponse('Missing SDP offer', { status: 400 });
    }

    const backendResponse = await fetch(`http://127.0.0.1:8000/api/webrtc/whip/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': authHeader,
        'X-Room-ID': roomId,
      },
      body: sdpOffer,
    });

    const bodyText = await backendResponse.text();

    if (!backendResponse.ok) {
      console.error('Backend WHIP Error:', bodyText);
      return new NextResponse(bodyText || backendResponse.statusText, {
        status: backendResponse.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Use backend Location if provided
    const location = backendResponse.headers.get('Location') ?? `/api/whip/${roomId}`;

    return new NextResponse(bodyText, {
      status: 201,
      headers: {
        'Content-Type': 'application/sdp',
        'Location': location,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Location',
      },
    });

  } catch (error: any) {
    console.error('WHIP Route Critical Failure:', error);
    return new NextResponse(error?.message || 'Internal Server Error', { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-room-id',
    },
  });
}