import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

const admins = new Set((process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, authorization: { params: { scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly" } } })] : []),
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET ? [AzureADProvider({ clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET, tenantId: process.env.MICROSOFT_TENANT_ID || "common", authorization: { params: { scope: "openid profile email offline_access Calendars.Read" } } })] : []),
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-only-secret",
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) { token.accessToken = account.access_token; token.provider = account.provider; }
      const email = token.email || (profile as { email?: string } | undefined)?.email;
      token.role = email && admins.has(email.toLowerCase()) ? "admin" : "user";
      return token;
    },
    async session({ session, token }) {
      if (session.user) { session.user.id = token.sub || ""; session.user.role = token.role || "user"; session.user.provider = token.provider; session.user.accessToken = token.accessToken; }
      return session;
    },
  },
};
export function isAdmin(session: { user?: { role?: string } } | null) { return session?.user?.role === "admin"; }
