import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

async function authorize() {
  const session = await getServerSession(authOptions);
  return isAdmin(session) ? session : null;
}

export async function PATCH(request: Request) {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !["new", "reviewing", "approved", "rejected"].includes(body.status)) return NextResponse.json({ error: "Valid id and status are required" }, { status: 400 });
  const result = await db.collection("suggestions").updateOne({ id: body.id }, { $set: { status: body.status, updatedAt: new Date().toISOString() } });
  return result.matchedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  if (!await authorize()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Suggestion id is required" }, { status: 400 });
  const result = await db.collection("suggestions").deleteOne({ id: body.id });
  return result.deletedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
}
