declare module "next-auth" {
  interface Session {
    user: {
      id: string;          // <--- ADD THIS
      name?: string | null;
      email?: string | null;
      image?: string | null;
      is_staff?: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
  }

  // Also add this to ensure the User object from the adapter is recognized
  interface User {
    id: string;
    accessToken?: string;
    refreshToken?: string;
  }
}

// Add this if you are using JWT strategy (common in Next.js)
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
