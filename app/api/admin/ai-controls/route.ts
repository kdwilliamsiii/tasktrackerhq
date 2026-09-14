import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../../lib/auth";
import {
  adminUpdateUser,
  adminResetUserUsage,
  updateGlobalFeatureToggles,
} from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized. Administrator access required." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Action 1: Toggle global features
    if (action === "update-toggles") {
      const { toggles } = body;
      const updated = await updateGlobalFeatureToggles(toggles);
      return NextResponse.json({ success: true, toggles: updated });
    }

    // Action 2: Reset user usage
    if (action === "reset-user-usage") {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      const deleted = await adminResetUserUsage(userId);
      return NextResponse.json({ success: true, message: `Reset ${deleted} logs for user ${userId}.` });
    }

    // Action 3: Ban or Unban user
    if (action === "set-user-ban") {
      const { userId, banned } = body;
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      const updated = await adminUpdateUser(userId, { banned: Boolean(banned) });
      return NextResponse.json({ success: true, user: updated });
    }

    // Action 4: Change user tier / grant credits / custom limits
    if (action === "update-user-tier-limits") {
      const { userId, tier, extraCreditsUsd, customFastLimit, customAdvancedLimit } = body;
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

      const updates: Record<string, unknown> = {};
      if (tier && ["free", "pro", "enterprise"].includes(tier)) updates.tier = tier;
      if (typeof extraCreditsUsd === "number") updates.extraCreditsUsd = extraCreditsUsd;
      if (typeof customFastLimit === "number") updates.customFastLimit = customFastLimit;
      if (typeof customAdvancedLimit === "number") updates.customAdvancedLimit = customAdvancedLimit;

      const updated = await adminUpdateUser(userId, updates);
      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin AI control error:", error);
    return NextResponse.json({ error: "Failed to perform admin control action" }, { status: 500 });
  }
}
