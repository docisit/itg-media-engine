import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const serverTime = Date.now();
  
  // Generate 1KB of random data to measure realistic transfer time
  const dataSize = 1024;
  const payload = new Uint8Array(dataSize);
  for (let i = 0; i < dataSize; i++) {
    payload[i] = Math.floor(Math.random() * 256);
  }
  
  return new NextResponse(JSON.stringify({
    serverTime,
    data: Array.from(payload),
    size: dataSize,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
