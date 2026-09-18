import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import {
  listGpaClasses,
  saveGpaClassDb,
  deleteGpaClassDb,
} from "../../../lib/db";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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
  const userId = session?.user?.id;
  const classes = await listGpaClasses(userId);
  return json(request, { classes });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return json(request, { error: "A class name is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to save classes." }, { status: 401 });
  }

  const item = await saveGpaClassDb({
    id: body.id,
    userId,
    name: body.name.trim(),
    code: (body.code || "").trim().toUpperCase(),
    credits: Number(body.credits) || 3,
    pointsEarned: Number(body.pointsEarned) || 0,
    currentPossible: Number(body.currentPossible) || 100,
    totalPossible: Number(body.totalPossible) || 100,
    isHonors: Boolean(body.isHonors),
  });

  return json(request, { class: item }, { status: 201 });
}

export async function PATCH(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const id = typeof body?.id === "string" ? body.id : url.searchParams.get("id");
  if (!id) return json(request, { error: "A class id is required" }, { status: 400 });

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to delete classes." }, { status: 401 });
  }

  return (await deleteGpaClassDb(id, userId))
    ? json(request, { ok: true })
    : json(request, { error: "Class not found" }, { status: 404 });
}
