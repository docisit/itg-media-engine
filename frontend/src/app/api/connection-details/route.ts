import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkAndSetSession, deleteSession } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    
    const roomName = request.nextUrl.searchParams.get('roomName') || 'Broadcast_Studio_A1';
    const participantName = request.nextUrl.searchParams.get('participantName') || 'Anonymous';
    const requestedRole = request.nextUrl.searchParams.get('role') || 'guest'; // 'host', 'guest', or 'observer'
    
    // Determine role and permissions
    let isHost = false;
    let isObserver = false;
    let finalParticipantName = participantName;
    
    if (requestedRole === 'host') {
      if (!session) {
        return NextResponse.json(
          { error: 'Authentication required for host role' },
          { status: 401 }
        );
      }
      
      const user = session.user as { is_staff?: boolean; name?: string };
      if (!user.is_staff) {
        return NextResponse.json(
          { error: 'Staff privileges required for host role' },
          { status: 403 }
        );
      }
      
      isHost = true;
      // Use authenticated user's name if available
      if (user.name && participantName === 'Anonymous') {
        finalParticipantName = user.name;
      }
    } else if (requestedRole === 'observer') {
      isObserver = true;
    }
    // For 'guest' role, both isHost and isObserver remain false

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json(
        { error: 'LiveKit configuration incomplete' },
        { status: 500 }
      );
    }

    // Generate participant identity and session ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const participantIdentity = isHost 
      ? `host_${timestamp}_${random}`
      : isObserver
        ? `observer_${timestamp}_${random}`
        : `guest_${timestamp}_${random}`;
    
    // Generate session ID for tracking
    const sessionId = `sess_${timestamp}_${random}`;
    
    // Determine user ID for session tracking
    // For authenticated users, use their ID or email
    // For guests, use a combination of name and IP (simplified)
    let userId: string;
    if (session?.user) {
      const user = session.user as { id?: string; email?: string; name?: string };
      userId = user.id || user.email || user.name || `user_${timestamp}`;
    } else {
      // For anonymous guests, create a unique but consistent ID
      // In production, you might want to use IP + user agent hash
      userId = `guest_${participantName.replace(/\s+/g, '_').toLowerCase()}_${timestamp}`;
    }
    
    // TEMPORARILY DISABLE ALL SESSION CHECKING FOR LIVE SHOW
    // This allows guests to connect without "already connected" errors
    // Session checking will be restored after the live show
    if (isHost) {
      // Only check sessions for hosts (staff)
      const roleForSession = 'host';
      const sessionCheck = await checkAndSetSession(userId, roomName, sessionId, roleForSession, 600);
      
      if (!sessionCheck.allowed) {
        return NextResponse.json(
          { 
            error: `You already have an active ${roleForSession} connection to this room`,
            existingSessionId: sessionCheck.existingSessionId,
            code: 'DUPLICATE_SESSION'
          },
          { status: 409 }
        );
      }
    }
    // For guests and observers, skip session checking entirely

    // Create token with appropriate permissions
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: finalParticipantName,
      ttl: '2h',
    });

    // Set permissions based on role
    const canPublish = !isObserver;  // Guests and hosts can publish, observers cannot
    const canPublishData = !isObserver;  // Guests and hosts can publish data
    const canSubscribe = true;  // Everyone can subscribe
    const roomAdmin = isHost;  // Only hosts have admin privileges
    
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: canPublish,
      canPublishData: canPublishData,
      canSubscribe: canSubscribe,
      canUpdateOwnMetadata: true,
      roomAdmin: roomAdmin,
      roomRecord: false,
      hidden: false,
      recorder: false,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      serverUrl,
      roomName,
      participantToken: token,
      participantName,
      participantIdentity,
      participantRole: isHost ? 'host' : (isObserver ? 'observer' : 'guest'),
      permissions: {
        canPublish: canPublish,
        canSubscribe: canSubscribe,
        canPublishData: canPublishData,
        roomAdmin: roomAdmin,
      },
    });

  } catch (error) {
    console.error('Error in connection-details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
