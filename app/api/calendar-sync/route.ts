import { NextResponse } from "next/server";
import { syncGoogleCalendar, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "../../../lib/google";
import { syncMicrosoftCalendar } from "../../../lib/microsoft";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const session = await getServerSession(authOptions);
  const monthsBack = Math.min(24, Math.max(1, Number(body?.monthsBack) || 3));
  if (body?.provider === "google") return NextResponse.json(await syncGoogleCalendar(session?.user?.provider === "google" ? session.user.accessToken : undefined, monthsBack));
  if (body?.provider === "microsoft") return NextResponse.json(await syncMicrosoftCalendar(session?.user?.provider === "azure-ad" ? session.user.accessToken : undefined, monthsBack));
  return NextResponse.json({ error: "Provider must be google or microsoft" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const session = await getServerSession(authOptions);
  if (!body?.id || !body?.provider) return NextResponse.json({ error: "Missing event id or provider" }, { status: 400 });

  if (body.provider === "Google") {
    const accessToken = session?.user?.provider === "google" ? session.user.accessToken : undefined;
    if (!accessToken) return NextResponse.json({ error: "Google session required to update Google event" }, { status: 401 });
    const success = await updateGoogleCalendarEvent(accessToken, body.id, {
      title: body.title,
      date: body.date,
      time: body.time,
    });
    return NextResponse.json({ ok: success });
  }

  return NextResponse.json({ error: "Provider not editable" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const url = new URL(request.url);
  const id = body?.id || url.searchParams.get("id");
  const provider = body?.provider || url.searchParams.get("provider");
  const session = await getServerSession(authOptions);

  if (!id || !provider) return NextResponse.json({ error: "Missing event id or provider" }, { status: 400 });

  if (provider === "Google") {
    const accessToken = session?.user?.provider === "google" ? session.user.accessToken : undefined;
    if (!accessToken) return NextResponse.json({ error: "Google session required to delete Google event" }, { status: 401 });
    const success = await deleteGoogleCalendarEvent(accessToken, id);
    return NextResponse.json({ ok: success });
  }

  return NextResponse.json({ error: "Provider not editable" }, { status: 400 });
}
