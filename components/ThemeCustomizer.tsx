"use client";

import { fontChoices, themePresets, useTheme, type ThemeColors } from "./ThemeProvider";

const colorLabels: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: "navy", label: "Navigation" },
  { key: "teal", label: "Accent" },
  { key: "orange", label: "Highlight" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
];

export default function ThemeCustomizer() {
  const { colors, selectedPreset, applyPreset, updateColor, reset, font, setFont } = useTheme();

  return (
    <section className="panel theme-panel">
      <div className="settings-heading">
        <div><h2>Appearance</h2><p>Choose a preset or make the workspace yours.</p></div>
        <button className="filter-button" type="button" onClick={reset}>Reset</button>
      </div>
      <div className="theme-presets" aria-label="Color themes">
        {themePresets.map((preset) => (
          <button className={`theme-preset ${selectedPreset === preset.id ? "selected" : ""}`} type="button" key={preset.id} onClick={() => applyPreset(preset)} aria-pressed={selectedPreset === preset.id}>
            <span className="theme-swatch" style={{ background: preset.colors.background, borderColor: preset.colors.line }}><i style={{ background: preset.colors.navy }} /><i style={{ background: preset.colors.teal }} /><i style={{ background: preset.colors.orange }} /></span>
            <strong>{preset.name}</strong>
          </button>
        ))}
      </div>
      <h3 className="custom-colors-title">Custom colors</h3>
      <div className="custom-colors">
        {colorLabels.map(({ key, label }) => (
          <label className="color-control" key={key}><input type="color" value={colors[key]} onChange={(event) => updateColor(key, event.target.value)} /><span>{label}</span><code>{colors[key]}</code></label>
        ))}
      </div>
      <div className="font-settings">
        <h3 className="custom-colors-title">Font</h3>
        <div className="font-choices" aria-label="Font choices">
          {fontChoices.map((choice) => (
            <button className={`font-choice ${font.id === choice.id ? "selected" : ""}`} type="button" key={choice.id} onClick={() => setFont(choice)} style={{ fontFamily: choice.family }} aria-pressed={font.id === choice.id}>{choice.name}</button>
          ))}
        </div>
        <label className="color-control font-color-control"><input type="color" value={colors.foreground} onChange={(event) => updateColor("foreground", event.target.value)} /><span>Font color</span><code>{colors.foreground}</code></label>
      </div>
    </section>
  );
}
