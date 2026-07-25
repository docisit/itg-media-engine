import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Connection Check API Route
 * Used by Director Control page to verify LiveKit connectivity
 * Returns LiveKit URL configuration status
 */
export async function GET() {
  try {
    // Optional auth check - non-critical
    const session = await getServerSession(authOptions);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    return NextResponse.json({
      livekit_url: livekitUrl,
      livekit_configured: Boolean(apiKey && apiSecret),
      status: 'Online',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message || 'Connection check failed',
      livekit_configured: false,
    }, { status: 500 });
  }
}
