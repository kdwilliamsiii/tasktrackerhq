import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../../lib/auth";
import { getAdminAiAnalytics, getGlobalFeatureToggles } from "../../../../lib/db";
import { PRICING_TIERS } from "../../../../lib/ai-tiers";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized. Administrator access required." }, { status: 403 });
    }

    const analytics = await getAdminAiAnalytics();
    const toggles = await getGlobalFeatureToggles();

    return NextResponse.json({
      analytics,
      toggles,
      pricingTiers: PRICING_TIERS,
    });
  } catch (error) {
    console.error("Admin AI analytics error:", error);
    return NextResponse.json({ error: "Failed to load admin AI analytics" }, { status: 500 });
  }
}
