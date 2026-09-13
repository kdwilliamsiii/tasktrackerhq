import { NextResponse } from "next/server";
import { getUserProfile, getMonthlyAiUsageForUser, getGlobalFeatureToggles } from "./db";
import { getTierConfig, type PricingTier } from "./ai-tiers";

export interface RateLimitCheckResult {
  allowed: boolean;
  tier: PricingTier;
  reason?: string;
  banned?: boolean;
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
 * - Feature toggles: Checked globally (admin kill switch for TT Bot, Fast Mode, Advanced Mode).
 * - Banned users: Blocked immediately.
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

  // Global feature kill-switch check
  const toggles = await getGlobalFeatureToggles();
  if (requestType === "fast" && !toggles.fastModeEnabled) {
    return {
      allowed: false,
      tier: "free",
      reason: "Fast AI mode is temporarily disabled by the system administrator.",
      monthlyStats: {
        monthLabel: "",
        fastCount: 0,
        advancedCount: 0,
        nanoCount: 0,
        totalCostUsd: 0,
        limitFast: 0,
        limitAdvanced: 0,
        limitCostUsd: 0,
      },
    };
  }

  if (requestType === "advanced" && !toggles.advancedModeEnabled) {
    return {
      allowed: false,
      tier: "free",
      reason: "Advanced AI reasoning is temporarily disabled by the system administrator.",
      monthlyStats: {
        monthLabel: "",
        fastCount: 0,
        advancedCount: 0,
        nanoCount: 0,
        totalCostUsd: 0,
        limitFast: 0,
        limitAdvanced: 0,
        limitCostUsd: 0,
      },
    };
  }

  // Fetch user profile to get their configured tier & custom overrides
  const profile = userId !== "anonymous" ? await getUserProfile(userId) : null;

  if (profile?.banned) {
    return {
      allowed: false,
      tier: profile.tier || "free",
      banned: true,
      reason: "Your AI access has been suspended by an administrator due to policy or usage violations.",
      monthlyStats: {
        monthLabel: "",
        fastCount: 0,
        advancedCount: 0,
        nanoCount: 0,
        totalCostUsd: 0,
        limitFast: 0,
        limitAdvanced: 0,
        limitCostUsd: 0,
      },
    };
  }

  const tier: PricingTier = profile?.tier || "free";
  const tierConfig = getTierConfig(tier);

  // Apply custom admin limits / extra credits if set
  const limitFast = profile?.customFastLimit ?? tierConfig.monthlyLimitFast;
  const limitAdvanced = profile?.customAdvancedLimit ?? tierConfig.monthlyLimitAdvanced;
  const limitCostUsd = tierConfig.monthlyLimitCostUsd + (profile?.extraCreditsUsd || 0);

  // Fetch current month usage
  const usage = await getMonthlyAiUsageForUser(userId);

  const monthlyStats = {
    monthLabel: usage.monthLabel,
    fastCount: usage.fastCount,
    advancedCount: usage.advancedCount,
    nanoCount: usage.nanoCount,
    totalCostUsd: usage.totalCostUsd,
    limitFast,
    limitAdvanced,
    limitCostUsd,
  };

  // On-device Nano is always free & unthrottled
  if (isNano && tierConfig.allowGeminiNano) {
    return { allowed: true, tier, monthlyStats };
  }

  // Check budget ceiling
  if (usage.totalCostUsd >= limitCostUsd) {
    return {
      allowed: false,
      tier,
      reason: `Monthly AI budget limit reached ($${usage.totalCostUsd.toFixed(2)} / $${limitCostUsd.toFixed(2)} USD). Please upgrade your tier.`,
      monthlyStats,
    };
  }

  // Check Advanced Mode Limits
  if (requestType === "advanced") {
    if (limitAdvanced <= 0) {
      return {
        allowed: false,
        tier,
        reason: `Advanced AI reasoning (GPT-4.1) requires a Pro or Enterprise subscription. Your current plan (${tierConfig.name}) allows Fast & On-Device AI only.`,
        monthlyStats,
      };
    }
    if (usage.advancedCount >= limitAdvanced) {
      return {
        allowed: false,
        tier,
        reason: `Monthly Advanced AI limit reached (${usage.advancedCount}/${limitAdvanced} requests). Please upgrade for more capacity.`,
        monthlyStats,
      };
    }
  }

  // Check Fast Mode Limits
  if (requestType === "fast") {
    if (usage.fastCount >= limitFast) {
      return {
        allowed: false,
        tier,
        reason: `Monthly Fast AI limit reached (${usage.fastCount}/${limitFast} requests). Upgrade your tier or use Gemini Nano on-device.`,
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
