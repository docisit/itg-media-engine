import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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