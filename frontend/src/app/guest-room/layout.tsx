import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broadcast Studio A1 - Guest Room | Don O\'Connor Media',
  description: 'Professional broadcast studio for guest interviews and live streaming. Connect to vdo.ninja with TURN server support.',
  keywords: ['broadcast', 'live streaming', 'vdo.ninja', 'WebRTC', 'TURN server', 'guest room', 'interview'],
};

export default function GuestRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="guest-room-layout">
      {children}
    </div>
  );
}