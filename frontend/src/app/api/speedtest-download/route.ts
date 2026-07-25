import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get('size') || '5242880', 10); // default 5MB
  
  // Clamp size between 100KB and 50MB
  const clampedSize = Math.min(Math.max(size, 102400), 52428800);
  
  // Generate random data payload
  const chunkSize = 65536; // 64KB chunks
  const chunks: Uint8Array[] = [];
  let remaining = clampedSize;
  
  while (remaining > 0) {
    const currentChunk = Math.min(chunkSize, remaining);
    const chunk = new Uint8Array(currentChunk);
    for (let i = 0; i < currentChunk; i++) {
      chunk[i] = Math.floor(Math.random() * 256);
    }
    chunks.push(chunk);
    remaining -= currentChunk;
  }
  
  // Combine all chunks
  const totalSize = chunks.reduce((acc, c) => acc + c.length, 0);
  const buffer = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': totalSize.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
