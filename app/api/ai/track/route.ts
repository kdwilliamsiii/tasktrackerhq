import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { recordAiUsage, listAiUsage, getAiUsageSummary } from "../../../../lib/db";

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");

    const targetUser = scope === "all" ? undefined : userId;
    const summary = await getAiUsageSummary(targetUser);
    const recentLogs = await listAiUsage(targetUser, 50);

    return NextResponse.json({ summary, recentLogs });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return NextResponse.json({ error: "Failed to fetch AI usage" }, { status: 500 });
  }
}
