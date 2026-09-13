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

export async function runGeminiNano(prompt: string): Promise<string> {
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
      return result;
    } finally {
      if (session.destroy) session.destroy();
    }
  }

  throw new Error("Gemini Nano / Window AI is not available on this device.");
}

export async function callAiAssistant(prompt: string, mode: AiMode, userTier: "free" | "paid" = "free") {
  const runtime = getRuntimeProfile();

  if (mode === "fast") {
    if (runtime.supportsNano) {
      try {
        // Gemini Nano (on-device)
        return await runGeminiNano(prompt);
      } catch {
        // Fallback to cloud fast endpoint if local execution fails
        return await callBackend("/api/ai/fast", { prompt, model: "o3-mini" });
      }
    } else {
      // Fallback to cheap cloud model
      return await callBackend("/api/ai/fast", { prompt, model: "o3-mini" });
    }
  }

  // Advanced mode → always backend GPT-4.1 / advanced model
  return await callBackend("/api/ai/advanced", { prompt, model: "gpt-4.1", userTier });
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
