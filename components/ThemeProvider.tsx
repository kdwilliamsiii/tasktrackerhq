"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeColors = {
  background: string;
  foreground: string;
  surface: string;
  sidebar: string;
  sidebarText: string;
  sidebarActive?: string;
  topbar: string;
  topbarText: string;
  muted: string;
  navy: string;
  teal: string;
  orange: string;
  line: string;
};

export type ThemeOptions = {
  radius: "sharp" | "soft" | "round";
  density: "compact" | "comfortable" | "airy";
  shadows: boolean;
};

export type FontChoice = {
  id: string;
  name: string;
  family: string;
};

export const fontChoices: FontChoice[] = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
  { id: "roboto", name: "Roboto", family: "'Roboto', sans-serif" },
  { id: "open-sans", name: "Open Sans", family: "'Open Sans', sans-serif" },
  { id: "merriweather", name: "Merriweather", family: "'Merriweather', serif" },
];

export type ThemePreset = {
  id: string;
  name: string;
  colors: ThemeColors;
};

export const themePresets: ThemePreset[] = [
  { id: "paper", name: "Paper & Ink (Default)", colors: { background: "#fbfcff", foreground: "#1e293b", surface: "#fffef8", sidebar: "#64748b", sidebarText: "#ffffff", sidebarActive: "#0f9385", topbar: "#fffef8", topbarText: "#334155", muted: "#718096", navy: "#475569", teal: "#0f9385", orange: "#c66a09", line: "#d8e0e8" } },
  { id: "cobalt", name: "Cobalt Workbench", colors: { background: "#f3f7ff", foreground: "#172554", surface: "#ffffff", sidebar: "#2563eb", sidebarText: "#ffffff", sidebarActive: "#1d4ed8", topbar: "#e0ecff", topbarText: "#1e3a8a", muted: "#5b6f91", navy: "#1d4ed8", teal: "#06b6d4", orange: "#fb7c24", line: "#c4d9fa" } },
  { id: "evergreen", name: "Evergreen", colors: { background: "#f1fff6", foreground: "#153b2a", surface: "#ffffff", sidebar: "#16a05d", sidebarText: "#ffffff", topbar: "#d9fbe7", topbarText: "#166534", muted: "#5f806f", navy: "#15803d", teal: "#10b981", orange: "#e58a0b", line: "#bfe9cf" } },
  { id: "plum", name: "Plum Desk", colors: { background: "#fcf8ff", foreground: "#35145f", surface: "#ffffff", sidebar: "#9333ea", sidebarText: "#ffffff", topbar: "#f4e7ff", topbarText: "#6b21a8", muted: "#846c9b", navy: "#7e22ce", teal: "#c026d3", orange: "#fb536f", line: "#e3c9f7" } },
  { id: "terracotta", name: "Terracotta", colors: { background: "#fff9f1", foreground: "#431407", surface: "#fffefb", sidebar: "#c2410c", sidebarText: "#ffffff", topbar: "#ffe9d2", topbarText: "#9a3412", muted: "#936e5c", navy: "#c2410c", teal: "#0f9488", orange: "#f06b21", line: "#f1ccb0" } },
  { id: "monochrome", name: "Monochrome", colors: { background: "#fafafa", foreground: "#18181b", surface: "#ffffff", sidebar: "#52525b", sidebarText: "#ffffff", topbar: "#eeeeef", topbarText: "#27272a", muted: "#696970", navy: "#3f3f46", teal: "#71717a", orange: "#b4b4bc", line: "#d7d7dc" } },
  { id: "lagoon", name: "Lagoon", colors: { background: "#f0feff", foreground: "#164e63", surface: "#ffffff", sidebar: "#0891b2", sidebarText: "#ffffff", topbar: "#cffafe", topbarText: "#155e75", muted: "#56808d", navy: "#0e7490", teal: "#06b6d4", orange: "#f7a51b", line: "#b9e8ef" } },
  { id: "berry", name: "Berry Cream", colors: { background: "#fff5f6", foreground: "#4a1022", surface: "#ffffff", sidebar: "#be185d", sidebarText: "#ffffff", topbar: "#ffe4e8", topbarText: "#9f1239", muted: "#9d6377", navy: "#be185d", teal: "#e11d8a", orange: "#f07032", line: "#f1c2ce" } },
];

type ThemeContextValue = {
  colors: ThemeColors;
  options: ThemeOptions;
  font: FontChoice;
  sidebarFont: FontChoice;
  topbarFont: FontChoice;
  selectedPreset: string;
  applyPreset: (preset: ThemePreset) => void;
  updateColor: (name: keyof ThemeColors, value: string) => void;
  updateOption: <K extends keyof ThemeOptions>(name: K, value: ThemeOptions[K]) => void;
  setFont: (font: FontChoice) => void;
  setSidebarFont: (font: FontChoice) => void;
  setTopbarFont: (font: FontChoice) => void;
  reset: () => void;
};

const defaultTheme = themePresets[0];
const defaultOptions: ThemeOptions = { radius: "soft", density: "comfortable", shadows: true };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeColors(colors: Partial<ThemeColors>): ThemeColors {
  return { ...defaultTheme.colors, sidebarActive: colors.sidebarActive || colors.teal || defaultTheme.colors.sidebarActive || "#e9f7f4", ...colors };
}

function applyColors(colors: ThemeColors) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(colors)) root.style.setProperty("--" + name, value);
}

