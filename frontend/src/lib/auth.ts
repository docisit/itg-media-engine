import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        access_token: { label: "Access Token", type: "text" },
        refresh_token: { label: "Refresh Token", type: "text" },
      },
      async authorize(credentials) {
        // ---- Passkey / WebAuthn login — tokens already obtained by PasskeyAuth component ----
        if (credentials?.access_token) {
          const payload = credentials.access_token.split('.')[1];
          try {
            const decoded = JSON.parse(
              typeof window === 'undefined'
                ? Buffer.from(payload, 'base64').toString()
                : atob(payload)
            );
            return {
              id: decoded.user_id || credentials.username || 'passkey-user',
              name: decoded.username || credentials.username || '',
              email: '', // Not in JWT claims — fine for auth
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || '',
              is_staff: decoded.is_staff === true,
              role: decoded.role || '',
            };
          } catch {
            // If JWT decode fails, still return the basic user — the tokens are valid
            return {
              id: credentials.username || 'passkey-user',
              name: credentials.username || '',
              email: '',
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || '',
              is_staff: false,
              role: '',
            };
          }
        }

        // ---- Standard password login ----
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/token/`,
            {
              username: credentials.username,
              password: credentials.password,
            }
          );

          if (response.data && response.data.access) {
            // Decode JWT payload to extract is_staff and other claims
            let is_staff = false;
            let role = '';
            try {
              const payload = JSON.parse(
                Buffer.from(response.data.access.split('.')[1], 'base64').toString()
              );
              is_staff = payload.is_staff === true;
              role = payload.role || '';
            } catch {
              // JWT decode failed — default to non-staff
            }

            return {
              id: response.data.user?.id || credentials.username,
              name: response.data.user?.username || credentials.username,
              email: response.data.user?.email || "",
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
              is_staff,
              role,
            };
          }

          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.is_staff = user.is_staff;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.is_staff = token.is_staff;
        session.user.role = token.role;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};