import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { recordAiUsage } from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "anonymous";

    const { prompt, model, feature = "fast" } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
    }

    const requestedModel = model ?? "o3-mini";
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      const reply = prompt.trim().replace(/^(make this clearer|shorten this|rewrite):\s*/i, "").slice(0, 100);
      await recordAiUsage({
        userId,
        model: requestedModel,
        feature,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      });
      return NextResponse.json({ reply });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: requestedModel === "o3-mini" ? "gpt-4o-mini" : requestedModel,
        messages: [
          {
            role: "system",
            content:
              "You are TaskTrackerHQ's fast assistant for quick task edits, rewrites, and suggestions. Keep your responses concise, direct, and actionable without conversational fluff.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI provider error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;

    await recordAiUsage({
      userId,
      model: requestedModel,
      feature,
      tokensIn,
      tokensOut,
    });

    return NextResponse.json({ reply, tokensIn, tokensOut });
  } catch (error) {
    console.error("Fast AI error:", error);
    return NextResponse.json({ error: "Internal server error during fast AI call" }, { status: 500 });
  }
}
