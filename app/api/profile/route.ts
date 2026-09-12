import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { deleteUserProfile } from "../../../lib/db";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  await deleteUserProfile(session.user.id);
  return NextResponse.json({ ok: true });
}
