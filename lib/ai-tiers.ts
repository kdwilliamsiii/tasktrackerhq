export type PricingTier = "free" | "pro" | "enterprise";

export interface TierConfig {
  name: string;
  monthlyPriceUsd: number;
  monthlyLimitFast: number; // e.g. 100 fast calls / month
  monthlyLimitAdvanced: number; // e.g. 0 for free, 200 for pro
  monthlyLimitCostUsd: number; // budget ceiling in USD
  allowGeminiNano: boolean; // unlimited free on-device
}

export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  free: {
    name: "Free Tier",
    monthlyPriceUsd: 0,
    monthlyLimitFast: 100,
    monthlyLimitAdvanced: 0,
    monthlyLimitCostUsd: 0.50,
    allowGeminiNano: true,
  },
  pro: {
    name: "Pro Tier",
    monthlyPriceUsd: 12,
    monthlyLimitFast: 2000,
    monthlyLimitAdvanced: 300,
    monthlyLimitCostUsd: 15.00,
    allowGeminiNano: true,
  },
  enterprise: {
    name: "Enterprise Tier",
    monthlyPriceUsd: 49,
    monthlyLimitFast: 50000,
    monthlyLimitAdvanced: 5000,
    monthlyLimitCostUsd: 100.00,
    allowGeminiNano: true,
  },
};

export function getTierConfig(tier?: string | null): TierConfig {
  if (tier === "pro") return PRICING_TIERS.pro;
  if (tier === "enterprise") return PRICING_TIERS.enterprise;
  return PRICING_TIERS.free;
}
