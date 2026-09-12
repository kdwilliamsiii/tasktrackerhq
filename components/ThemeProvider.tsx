"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeColors = {
  background: string;
  foreground: string;
  surface: string;
  sidebar: string;
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
  { id: "ocean", name: "Ocean", colors: { background: "#f6f8fb", foreground: "#182230", surface: "#ffffff", sidebar: "#ffffff", muted: "#748094", navy: "#17283d", teal: "#36b7a2", orange: "#e9825b", line: "#e5e9f0" } },
  { id: "midnight", name: "Midnight", colors: { background: "#111827", foreground: "#e5e7eb", surface: "#182235", sidebar: "#0b1220", muted: "#a7b2c4", navy: "#0b1220", teal: "#5eead4", orange: "#fb923c", line: "#293548" } },
  { id: "lavender", name: "Lavender", colors: { background: "#f8f7fc", foreground: "#28243a", surface: "#ffffff", sidebar: "#f1effb", muted: "#827b9b", navy: "#40345f", teal: "#9b8ce0", orange: "#e39a72", line: "#e6e0f2" } },
  { id: "forest", name: "Forest", colors: { background: "#f4f8f5", foreground: "#17231c", surface: "#ffffff", sidebar: "#eaf5ed", muted: "#688071", navy: "#193c2a", teal: "#4caf82", orange: "#d88b52", line: "#dce9df" } },
  { id: "sunset", name: "Sunset", colors: { background: "#fff8f4", foreground: "#30201c", surface: "#ffffff", sidebar: "#fff0e9", muted: "#98766d", navy: "#5a2f2a", teal: "#e27c68", orange: "#e5a23c", line: "#f0ddd5" } },
  { id: "candy", name: "Candy Pop", colors: { background: "#fff5fb", foreground: "#3b203d", surface: "#ffffff", sidebar: "#ffe8f5", muted: "#966282", navy: "#7b2f72", teal: "#f472b6", orange: "#fbbf24", line: "#f4cfe5" } },
  { id: "neon", name: "Neon Arcade", colors: { background: "#101322", foreground: "#f2f4ff", surface: "#181b32", sidebar: "#0b0d1b", muted: "#a4a8ca", navy: "#25115c", teal: "#22d3ee", orange: "#f43f5e", line: "#35345c" } },
  { id: "tropical", name: "Tropical", colors: { background: "#effcf8", foreground: "#123b3b", surface: "#ffffff", sidebar: "#ddf7f0", muted: "#5b8580", navy: "#075e54", teal: "#2dd4bf", orange: "#fb923c", line: "#c5eee5" } },
  { id: "cosmic", name: "Cosmic", colors: { background: "#f5f3ff", foreground: "#27144d", surface: "#ffffff", sidebar: "#ebe5ff", muted: "#7969a1", navy: "#4c1d95", teal: "#8b5cf6", orange: "#ec4899", line: "#ddd2fa" } },
  { id: "lemonade", name: "Lemonade", colors: { background: "#fffdeb", foreground: "#3f3510", surface: "#ffffff", sidebar: "#fff8c9", muted: "#887a36", navy: "#766000", teal: "#84cc16", orange: "#f59e0b", line: "#f2e7a8" } },
];

type ThemeContextValue = {
  colors: ThemeColors;
  options: ThemeOptions;
  font: FontChoice;
  selectedPreset: string;
  applyPreset: (preset: ThemePreset) => void;
  updateColor: (name: keyof ThemeColors, value: string) => void;
  updateOption: <K extends keyof ThemeOptions>(name: K, value: ThemeOptions[K]) => void;
  setFont: (font: FontChoice) => void;
  reset: () => void;
};

const defaultTheme = themePresets[0];
const defaultOptions: ThemeOptions = { radius: "soft", density: "comfortable", shadows: true };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeColors(colors: Partial<ThemeColors>): ThemeColors {
  return { ...defaultTheme.colors, ...colors };
}

function applyColors(colors: ThemeColors) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(colors)) root.style.setProperty(`--${name}`, value);
}

function applyFont(font: FontChoice) {
  document.documentElement.style.setProperty("--font-app", font.family);
  document.body.style.fontFamily = font.family;
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
    applyOptions(options);
  }, [options, hydrated]);

  useEffect(() => {
    const loadTheme = () => {
      const saved = localStorage.getItem("tasktracker-theme");
      if (!saved) {
        setHydrated(true);
        return;
      }
      try {
        const parsed = JSON.parse(saved) as { colors?: ThemeColors; preset?: string; font?: string; options?: ThemeOptions };
        const savedColors = parsed.colors ? normalizeColors(parsed.colors) : defaultTheme.colors;
        const savedFont = fontChoices.find((choice) => choice.id === parsed.font);
        setColors(savedColors);
        setSelectedPreset(parsed.preset || "custom");
        setFontChoice(savedFont || fontChoices[0]);
        setOptions({ ...defaultOptions, ...(parsed.options || {}) });
      } catch {
        localStorage.removeItem("tasktracker-theme");
      } finally {
        setHydrated(true);
      }
    };
    const themeLoad = window.setTimeout(loadTheme, 0);
    return () => window.clearTimeout(themeLoad);
  }, []);

  const save = useCallback((next: ThemeColors, preset: string, nextFont = font, nextOptions = options) => {
    setColors(next);
    setSelectedPreset(preset);
    setFontChoice(nextFont);
    setOptions(nextOptions);
    applyColors(next);
    applyFont(nextFont);
    localStorage.setItem("tasktracker-theme", JSON.stringify({ colors: next, preset, font: nextFont.id, options: nextOptions }));
  }, [font, options]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors,
    selectedPreset,
    applyPreset: (preset) => save(preset.colors, preset.id),
    updateColor: (name, value) => save({ ...colors, [name]: value }, "custom"),
    updateOption: (name, value) => save(colors, selectedPreset, font, { ...options, [name]: value }),
    font,
    setFont: (nextFont) => save(colors, selectedPreset, nextFont),
    options,
    reset: () => save(defaultTheme.colors, defaultTheme.id, fontChoices[0], defaultOptions),
  }), [colors, selectedPreset, font, options, save]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
