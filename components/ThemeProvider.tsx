"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeColors = {
  background: string;
  foreground: string;
  navy: string;
  teal: string;
  orange: string;
  line: string;
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
  { id: "ocean", name: "Ocean", colors: { background: "#f6f8fb", foreground: "#182230", navy: "#17283d", teal: "#36b7a2", orange: "#e9825b", line: "#e5e9f0" } },
  { id: "midnight", name: "Midnight", colors: { background: "#111827", foreground: "#e5e7eb", navy: "#0b1220", teal: "#5eead4", orange: "#fb923c", line: "#293548" } },
  { id: "lavender", name: "Lavender", colors: { background: "#f8f7fc", foreground: "#28243a", navy: "#40345f", teal: "#9b8ce0", orange: "#e39a72", line: "#e6e0f2" } },
  { id: "forest", name: "Forest", colors: { background: "#f4f8f5", foreground: "#17231c", navy: "#193c2a", teal: "#4caf82", orange: "#d88b52", line: "#dce9df" } },
  { id: "sunset", name: "Sunset", colors: { background: "#fff8f4", foreground: "#30201c", navy: "#5a2f2a", teal: "#e27c68", orange: "#e5a23c", line: "#f0ddd5" } },
];

type ThemeContextValue = {
  colors: ThemeColors;
  font: FontChoice;
  selectedPreset: string;
  applyPreset: (preset: ThemePreset) => void;
  updateColor: (name: keyof ThemeColors, value: string) => void;
  setFont: (font: FontChoice) => void;
  reset: () => void;
};

const defaultTheme = themePresets[0];
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyColors(colors: ThemeColors) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(colors)) root.style.setProperty(`--${name}`, value);
}

function applyFont(font: FontChoice) {
  document.documentElement.style.setProperty("--font-app", font.family);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState(defaultTheme.colors);
  const [selectedPreset, setSelectedPreset] = useState(defaultTheme.id);
  const [font, setFontChoice] = useState(fontChoices[0]);

  useEffect(() => {
    applyColors(colors);
  }, [colors]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

  useEffect(() => {
    const saved = localStorage.getItem("tasktracker-theme");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { colors?: ThemeColors; preset?: string; font?: string };
      const savedColors = parsed.colors;
      const savedFont = fontChoices.find((choice) => choice.id === parsed.font);
      if (savedColors) {
        requestAnimationFrame(() => {
          setColors(savedColors);
          setSelectedPreset(parsed.preset || "custom");
          if (savedFont) setFontChoice(savedFont);
        });
      }
    } catch {
      localStorage.removeItem("tasktracker-theme");
    }
  }, []);

  const save = useCallback((next: ThemeColors, preset: string, nextFont = font) => {
    setColors(next);
    setSelectedPreset(preset);
    setFontChoice(nextFont);
    applyColors(next);
    applyFont(nextFont);
    localStorage.setItem("tasktracker-theme", JSON.stringify({ colors: next, preset, font: nextFont.id }));
  }, [font]);

  const value = useMemo<ThemeContextValue>(() => ({
    colors,
    selectedPreset,
    applyPreset: (preset) => save(preset.colors, preset.id),
    updateColor: (name, value) => save({ ...colors, [name]: value }, "custom"),
    font,
    setFont: (nextFont) => save(colors, selectedPreset, nextFont),
    reset: () => save(defaultTheme.colors, defaultTheme.id, fontChoices[0]),
  }), [colors, selectedPreset, font, save]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
