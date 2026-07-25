'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import UnauthenticatedNav from './UnauthenticatedNav';
import GuestNav from './GuestNav';
import StaffNav from './StaffNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SessionUser {
  is_staff?: boolean;
  // Add other user properties as needed
}

export default function Navigation() {
  const { data: session } = useSession();
  const [isLive, setIsLive] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Fetch live status ONCE on mount — no polling.
    // Admin controls the live toggle from the Streaming Admin page,
    // which updates the Show.is_live field directly.
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const checkLiveStatus = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/shows/live-status/`);
        setIsLive(res.data.is_live);
      } catch {
        setIsLive(false);
      }
    };
    
    checkLiveStatus();
  }, []);

  // Determine which navigation to show based on user role
  if (!session) {
    return <UnauthenticatedNav isLive={isLive} />;
  }
  
  const user = session.user as SessionUser;
  
  if (user.is_staff) {
    return <StaffNav isLive={isLive} />;
  }
  
  return <GuestNav isLive={isLive} />;
}
