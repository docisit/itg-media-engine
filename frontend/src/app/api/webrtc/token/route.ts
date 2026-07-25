import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log(">>> TOKEN_ROUTE_STARTED");

  try {
    const body = await request.json().catch(() => ({}));
    
    // Fallback for the Backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    console.log(`>>> PROXYING_TO_BACKEND: ${backendUrl}/api/webrtc/token/`);
    console.log(`>>> REQUEST_BODY:`, JSON.stringify(body));

    const response = await fetch(`${backendUrl}/api/webrtc/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionid=${(await cookies()).get('sessionid')?.value}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(">>> BACKEND_ERROR_RAW:", errorData);
      return NextResponse.json({ error: "Backend error" }, { status: response.status });
    }

    const data = await response.json();
    console.log(">>> BACKEND_RESPONSE:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error(">>> ROUTE_CRASHED:", err);
    return NextResponse.json({ error: "Internal Crash" }, { status: 500 });
  }
}