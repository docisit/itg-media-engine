import { NextRequest, NextResponse } from 'next/server';

// In-memory store for WebRTC connections and signals
const connections = new Map<string, {
  role: 'host' | 'guest';
  display_name: string;
  participant_id: string;
  roomId: string;
  lastSeen: number;
}>();

const rooms = new Map<string, {
  host: string | null;
  guest: string | null;
  lastActivity: number;
}>();

// Store for WebRTC signals (answers and ICE candidates)
const signals = new Map<string, Array<{
  signal_id: string;
  from_participant: string;
  to_participant: string;
  signal_type: 'offer' | 'answer' | 'candidate';
  payload: any;
  timestamp: number;
  delivered: boolean;
}>>();

// Generate unique participant ID
function generateParticipantId(): string {
  return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique signal ID
function generateSignalId(): string {
  return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Clean up old connections and signals
function cleanupConnections() {
  const now = Date.now();
  const connectionTimeout = 5 * 60 * 1000; // 5 minutes
  const signalTimeout = 2 * 60 * 1000; // 2 minutes
  
  // Clean up old connections
  for (const [participantId, connection] of connections.entries()) {
    if (now - connection.lastSeen > connectionTimeout) {
      connections.delete(participantId);
      
      // Remove from room
      const room = rooms.get(connection.roomId);
      if (room) {
        if (room.host === participantId) room.host = null;
        if (room.guest === participantId) room.guest = null;
        
        // Remove empty rooms
        if (!room.host && !room.guest) {
          rooms.delete(connection.roomId);
        }
      }
    }
  }
  
  // Clean up old signals
  for (const [participantId, signalList] of signals.entries()) {
    const freshSignals = signalList.filter(signal => 
      now - signal.timestamp < signalTimeout
    );
    
    if (freshSignals.length === 0) {
      signals.delete(participantId);
    } else {
      signals.set(participantId, freshSignals);
    }
  }
}

// Store a signal for a participant
function storeSignal(fromParticipant: string, toParticipant: string, signalType: string, payload: any) {
  const signalId = generateSignalId();
  const signal = {
    signal_id: signalId,
    from_participant: fromParticipant,
    to_participant: toParticipant,
    signal_type: signalType as 'offer' | 'answer' | 'candidate',
    payload,
    timestamp: Date.now(),
    delivered: false
  };
  
  // Get or create signal list for recipient
  let signalList = signals.get(toParticipant);
  if (!signalList) {
    signalList = [];
    signals.set(toParticipant, signalList);
  }
  
  signalList.push(signal);
  return signalId;
}

// Get undelivered signals for a participant
function getSignalsForParticipant(participantId: string) {
  const signalList = signals.get(participantId) || [];
  const undelivered = signalList.filter(signal => !signal.delivered);
  
  // Mark as delivered
  undelivered.forEach(signal => {
    signal.delivered = true;
  });
  
  return undelivered;
}

// WebSocket upgrade handler
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; role: string }> }
) {
  try {
    const { roomId, role } = await params;
    const body = await request.json();
    
    const { display_name = 'Anonymous' } = body;
    
    // Generate participant ID
    const participantId = generateParticipantId();
    
    // Initialize or get room
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        host: null,
        guest: null,
        lastActivity: Date.now()
      };
      rooms.set(roomId, room);
    }
    
    // Update room based on role
    if (role === 'host') {
      // Only one host per room
      if (room.host) {
        return NextResponse.json({
          error: 'Room already has a host',
          room_id: roomId
        }, { status: 409 });
      }
      room.host = participantId;
    } else if (role === 'guest') {
      // Only one guest at a time (your requirement)
      if (room.guest) {
        return NextResponse.json({
          error: 'Room already has a guest',
          room_id: roomId,
          current_guest: room.guest
        }, { status: 409 });
      }
      room.guest = participantId;
    }
    
    room.lastActivity = Date.now();
    
    // Store connection
    connections.set(participantId, {
      role: role as 'host' | 'guest',
      display_name,
      participant_id: participantId,
      roomId,
      lastSeen: Date.now()
    });
    
    // Return connection info
    return NextResponse.json({
      success: true,
      participant_id: participantId,
      display_name,
      role,
      room_id: roomId,
      connection_established: true,
      timestamp: Date.now(),
      room_status: {
        has_host: !!room.host,
        has_guest: !!room.guest,
        host_id: room.host,
        guest_id: room.guest
      },
      instructions: 'Use this participant_id for WebRTC signaling'
    });
    
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to establish connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle WebRTC signaling messages
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; role: string }> }
) {
  try {
    const { roomId, role } = await params;
    const body = await request.json();
    
    const { 
      participant_id,
      target_role,
      signal_type,
      payload 
    } = body;
    
    // Validate participant
    const connection = connections.get(participant_id);
    if (!connection || connection.roomId !== roomId) {
      return NextResponse.json(
        { error: 'Invalid participant or room' },
        { status: 404 }
      );
    }
    
    // Update last seen
    connection.lastSeen = Date.now();
    
    // Get room
    const room = rooms.get(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Find target participant
    let targetParticipantId: string | null = null;
    if (target_role === 'host') {
      targetParticipantId = room.host;
    } else if (target_role === 'guest') {
      targetParticipantId = room.guest;
    }
    
    if (!targetParticipantId) {
      return NextResponse.json(
        { error: `No ${target_role} connected to room` },
        { status: 404 }
      );
    }
    
    // Store the signal for the target participant
    const signalId = storeSignal(participant_id, targetParticipantId, signal_type, payload);
    
    // Update room activity
    room.lastActivity = Date.now();
    
    return NextResponse.json({
      success: true,
      message: 'Signal stored for delivery',
      signal_id: signalId,
      from_participant: participant_id,
      to_participant: targetParticipantId,
      signal_type,
      timestamp: Date.now(),
      delivery_status: 'stored'
    });
    
  } catch (error) {
    console.error('Error handling WebRTC signal:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process signal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get signals for a participant (polling endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; role: string }> }
) {
  try {
    const { roomId, role } = await params;
    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participant_id');
    const signalsOnly = searchParams.get('signals') === 'true';
    
    // Clean up old connections
    cleanupConnections();
    
    if (signalsOnly && participantId) {
      // Return signals for this participant
      const undeliveredSignals = getSignalsForParticipant(participantId);
      
      return NextResponse.json({
        success: true,
        participant_id: participantId,
        signals: undeliveredSignals,
        signal_count: undeliveredSignals.length,
        timestamp: Date.now()
      });
    }
    
    // Get room info
    const room = rooms.get(roomId) || {
      host: null,
      guest: null,
      lastActivity: Date.now()
    };
    
    // Return room status
    return NextResponse.json({
      room_id: roomId,
      role: role as 'host' | 'guest',
      room_status: {
        has_host: !!room.host,
        has_guest: !!room.guest,
        host_id: room.host,
        guest_id: room.guest,
        last_activity: room.lastActivity
      },
      connections_count: connections.size,
      message: 'WebSocket endpoint ready. Use WebSocket connection for real-time communication.'
    });
    
  } catch (error) {
    console.error('Error in WebSocket API:', error);
    return NextResponse.json(
      { 
        error: 'WebSocket API error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Disconnect participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; role: string }> }
) {
  try {
    const { roomId, role } = await params;
    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participant_id');
    
    if (!participantId) {
      return NextResponse.json(
        { error: 'participant_id required' },
        { status: 400 }
      );
    }
    
    // Remove connection
    const connection = connections.get(participantId);
    if (connection) {
      connections.delete(participantId);
      
      // Remove from room
      const room = rooms.get(roomId);
      if (room) {
        if (room.host === participantId) room.host = null;
        if (room.guest === participantId) room.guest = null;
        
        // Remove empty rooms
        if (!room.host && !room.guest) {
          rooms.delete(roomId);
        } else {
          room.lastActivity = Date.now();
        }
      }
      
      return NextResponse.json({
        success: true,
        participant_id: participantId,
        role: connection.role,
        disconnected: true,
        timestamp: Date.now(),
        message: 'Participant disconnected'
      });
    }
    
    return NextResponse.json(
      { error: 'Participant not found' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('Error disconnecting participant:', error);
    return NextResponse.json(
      { 
        error: 'Failed to disconnect',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}