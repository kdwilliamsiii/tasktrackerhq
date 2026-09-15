export function getRuntimeProfile() {
  if (typeof window === "undefined") {
    return { browser: "server", isAndroid: false, supportsNano: false };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isChrome = ua.includes("chrome") && !ua.includes("edge") && !ua.includes("opr");
  const isAndroid = ua.includes("android");
  const isSafari = ua.includes("safari") && !ua.includes("chrome");

  const supportsWebGPU = !!(navigator as unknown as { gpu?: unknown })?.gpu;
  const hasWindowAi = typeof (window as unknown as { ai?: { languageModel?: unknown } })?.ai !== "undefined";

  const supportsNano = (isChrome && supportsWebGPU && (isAndroid || !isSafari)) || hasWindowAi;

  return {
    browser: isSafari ? "safari" : isChrome ? "chrome" : "other",
    isAndroid,
    supportsNano,
  };
}

export type AiMode = "fast" | "advanced";

export async function trackAiUsageClient(data: {
  model: string;
  feature: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
}) {
  try {
    await fetch("/api/ai/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    // Non-blocking telemetry
    console.warn("Could not record AI usage telemetry:", e);
  }
}

export async function runGeminiNano(prompt: string, feature: string = "fast"): Promise<string> {
  const win = window as unknown as {
    ai?: {
      languageModel?: {
        capabilities?: () => Promise<{ available: string }>;
        create?: () => Promise<{ prompt: (p: string) => Promise<string>; destroy?: () => void }>;
      };
    };
  };

  if (win?.ai?.languageModel?.create) {
    const session = await win.ai.languageModel.create();
    try {
      const result = await session.prompt(prompt);
      // Track Gemini Nano local execution (zero tokens, zero cost, increment count)
      void trackAiUsageClient({
        model: "gemini-nano",
        feature,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      });

      // Award XP for on-device AI actions
      void fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ai_action",
          description: `On-Device Fast AI: ${feature}`,
        }),
      }).catch(() => {});

      return result;
    } finally {
      if (session.destroy) session.destroy();
    }
  }

  throw new Error("Gemini Nano / Window AI is not available on this device.");
}

export async function callAiAssistant(prompt: string, mode: AiMode, userTier: "free" | "paid" = "free", feature: string = "fast") {
  const runtime = getRuntimeProfile();

  if (mode === "fast") {
    if (runtime.supportsNano) {
      try {
        // Gemini Nano (on-device)
        return await runGeminiNano(prompt, feature);
      } catch {
        // Fallback to cloud fast endpoint if local execution fails
        return await callBackend("/api/ai/fast", { prompt, model: "o3-mini", feature });
      }
    } else {
      // Fallback to cheap cloud model
      return await callBackend("/api/ai/fast", { prompt, model: "o3-mini", feature });
    }
  }

  // Advanced mode → always backend GPT-4.1 / advanced model
  return await callBackend("/api/ai/advanced", { prompt, model: "gpt-4.1", userTier, feature: feature === "fast" ? "advanced" : feature });
}

async function callBackend(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${res.status}`);
  }
  const data = await res.json();
  return data.reply;
}
