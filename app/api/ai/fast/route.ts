import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Allow fast micro-assistant suggestions for authenticated or local sessions
    }

    const { prompt, model } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: prompt.trim().replace(/^(make this clearer|shorten this|rewrite):\s*/i, "").slice(0, 100),
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model ?? "gpt-4o-mini",
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

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Fast AI error:", error);
    return NextResponse.json({ error: "Internal server error during fast AI call" }, { status: 500 });
  }
}
