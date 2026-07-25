import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth-middleware';

/**
 * Egress API Route
 * Uses livekit-server-sdk's EgressClient and RoomServiceClient directly
 * Does NOT proxy to Django (Django async LiveKit API calls fail on production)
 *
 * Supported actions:
 *   - get_track_ids         : Fetches host participant track IDs from a room
 *   - status                : Checks for any active egress in a room
 *   - start_track_composite : Starts TrackCompositeEgress with RTMP output
 *   - stop                  : Stops all active egress in a room
 *   - start_record          : Starts TrackCompositeEgress with file output
 *   - stop_record           : Stops file-based egress only
 */

// Helper: Host identity detection
function isHostIdentity(identity: string, name?: string, metadata?: string): boolean {
  const lower = identity.toLowerCase();
  if (
    identity === 'whip_ingress_host' ||
    identity === 'host-user' ||
    identity === 'host' ||
    lower.includes('whip') ||
    lower.includes('ingress') ||
    lower === 'obs'
  ) return true;
  if (name && (name.toLowerCase().includes('whip') || name.toLowerCase().includes('ingress') || name.toLowerCase() === 'obs')) return true;
  if (metadata && metadata.toLowerCase().includes('host')) return true;
  return false;
}

export async function POST(request: NextRequest) {
  console.log('>>> EGRESS_API (standalone)');

  try {
    // Auth check — supports both NextAuth session AND JWT Bearer token
    await requireStaff(request);

    const body = await request.json().catch(() => ({}));
    const { action, room_name, encoding_preset } = body;

    if (!action || !room_name) {
      return NextResponse.json({ status: 'error', message: 'Missing action or room_name' }, { status: 400 });
    }

    const LiveKit = await import('livekit-server-sdk');
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const livekitUrl = process.env.LIVEKIT_URL!;
    const serverUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    const roomClient = new LiveKit.RoomServiceClient(serverUrl, apiKey, apiSecret);
    const egressClient = new LiveKit.EgressClient(serverUrl, apiKey, apiSecret);

    // Get preset
    const preset = encoding_preset === 'landscape'
      ? LiveKit.EncodingOptionsPreset.H264_1080P_30
      : LiveKit.EncodingOptionsPreset.PORTRAIT_H264_1080P_30;

    // ==============================================
    // Helper: Get track IDs from room
    // ==============================================
    async function getTrackIds() {
      const participants = await roomClient.listParticipants(room_name);
      let hostAudioId: string | null = null;
      let hostVideoId: string | null = null;
      let anyAudioId: string | null = null;
      let anyVideoId: string | null = null;

      for (const p of participants) {
        const isHost = isHostIdentity(p.identity, p.name, p.metadata);
        const tracks = (p as any).tracks || [];

        for (const track of tracks) {
          if (track.type === 0) {
            if (isHost) hostAudioId = track.sid;
            else if (!anyAudioId) anyAudioId = track.sid;
          } else if (track.type === 1) {
            if (isHost) hostVideoId = track.sid;
            else if (!anyVideoId) anyVideoId = track.sid;
          }
        }
      }

      return {
        audioId: hostAudioId || anyAudioId,
        videoId: hostVideoId || anyVideoId,
        hostAudioId,
        hostVideoId,
      };
    }

    // ==============================================
    // Action: get_track_ids
    // ==============================================
    if (action === 'get_track_ids') {
      try {
        const participants = await roomClient.listParticipants(room_name);

        let hostAudioId: string | null = null;
        let hostVideoId: string | null = null;
        let anyAudioId: string | null = null;
        let anyVideoId: string | null = null;

        for (const p of participants) {
          const isHost = isHostIdentity(p.identity, p.name, p.metadata);
          const tracks = (p as any).tracks || [];
          for (const track of tracks) {
            if (track.type === 0) {
              if (isHost) hostAudioId = track.sid;
              else if (!anyAudioId) anyAudioId = track.sid;
            } else if (track.type === 1) {
              if (isHost) hostVideoId = track.sid;
              else if (!anyVideoId) anyVideoId = track.sid;
            }
          }
        }

        const audioId = hostAudioId || anyAudioId;
        const videoId = hostVideoId || anyVideoId;

        return NextResponse.json({
          status: 'success',
          audio_track_id: audioId,
          video_track_id: videoId,
          participant_count: participants.length,
          host_audio_id: hostAudioId,
          host_video_id: hostVideoId,
        });
      } catch (err: any) {
        return NextResponse.json({
          status: 'error',
          message: err.message || 'Failed to get track IDs',
        }, { status: 500 });
      }
    }

    // ==============================================
    // Action: status — check for active egress
    // ==============================================
    if (action === 'status') {
      try {
        const egresses = await egressClient.listEgress({ roomName: room_name });
        const active = egresses.filter((e: any) => e.status === 1 || e.status === 2);
        let latestEgressId: string | null = null;
        let isRecording = false;

        for (const e of active) {
          if (e.egressId) {
            latestEgressId = e.egressId;
            // Check if it's a file egress (recording)
            if (e.fileResults && e.fileResults.length > 0) {
              isRecording = true;
            }
            break;
          }
        }

        return NextResponse.json({
          status: 'success',
          is_running: active.length > 0,
          is_recording: isRecording,
          egress_id: latestEgressId,
          active_count: active.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          status: 'error',
          message: err.message || 'Failed to check egress status',
        }, { status: 500 });
      }
    }

    // ==============================================
    // Action: start_track_composite — RTMP to social
    // ==============================================
    if (action === 'start_track_composite') {
      try {
        let audioTrackId = body.audio_track_id;
        let videoTrackId = body.video_track_id;

        if (!audioTrackId && !videoTrackId) {
          // Auto-detect track IDs
          const participants = await roomClient.listParticipants(room_name);
          for (const p of participants) {
            const tracks = (p as any).tracks || [];
            for (const t of tracks) {
              if (!videoTrackId && t.type === 1) videoTrackId = t.sid;
              if (!audioTrackId && t.type === 0) audioTrackId = t.sid;
            }
          }
        }

        if (!videoTrackId) {
          return NextResponse.json({
            status: 'error',
            message: 'No video track found. Make sure a host is streaming.',
          }, { status: 400 });
        }

        // Build RTMP output with all URLs
        const streamOutput = new LiveKit.StreamOutput({ protocol: 0 as any, urls: [] });
        const result = await egressClient.startTrackCompositeEgress(
          room_name,
          { stream: streamOutput },
          { audioTrackId: audioTrackId || undefined, videoTrackId, encodingOptions: preset }
        );

        return NextResponse.json({
          status: 'success',
          message: 'Track composite egress started',
          egress_id: result.egressId,
          audio_track_id: audioTrackId,
          video_track_id: videoTrackId,
        });
      } catch (err: any) {
        return NextResponse.json({
          status: 'error',
          message: err.message || 'Failed to start track composite',
        }, { status: 500 });
      }
    }

    // ==============================================
    // Action: stop — stop all egress for room
    // ==============================================
    if (action === 'stop') {
      try {
        const egresses = await egressClient.listEgress({ roomName: room_name });
        let stopped = 0;

        for (const e of egresses) {
          if (e.status === 1 && e.egressId) {
            await egressClient.stopEgress(e.egressId);
            stopped++;
          }
        }

        return NextResponse.json({
          status: 'success',
          message: stopped > 0 ? `Stopped ${stopped} egress` : 'No active egress to stop',
          stopped_count: stopped,
        });
      } catch (err: any) {
        return NextResponse.json({
          status: 'error',
          message: err.message || 'Failed to stop egress',
        }, { status: 500 });
      }
    }

    // ==============================================
    // Action: start_record — file recording
    // ==============================================
    if (action === 'start_record') {
      try {
        const ids = await getTrackIds();
        const audioTrackId = ids.audioId;
        const videoTrackId = ids.videoId;

        if (!videoTrackId) {
          return NextResponse.json({
            status: 'error',
            message: 'No video track found for recording.',
          }, { status: 400 });
        }

        const filepath = `recordings/${room_name}/${room_name}-{{time}}`;

        // Start track composite egress with file output
        const fileOutput = new LiveKit.EncodedFileOutput({ filepath, disableManifest: true });
        const result = await egressClient.startTrackCompositeEgress(
          room_name,
          fileOutput,
          { audioTrackId: audioTrackId || undefined, videoTrackId, encodingOptions: preset }
        );

        return NextResponse.json({
          status: 'success',
          message: 'Recording started successfully',
          egress_id: result.egressId,
          audio_track_id: audioTrackId,
          video_track_id: videoTrackId,
        });
      } catch (err: any) {
        return NextResponse.json({
          status: 'error',
          message: err.message || 'Failed to start recording',
        }, { status: 500 });
      }
    }

    // ==============================================
    // Action: stop_record — stop file-based egress only
    // ==============================================
    if (action === 'stop_record') {
      try {
        const egresses = await egressClient.listEgress({ roomName: room_name });
        let stopped = 0;

        for (const e of egresses) {
          if (e.status === 1 && e.egressId) {
            const hasFileOutput = e.fileResults && e.fileResults.length > 0;
            if (hasFileOutput) {
              await egressClient.stopEgress(e.egressId);
              stopped++;
            }
          }
        }

        return NextResponse.json({
          status: 'success',
          message: stopped > 0 ? 'Recording stopped' : 'No active recording found',
          stopped_count: stopped,
        });
      } catch (err: any) {
        return NextResponse.json({
          status: 'error',
          message: err.message || 'Failed to stop recording',
        }, { status: 500 });
      }
    }

    // Unknown action
    return NextResponse.json({
      status: 'error',
      message: `Unknown action: ${action}`,
    }, { status: 400 });

  } catch (err: any) {
    // If requireStaff threw a Response, return it directly
    if (err instanceof Response) {
      return err;
    }
    console.error('>>> EGRESS_CRASH:', err);
    return NextResponse.json({
      status: 'error',
      message: err.message || 'Internal server error',
    }, { status: 500 });
  }
}
