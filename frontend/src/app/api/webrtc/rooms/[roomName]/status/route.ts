import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // 1. Add this import

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomName: string }> }
) {
  const { roomName } = await params;

  try {
    // 2. Grab the session cookie from the browser's request
    const cookieStore = await cookies();
    const sessionid = cookieStore.get('sessionid')?.value;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/webrtc/rooms/${roomName}/status/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 3. Pass the cookie to Django so it knows you are the Director
          ...(sessionid && { 'Cookie': `sessionid=${sessionid}` }),
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      // If it's still 401, Django is saying the session is invalid or not staff
      return NextResponse.json(
        { error: 'Backend rejected the request' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching room status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}