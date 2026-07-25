import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const getConfigs = () => {
  const secret = process.env.COTURN_SECRET;
  const turnUrl = process.env.TURN_SERVER_URL; // e.g. "turn:turn.example.com:3478"
  const ttlDefault = Number(process.env.TURN_CREDENTIAL_TTL_SECONDS || '3600'); // default 1 hour

  if (!secret) throw new Error('COTURN_SECRET is not defined (server-side env var required)');
  if (!turnUrl) throw new Error('TURN_SERVER_URL is not defined (server-side env var required)');

  return { secret, turnUrl, ttlDefault };
};

const sanitizeUserId = (raw?: string) => {
  const r = (raw || 'guest').toString();
  // allow alphanum, dot, underscore, dash; limit length to 64 chars
  return r.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64) || 'guest';
};

const makeCredential = (secret: string, userId: string, ttl: number) => {
  const expiry = Math.floor(Date.now() / 1000) + ttl;
  const username = `${expiry}:${userId}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  return { username, credential, expiry };
};

export async function GET(request: NextRequest) {
  try {
    const { secret, turnUrl, ttlDefault } = getConfigs();

    const search = request.nextUrl.searchParams;
    const rawUserId = search.get('userId') || undefined;
    const ttlParam = Number(search.get('ttl') || '') || ttlDefault;

    const userId = sanitizeUserId(rawUserId);
    const ttl = Math.max(60, Math.min(ttlParam, 86400)); // enforce 60s <= ttl <= 24h

    const { username, credential, expiry } = makeCredential(secret, userId, ttl);

    return NextResponse.json({
      success: true,
      urls: [turnUrl],
      username,
      credential,
      ttl,
      expiresAt: new Date(expiry * 1000).toISOString()
    });
  } catch (err) {
    console.error('[TURN_GEN_ERROR]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to generate TURN credentials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { secret, turnUrl, ttlDefault } = getConfigs();

    const body = await request.json().catch(() => ({}));
    const rawUserId = body?.userId || body?.id || undefined;
    const ttlParam = Number(body?.ttl || '') || ttlDefault;

    const userId = sanitizeUserId(rawUserId);
    const ttl = Math.max(60, Math.min(ttlParam, 86400));

    const { username, credential, expiry } = makeCredential(secret, userId, ttl);

    return NextResponse.json({
      success: true,
      urls: [turnUrl],
      username,
      credential,
      ttl,
      expiresAt: new Date(expiry * 1000).toISOString(),
      meta: { receivedBody: !!Object.keys(body).length }
    });
  } catch (err) {
    console.error('[TURN_GEN_ERROR]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to generate TURN credentials' }, { status: 500 });
  }
}