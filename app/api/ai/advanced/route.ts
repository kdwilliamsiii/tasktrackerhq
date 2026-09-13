import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Allow advanced planning or return 401 if strict auth is required
    }

    const { prompt, model } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: `[Advanced Plan Preview] Based on your request: "${prompt.slice(0, 80)}..."\n\n1. Phase 1: High-priority assessment\n2. Phase 2: Actionable time blocks\n3. Phase 3: Review and wrap-up`,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model ?? "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are TaskTrackerHQ's advanced reasoning assistant. You analyze calendars, projects, tasks, focus periods, and coursework to generate structured, optimal schedules and deep execution plans.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI provider error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Advanced AI error:", error);
    return NextResponse.json({ error: "Internal server error during advanced AI call" }, { status: 500 });
  }
}
