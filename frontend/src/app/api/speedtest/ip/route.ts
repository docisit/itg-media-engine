import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Get client IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  let ip = forwarded?.split(',')[0]?.trim() || 
            realIp || 
            cfConnectingIp || 
            request.headers.get('x-vercel-ip-source') ||
            '127.0.0.1';
  
  return NextResponse.json({ 
    ip, 
    timestamp: Date.now(),
    userAgent: request.headers.get('user-agent') || '',
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
