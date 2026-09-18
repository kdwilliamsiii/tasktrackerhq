import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import {
  listCalendarEvents,
  addCalendarEvent,
  updateCalendarEventDb,
  deleteCalendarEventDb,
} from "../../../lib/db";
import { getOccurrenceDates, type RepeatFrequency } from "../../../lib/calendar";

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
  if (!userId) {
    return json(request, { error: "Sign in required to create events." }, { status: 401 });
  }

  if (body.provider && body.provider !== "Local") {
    return json(request, { ok: true, ignored: "Provider events stored via provider sync" });
  }

  const date = typeof body.date === "string" && body.date
    ? body.date.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const repeat: RepeatFrequency = ["none", "daily", "weekly", "monthly"].includes(body.repeat)
    ? body.repeat
    : "none";
  const repeatUntil = typeof body.repeatUntil === "string" ? body.repeatUntil.slice(0, 10) : undefined;
  if (repeat !== "none" && !repeatUntil) {
    return json(request, { error: "A repeat end date is required" }, { status: 400 });
  }
  const dates = getOccurrenceDates(date, repeat, repeatUntil);
  if (!dates.length) {
    return json(request, { error: "Repeat until must be on or after the event date" }, { status: 400 });
  }

  const sourceTime = body.time ? new Date(body.time) : null;
  const timeForOccurrence = (occurrenceDate: string) => {
    if (!sourceTime || Number.isNaN(sourceTime.getTime())) return "";
    return `${occurrenceDate}T${sourceTime.toISOString().slice(11, 19)}.000Z`;
  };
  const events = await Promise.all(dates.map((occurrenceDate, index) => addCalendarEvent({
    userId,
    title: body.title.trim(),
    date: occurrenceDate,
    time: timeForOccurrence(occurrenceDate),
    provider: "Local",
    id: index === 0 && typeof body.id === "string" ? body.id : undefined,
    reminderMinutes: Number(body.reminderMinutes) || 30,
  })));

  return json(request, { event: events[0], events }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.id || typeof body.id !== "string") {
    return json(request, { error: "An event id is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to update events." }, { status: 401 });
  }

  const input: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) input.title = body.title.trim();
  if (typeof body.date === "string") input.date = body.date;
  if (typeof body.time === "string") input.time = body.time;
  if (typeof body.reminderMinutes === "number") input.reminderMinutes = body.reminderMinutes;

  if (!Object.keys(input).length) {
    return json(request, { error: "No valid event changes" }, { status: 400 });
  }

  const event = await updateCalendarEventDb(body.id, userId, input);
  return event ? json(request, { event }) : json(request, { error: "Event not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const id = typeof body?.id === "string" ? body.id : url.searchParams.get("id");
  if (!id) return json(request, { error: "An event id is required" }, { status: 400 });

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to delete events." }, { status: 401 });
  }

  return (await deleteCalendarEventDb(id, userId))
    ? json(request, { ok: true })
    : json(request, { error: "Event not found" }, { status: 404 });
}
