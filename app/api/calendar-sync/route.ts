import { NextResponse } from "next/server";
import { syncGoogleCalendar } from "../../../lib/google";
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
