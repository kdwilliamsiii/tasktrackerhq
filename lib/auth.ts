import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { saveUserProfile } from "./db";

const admins = new Set((process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, authorization: { params: { scope: "openid email profile https://www.googleapis.com/auth/calendar.events", prompt: "consent", access_type: "offline" } } })] : []),
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET ? [AzureADProvider({ clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET, tenantId: process.env.MICROSOFT_TENANT_ID || "common", authorization: { params: { scope: "openid profile email offline_access Calendars.Read" } } })] : []),
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-only-secret",
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
        token.createdAt ||= new Date().toISOString();
      }
      if (profile?.name) token.name = profile.name;
      if (profile?.email) token.email = profile.email;
      const profilePicture = (profile as { picture?: string } | undefined)?.picture;
      if (profilePicture) token.picture = profilePicture;
      const email = token.email || (profile as { email?: string } | undefined)?.email;
      token.role = email && admins.has(email.toLowerCase()) ? "admin" : "user";
      if (account) {
        const profileId = token.sub || account.providerAccountId;
        const createdAt = token.createdAt || new Date().toISOString();
        token.createdAt = createdAt;
        await saveUserProfile({
          id: profileId,
          name: token.name,
          email: token.email,
          image: token.picture,
          role: token.role,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          createdAt,
          updatedAt: new Date().toISOString(),
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = token.role || "user";
        session.user.provider = token.provider;
        session.user.providerAccountId = token.providerAccountId;
        session.user.createdAt = token.createdAt;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
  },
};
export function isAdmin(session: { user?: { role?: string } } | null) { return session?.user?.role === "admin"; }
