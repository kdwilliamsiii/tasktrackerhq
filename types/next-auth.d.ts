import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      provider?: string;
      providerAccountId?: string;
      createdAt?: string;
      accessToken?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "user";
    providerAccountId?: string;
    createdAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "user";
    provider?: string;
    providerAccountId?: string;
    createdAt?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
