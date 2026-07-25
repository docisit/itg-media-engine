import { LocalAudioTrack, LocalVideoTrack, videoCodecs } from 'livekit-client';
import { VideoCodec } from 'livekit-client';

export interface SessionProps {
  roomName: string;
  identity: string;
  audioTrack?: LocalAudioTrack;
  videoTrack?: LocalVideoTrack;
  region?: string;
  turnServer?: RTCIceServer;
  forceRelay?: boolean;
}

export interface TokenResult {
  identity: string;
  accessToken: string;
}

export function isVideoCodec(codec: string): codec is VideoCodec {
  return videoCodecs.includes(codec as VideoCodec);
}

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// ─── Domain Types ───────────────────────────────────────────────

export interface Sport {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface SportAttribute {
  id: number;
  sport: number;
  sport_name: string;
  sport_slug: string;
  name: string;
  slug: string;
  unit: string;
  icon: string;
  description: string;
  is_measurable: boolean;
  benchmark_text: string;
  sort_order: number;
}

export interface MediaAsset {
  id: number;
  title: string;
  description: string;
  media_type: 'video' | 'highlight' | 'interview' | 'drill' | 'training' | 'receipt';
  sport: number | null;
  sport_name: string | null;
  tags: string;
  tags_list: string[];
  file: string;
  file_url: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  view_count: number;
  created_at: string;
  username: string;
  user_role: string | null;
  user_school: string | null;
  profile_image: string | null;
  like_count: number;
  user_has_liked: boolean;
  user_is_verified_coach: boolean;
  is_receipt?: boolean;
  receipt_label?: string;
}

export interface MediaTag {
  id: number;
  media: number;
  key: string;
  value: string;
}

export interface Drill {
  id: number;
  title: string;
  description: string;
  sport: number | null;
  sport_name: string | null;
  difficulty: string;
  difficulty_display: string;
  equipment: string;
  equipment_list: string[];
  duration_minutes: number;
  reps_sets: string;
  skills_focused: string;
  skills_list: string[];
  video: number | null;
  video_thumbnail: string | null;
  view_count: number;
  save_count: number;
  like_count: number;
  is_featured: boolean;
  creator: number;
  creator_name: string;
  creator_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  username: string;
  email?: string;
  role: string;
  bio: string;
  profile_image: string | null;
  hudl_link: string;
  maxpreps_link: string;
  twitter_x_link: string;
  graduation_year: number | null;
  position: string;
  school_name: string;
  state: string;
  sports: Sport[];
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  vertical_jump_in: number | null;
  forty_yard_time: number | null;
  max_bench_lbs: number | null;
  max_squat_lbs: number | null;
  max_power_clean_lbs: number | null;
  shuttle_time: number | null;
  gpa: number | null;
  bench_ratio: number | null;
  squat_ratio: number | null;
  power_clean_ratio: number | null;
  height_display: string | null;
  stat_trends: Record<string, 'up' | 'down' | 'flat' | 'new' | null>;
  is_active: boolean;
}

export interface LiveVerificationRequest {
  id: number;
  athlete: number;
  stat_label: string;
  notes: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}
