import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { deleteUserProfile, getUserProfile, updateUserProfileTheme } from "../../../lib/db";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(request: Request, data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...getCorsHeaders(request), ...init?.headers },
  });
}

export async function OPTIONS(request: Request) {
  return json(request, {});
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json(request, { theme: null });
  const profile = await getUserProfile(session.user.id);
  return json(request, { user: profile, theme: (profile as { theme?: Record<string, unknown> } | null)?.theme || null });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json(request, { error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.theme || typeof body.theme !== "object") {
    return json(request, { error: "Theme object required" }, { status: 400 });
  }

  const updated = await updateUserProfileTheme(session.user.id, body.theme);
  return json(request, { ok: true, theme: (updated as { theme?: Record<string, unknown> } | null)?.theme || body.theme });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json(request, { error: "Authentication required" }, { status: 401 });
  await deleteUserProfile(session.user.id);
  return json(request, { ok: true });
}
