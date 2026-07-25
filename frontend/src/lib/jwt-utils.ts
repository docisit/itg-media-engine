/**
 * Simple JWT utilities for LiveKit token generation
 * Uses Node.js built-in crypto module (no external dependencies)
 */

import { createHmac } from 'crypto';

export interface JWTHeader {
  alg: string;
  typ: string;
}

export interface JWTPayload {
  [key: string]: any;
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
export function createJWT(
  payload: JWTPayload,
  secret: string,
  header: JWTHeader = { alg: 'HS256', typ: 'JWT' }
): string {
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
export function generateLiveKitToken(
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

/**
 * Generate a random participant identity
 */
export function generateParticipantIdentity(prefix: string = 'guest'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Validate LiveKit configuration
 */
export function validateLiveKitConfig(): {
  isValid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  if (!process.env.LIVEKIT_API_KEY) {
    missing.push('LIVEKIT_API_KEY');
  }
  if (!process.env.LIVEKIT_API_SECRET) {
    missing.push('LIVEKIT_API_SECRET');
  }
  if (!process.env.LIVEKIT_URL) {
    missing.push('LIVEKIT_URL');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}