import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import {
  listCalendarEvents,
  addCalendarEvent,
  updateCalendarEventDb,
  deleteCalendarEventDb,
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
  const events = await listCalendarEvents(userId);
  return json(request, { events });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return json(request, { error: "An event title is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (body.provider && body.provider !== "Local") {
    return json(request, { ok: true, ignored: "Provider events stored via provider sync" });
  }

  const event = await addCalendarEvent({
    userId,
    title: body.title.trim(),
    date: body.date || new Date().toISOString().slice(0, 10),
    time: body.time || "",
    provider: "Local",
    id: body.id,
    reminderMinutes: Number(body.reminderMinutes) || 30,
  });

  return json(request, { event }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.id || typeof body.id !== "string") {
    return json(request, { error: "An event id is required" }, { status: 400 });
  }

  const input: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) input.title = body.title.trim();
  if (typeof body.date === "string") input.date = body.date;
  if (typeof body.time === "string") input.time = body.time;
  if (typeof body.reminderMinutes === "number") input.reminderMinutes = body.reminderMinutes;

  if (!Object.keys(input).length) {
    return json(request, { error: "No valid event changes" }, { status: 400 });
  }

  const event = await updateCalendarEventDb(body.id, input);
  return event ? json(request, { event }) : json(request, { error: "Event not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const id = typeof body?.id === "string" ? body.id : url.searchParams.get("id");
  if (!id) return json(request, { error: "An event id is required" }, { status: 400 });

  return (await deleteCalendarEventDb(id))
    ? json(request, { ok: true })
    : json(request, { error: "Event not found" }, { status: 404 });
}
