/**
 * Simple connection-details API route that generates LiveKit tokens directly
 * This is a fallback version that doesn't rely on Django backend
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

interface ConnectionDetails {
  serverUrl: string;
  roomName: string;
  participantToken: string;
  participantName: string;
}

/**
 * Base64 URL encode a string or buffer
 */
function base64UrlEncode(data: string | Buffer): string {
  if (typeof data === 'string') {
    data = Buffer.from(data);
  }
  return data
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Create a JWT token using HMAC SHA256
 */
function createJWT(payload: any, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret)
    .update(signatureInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);
  
  // Return full JWT
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Generate a LiveKit access token
 */
function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantName: string,
  participantIdentity: string,
  canPublish: boolean = true,
  canSubscribe: boolean = true,
  ttl: number = 3600 // 1 hour in seconds
): string {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + ttl;
  
  // Create grants object
  const grants = {
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: canPublish,
    canUpdateOwnMetadata: true,
    hidden: false,
    recorder: false,
  };
  
  // Create JWT payload
  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    exp: expires,
    nbf: now,
    name: participantName,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
    },
    grants,
  };
  
  return createJWT(payload, apiSecret);
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');

    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;
    const defaultRoomName = process.env.LIVEKIT_ROOM_NAME || 'Broadcast_Studio_A1';

    // Validate configuration
    if (!apiKey || !apiSecret || !serverUrl) {
      console.error('LiveKit configuration missing:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasServerUrl: !!serverUrl,
      });
      throw new Error('LiveKit configuration is incomplete. Check environment variables.');
    }

    // Generate participant identity
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const participantIdentity = `guest_${timestamp}_${random}`;

    // Generate token
    const token = generateLiveKitToken(
      apiKey,
      apiSecret,
      roomName,
      participantName,
      participantIdentity,
      true, // canPublish - guests can publish video
      true  // canSubscribe - guests can subscribe to others
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl,
      roomName,
      participantToken: token,
      participantName,
    };
    
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in simple connection-details API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return a helpful error response
    return new NextResponse(
      JSON.stringify({ 
        error: errorMessage,
        help: 'Check that LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL are set in .env.local'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}