function applyFont(font: FontChoice) {
  document.documentElement.style.setProperty("--font-app", font.family);
  document.body.style.fontFamily = font.family;
}

function applyBarFont(name: "sidebar" | "topbar", font: FontChoice) {
  document.documentElement.style.setProperty("--font-" + name, font.family);
}

function applyOptions(options: ThemeOptions) {
  const root = document.documentElement;
  root.dataset.radius = options.radius;
  root.dataset.density = options.density;
  root.dataset.shadows = String(options.shadows);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState(defaultTheme.colors);
  const [selectedPreset, setSelectedPreset] = useState(defaultTheme.id);
  const [font, setFontChoice] = useState(fontChoices[0]);
  const [sidebarFont, setSidebarFontChoice] = useState(fontChoices[0]);
  const [topbarFont, setTopbarFontChoice] = useState(fontChoices[0]);
  const [options, setOptions] = useState(defaultOptions);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    applyColors(colors);
  }, [colors, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    applyFont(font);
  }, [font, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    applyBarFont("sidebar", sidebarFont);
  }, [hydrated, sidebarFont]);

  useEffect(() => {
    if (!hydrated) return;
    applyBarFont("topbar", topbarFont);
  }, [hydrated, topbarFont]);

  useEffect(() => {
    if (!hydrated) return;
    applyOptions(options);
  }, [options, hydrated]);

  useEffect(() => {
    const applyParsedTheme = (parsed: {
      colors?: ThemeColors;
      preset?: string;
      font?: string;
      sidebarFont?: string;
      topbarFont?: string;
      options?: ThemeOptions;
    }) => {
      const savedColors = parsed.colors ? normalizeColors(parsed.colors) : defaultTheme.colors;
      const savedFont = fontChoices.find((choice) => choice.id === parsed.font);
      const savedSidebarFont = fontChoices.find((choice) => choice.id === parsed.sidebarFont);
      const savedTopbarFont = fontChoices.find((choice) => choice.id === parsed.topbarFont);
      setColors(savedColors);
      setSelectedPreset(parsed.preset || "custom");
      setFontChoice(savedFont || fontChoices[0]);
      setSidebarFontChoice(savedSidebarFont || fontChoices[0]);
      setTopbarFontChoice(savedTopbarFont || fontChoices[0]);
      setOptions({ ...defaultOptions, ...(parsed.options || {}) });
      applyColors(savedColors);
      applyFont(savedFont || fontChoices[0]);
      applyBarFont("sidebar", savedSidebarFont || fontChoices[0]);
      applyBarFont("topbar", savedTopbarFont || fontChoices[0]);
      applyOptions({ ...defaultOptions, ...(parsed.options || {}) });
    };

    const loadTheme = async () => {
      const saved = localStorage.getItem("tasktracker-theme");
      if (saved) {
        try {
          applyParsedTheme(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
      setHydrated(true);

      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.theme && typeof data.theme === "object") {
            applyParsedTheme(data.theme);
            localStorage.setItem("tasktracker-theme", JSON.stringify(data.theme));
          }
        }
      } catch {
        // Offline
      }
    };

    const themeLoad = window.setTimeout(() => { void loadTheme(); }, 0);
    const handleDataChanged = () => { void loadTheme(); };
    window.addEventListener("tasktracker-data-changed", handleDataChanged);
    return () => {
      window.clearTimeout(themeLoad);
      window.removeEventListener("tasktracker-data-changed", handleDataChanged);
    };
  }, []);

  const save = useCallback((next: ThemeColors, preset: string, nextFont = font, nextOptions = options, nextSidebarFont = sidebarFont, nextTopbarFont = topbarFont) => {
    setColors(next);
    setSelectedPreset(preset);
    setFontChoice(nextFont);
    setSidebarFontChoice(nextSidebarFont);
    setTopbarFontChoice(nextTopbarFont);
    setOptions(nextOptions);
    applyColors(next);
    applyFont(nextFont);
    applyBarFont("sidebar", nextSidebarFont);
    applyBarFont("topbar", nextTopbarFont);

    const payload = { colors: next, preset, font: nextFont.id, sidebarFont: nextSidebarFont.id, topbarFont: nextTopbarFont.id, options: nextOptions };
    localStorage.setItem("tasktracker-theme", JSON.stringify(payload));

    void fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: payload }),
    }).catch(() => {
      // Offline fallback
    });
  }, [font, options, sidebarFont, topbarFont]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors,
    selectedPreset,
    applyPreset: (preset) => save(normalizeColors(preset.colors), preset.id),
    updateColor: (name, value) => save({ ...colors, [name]: value }, "custom"),
    updateOption: (name, value) => save(colors, selectedPreset, font, { ...options, [name]: value }),
    font,
    setFont: (nextFont) => save(colors, selectedPreset, nextFont),
    sidebarFont,
    setSidebarFont: (nextFont) => save(colors, selectedPreset, font, options, nextFont, topbarFont),
    topbarFont,
    setTopbarFont: (nextFont) => save(colors, selectedPreset, font, options, sidebarFont, nextFont),
    options,
    reset: () => save(defaultTheme.colors, defaultTheme.id, fontChoices[0], defaultOptions, fontChoices[0], fontChoices[0]),
  }), [colors, selectedPreset, font, sidebarFont, topbarFont, options, save]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
