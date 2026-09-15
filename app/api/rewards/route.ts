import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import { awardUserXp, getUserRewards } from "../../../lib/db";
import { ALL_BADGES, getLevelProgress } from "../../../lib/rewards";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(request: Request, data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...getCorsHeaders(request), ...init?.headers },
  });
}

export async function OPTIONS(request: Request) {
  return json(request, {});
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "anonymous";

  const rewards = await getUserRewards(userId);
  const levelProgress = getLevelProgress(rewards.xp);

  const badgesWithStatus = ALL_BADGES.map((b) => ({
    ...b,
    unlocked: Boolean(rewards.unlockedBadges?.[b.id]),
    unlockedAt: rewards.unlockedBadges?.[b.id] || null,
  }));

  return json(request, {
    rewards: {
      ...rewards,
      ...levelProgress,
    },
    badges: badgesWithStatus,
    isAuthenticated: Boolean(session?.user?.id),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || "anonymous";

  const body = await request.json().catch(() => null);
  if (!body || typeof body.type !== "string") {
    return json(request, { error: "Event type is required" }, { status: 400 });
  }

  const result = await awardUserXp(userId, {
    type: body.type,
    description: typeof body.description === "string" ? body.description : "Completed an action",
    customXp: typeof body.customXp === "number" ? body.customXp : undefined,
    focusMinutes: typeof body.focusMinutes === "number" ? body.focusMinutes : undefined,
  });

  const levelProgress = getLevelProgress(result.profile.xp);

  return json(request, {
    ok: true,
    xpEarned: result.xpEarned,
    newBadges: result.newBadges,
    levelUp: result.levelUp,
    rewards: {
      ...result.profile,
      ...levelProgress,
    },
  });
}
