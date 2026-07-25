import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Director Control Center - Broadcast Studio A1 | Don O\'Connor Media',
  description: 'Director control panel for managing guest connections, monitoring room status, and generating guest links with TURN credentials.',
  keywords: ['director', 'control center', 'broadcast studio', 'WebRTC', 'guest management', 'TURN server', 'live streaming'],
};

export default function DirectorControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="director-control-layout">
      {children}
    </div>
  );
}