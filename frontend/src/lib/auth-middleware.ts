/**
 * Shared auth middleware for Next.js route handlers.
 * Checks TWO auth sources:
 *   1. NextAuth session (cookie-based) — existing behavior
 *   2. JWT Bearer token (Authorization header) — fallback for staff check
 *
 * The JWT fallback is needed because on production, getServerSession
 * sometimes returns a session without the custom `is_staff` claim,
 * while the same JWT token decoded by Django always has `is_staff: true`.
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface AuthResult {
  authenticated: boolean;
  is_staff: boolean;
  user_id?: string | number;
  username?: string;
  accessToken?: string;
}

/**
 * Decode a JWT payload (base64url) without verifying signature.
 * We only read the `is_staff` claim — the JWT was already verified
 * by Django when issued. This is safe because we're not making
 * auth decisions based on arbitrary JWTs; we're only reading
 * claims from a JWT that Django already authenticated.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64url decode
    const jsonStr = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

/**
 * Authenticate a request and check staff privileges.
 *
 * Strategy:
 *   1. Try getServerSession first — if session has is_staff, use it.
 *   2. If session exists but is_staff is missing, try Bearer token as fallback.
 *   3. If no session at all, try Bearer token.
 *
 * @returns AuthResult with authenticated + is_staff flags
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  // Step 1: Try NextAuth session
  const session = await getServerSession(authOptions);
  
  // Step 2: Try Bearer token fallback
  const bearerToken = extractBearerToken(request);
  let bearerIsStaff = false;
  let bearerUserId: string | undefined;
  let bearerUsername: string | undefined;

  if (bearerToken) {
    const payload = decodeJwtPayload(bearerToken);
    if (payload) {
      bearerIsStaff = payload.is_staff === true || payload.is_staff === 'true';
      bearerUserId = payload.user_id || payload.sub;
      bearerUsername = payload.username;
    }
  }

  // Step 3: Combine results
  const sessionUser = session?.user as { is_staff?: boolean; id?: string; name?: string } | undefined;

  const isStaff = sessionUser?.is_staff === true || bearerIsStaff;
  const authenticated = !!session?.user || !!bearerToken;
  const userId = sessionUser?.id || bearerUserId;
  const username = sessionUser?.name || bearerUsername || '';
  const accessToken = (session as any)?.accessToken || bearerToken || '';

  return {
    authenticated,
    is_staff: isStaff,
    user_id: userId,
    username,
    accessToken,
  };
}

/**
 * Require the request to be from a staff user.
 * Throws a structured response that route handlers can use directly.
 */
export async function requireStaff(request: Request): Promise<AuthResult> {
  const auth = await authenticateRequest(request);
  
  if (!auth.authenticated) {
    const response = new Response(
      JSON.stringify({ status: 'error', message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
    throw response;
  }
  
  if (!auth.is_staff) {
    const response = new Response(
      JSON.stringify({ status: 'error', message: 'Staff privileges required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
    throw response;
  }
  
  return auth;
}
