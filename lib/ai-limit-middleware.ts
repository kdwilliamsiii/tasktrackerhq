import { NextResponse } from "next/server";
import { getUserProfile, getMonthlyAiUsageForUser } from "./db";
import { getTierConfig, type PricingTier } from "./ai-tiers";

export interface RateLimitCheckResult {
  allowed: boolean;
  tier: PricingTier;
  reason?: string;
  monthlyStats: {
    monthLabel: string;
    fastCount: number;
    advancedCount: number;
    nanoCount: number;
    totalCostUsd: number;
    limitFast: number;
    limitAdvanced: number;
    limitCostUsd: number;
  };
}

/**
 * Validates whether a user is allowed to make a specific AI call under their pricing tier limits.
 *
 * Rules:
 * - Gemini Nano (on-device): Always allowed (unlimited, free).
 * - Fast Cloud AI (e.g. o3-mini): Blocked if user exceeds `monthlyLimitFast` or budget cap.
 * - Advanced AI (e.g. GPT-4.1 / TT Bot): Blocked if user's tier has 0 limit (Free tier) or exceeds limit.
 */
export async function checkAiRateLimit(
  userId: string = "anonymous",
  requestType: "fast" | "advanced",
  modelName: string = "o3-mini"
): Promise<RateLimitCheckResult> {
  const isNano = modelName.toLowerCase().includes("nano");

  // Fetch user profile to get their configured tier
  const profile = userId !== "anonymous" ? await getUserProfile(userId) : null;
  const tier: PricingTier = profile?.tier || "free";
  const tierConfig = getTierConfig(tier);

  // Fetch current month usage
  const usage = await getMonthlyAiUsageForUser(userId);

  const monthlyStats = {
    monthLabel: usage.monthLabel,
    fastCount: usage.fastCount,
    advancedCount: usage.advancedCount,
    nanoCount: usage.nanoCount,
    totalCostUsd: usage.totalCostUsd,
    limitFast: tierConfig.monthlyLimitFast,
    limitAdvanced: tierConfig.monthlyLimitAdvanced,
    limitCostUsd: tierConfig.monthlyLimitCostUsd,
  };

  // On-device Nano is always free & unthrottled
  if (isNano && tierConfig.allowGeminiNano) {
    return { allowed: true, tier, monthlyStats };
  }

  // Check budget ceiling
  if (usage.totalCostUsd >= tierConfig.monthlyLimitCostUsd) {
    return {
      allowed: false,
      tier,
      reason: `Monthly AI budget limit reached ($${usage.totalCostUsd.toFixed(2)} / $${tierConfig.monthlyLimitCostUsd.toFixed(2)} USD). Please upgrade your tier.`,
      monthlyStats,
    };
  }

  // Check Advanced Mode Limits
  if (requestType === "advanced") {
    if (tierConfig.monthlyLimitAdvanced <= 0) {
      return {
        allowed: false,
        tier,
        reason: `Advanced AI reasoning (GPT-4.1) requires a Pro or Enterprise subscription. Your current plan (${tierConfig.name}) allows Fast & On-Device AI only.`,
        monthlyStats,
      };
    }
    if (usage.advancedCount >= tierConfig.monthlyLimitAdvanced) {
      return {
        allowed: false,
        tier,
        reason: `Monthly Advanced AI limit reached (${usage.advancedCount}/${tierConfig.monthlyLimitAdvanced} requests). Please upgrade for more capacity.`,
        monthlyStats,
      };
    }
  }

  // Check Fast Mode Limits
  if (requestType === "fast") {
    if (usage.fastCount >= tierConfig.monthlyLimitFast) {
      return {
        allowed: false,
        tier,
        reason: `Monthly Fast AI limit reached (${usage.fastCount}/${tierConfig.monthlyLimitFast} requests). Upgrade your tier or use Gemini Nano on-device.`,
        monthlyStats,
      };
    }
  }

  return { allowed: true, tier, monthlyStats };
}

/**
 * Helper to build an HTTP 429 / 403 Response when rate limit fails.
 */
export function rateLimitResponse(check: RateLimitCheckResult) {
  return NextResponse.json(
    {
      error: check.reason || "AI usage limit exceeded for your subscription tier.",
      code: "AI_TIER_LIMIT_EXCEEDED",
      tier: check.tier,
      monthlyStats: check.monthlyStats,
    },
    { status: 429 }
  );
}
