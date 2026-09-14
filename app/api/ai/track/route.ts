import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { recordAiUsage, listAiUsage, getMonthlyAiUsageForUser, getUserProfile } from "../../../../lib/db";
import { getTierConfig, PRICING_TIERS } from "../../../../lib/ai-tiers";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { model = "gemini-nano", feature = "fast", tokensIn = 0, tokensOut = 0, costUsd } = body;

    const log = await recordAiUsage({
      userId: session?.user?.id || body.userId || "anonymous",
      model: String(model),
      feature: String(feature),
      tokensIn: Number(tokensIn) || 0,
      tokensOut: Number(tokensOut) || 0,
      costUsd: typeof costUsd === "number" ? costUsd : undefined,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error tracking AI usage:", error);
    return NextResponse.json({ error: "Failed to track AI usage" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Get current user monthly stats and tier info
    const profile = userId ? await getUserProfile(userId) : null;
    const tier = profile?.tier || "free";
    const tierConfig = getTierConfig(tier);
    const monthlyStats = userId
      ? await getMonthlyAiUsageForUser(userId)
      : await getMonthlyAiUsageForUser("anonymous");

    // Fetch user's own last 20 actions (stripping token counts and internal costs for user privacy)
    const rawLogs = await listAiUsage(userId || "anonymous", 20);
    const userSafeLogs = rawLogs.map((l) => ({
      id: l.id,
      feature: l.feature,
      model: l.model,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      tier,
      tierConfig,
      pricingTiers: PRICING_TIERS,
      monthlyStats: {
        monthLabel: monthlyStats.monthLabel,
        fastCount: monthlyStats.fastCount,
        advancedCount: monthlyStats.advancedCount,
        nanoCount: monthlyStats.nanoCount,
        limitFast: profile?.customFastLimit ?? tierConfig.monthlyLimitFast,
        limitAdvanced: profile?.customAdvancedLimit ?? tierConfig.monthlyLimitAdvanced,
      },
      recentLogs: userSafeLogs,
    });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return NextResponse.json({ error: "Failed to fetch AI usage" }, { status: 500 });
  }
}
