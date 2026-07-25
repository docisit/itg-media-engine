import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomName: string }> }
) {
  // CRITICAL: Log this first to see if the route even triggers
  console.log(">>> JOIN_TOKEN_ROUTE_STARTED");

  try {
    // 1. Await EVERYTHING individually
    const params = await context.params;
    const roomName = params?.roomName;
    const cookieStore = await cookies();
    
    console.log(`>>> PROCESSING_ROOM: ${roomName}`);

    const body = await request.json().catch(() => ({}));
    
    // 2. Fallback for the Backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${backendUrl}/api/webrtc/rooms/${roomName}/join_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionid=${cookieStore.get('sessionid')?.value}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
       const errorData = await response.text();
       console.error(">>> BACKEND_ERROR_RAW:", errorData);
       return NextResponse.json({ error: "Backend error" }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (err) {
    console.error(">>> ROUTE_CRASHED:", err);
    return NextResponse.json({ error: "Internal Crash" }, { status: 500 });
  }
}
