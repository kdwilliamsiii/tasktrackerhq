"use client";

import { fontChoices, themePresets, useTheme, type ThemeColors, type ThemeOptions } from "./ThemeProvider";

type ColorGroup = {
  title: string;
  items: Array<{ key: keyof ThemeColors; label: string; swatches: string[] }>;
};

const colorGroups: ColorGroup[] = [
  {
    title: "Sidebar & Navigation Drawer",
    items: [
      { key: "sidebar", label: "Sidebar Background", swatches: ["#ffffff", "#17283d", "#2563eb", "#16a05d", "#9333ea", "#18181b"] },
      { key: "sidebarText", label: "Sidebar Font Color", swatches: ["#17283d", "#ffffff", "#3b82f6", "#10b981", "#a855f7", "#64748b"] },
      { key: "sidebarActive", label: "Active Item Background", swatches: ["#e9f7f4", "#1e3a8a", "#15803d", "#6b21a8", "#27272a", "#3b82f6"] },
    ],
  },
  {
    title: "Top Header Bar",
    items: [
      { key: "topbar", label: "Topbar Background", swatches: ["#ffffff", "#f8fafc", "#e0ecff", "#d9fbe7", "#f4e7ff", "#18181b"] },
      { key: "topbarText", label: "Topbar Font Color", swatches: ["#344258", "#17283d", "#1e3a8a", "#166534", "#6b21a8", "#ffffff"] },
    ],
  },
  {
    title: "Primary Accents & Buttons",
    items: [
      { key: "teal", label: "Accent Color", swatches: ["#36b7a2", "#06b6d4", "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e"] },
      { key: "orange", label: "Highlight Color", swatches: ["#e9825b", "#fb7c24", "#f59e0b", "#ef4444", "#ec4899", "#84cc16"] },
      { key: "navy", label: "Primary Button & Brand", swatches: ["#17283d", "#1e293b", "#1d4ed8", "#15803d", "#7e22ce", "#0f172a"] },
    ],
  },
  {
    title: "Main Background & Cards",
    items: [
      { key: "background", label: "Page Background", swatches: ["#f6f8fb", "#ffffff", "#f1f5f9", "#0f172a", "#18181b", "#fafafa"] },
      { key: "foreground", label: "Main Font Color", swatches: ["#182230", "#0f172a", "#1e293b", "#334155", "#ffffff", "#f8fafc"] },
      { key: "surface", label: "Card Background", swatches: ["#ffffff", "#f8fafc", "#1e293b", "#18181b", "#0f172a", "#27272a"] },
      { key: "muted", label: "Muted Text", swatches: ["#748094", "#64748b", "#94a3b8", "#a1a1aa", "#475569", "#98a3b0"] },
      { key: "line", label: "Border Lines", swatches: ["#e5e9f0", "#cbd5e1", "#e2e8f0", "#334155", "#27272a", "#475569"] },
    ],
  },
];

export default function ThemeCustomizer() {
  const { colors, selectedPreset, applyPreset, updateColor, reset, font, setFont, sidebarFont, setSidebarFont, topbarFont, setTopbarFont, options, updateOption } = useTheme();

  return (
    <section className="panel theme-panel">
      <div className="settings-heading">
        <div>
          <h2>Appearance &amp; Theme Studio</h2>
          <p>Pick a preset or customize every color, font, and style with live workspace preview.</p>
        </div>
        <button className="filter-button" type="button" onClick={reset}>
          Reset Defaults
        </button>
      </div>

      {/* Preset Themes */}
      <div className="theme-section">
        <h3 className="custom-colors-title">Theme Presets</h3>
        <div className="theme-presets" aria-label="Color themes">
          {themePresets.map((preset) => (
            <button
              className={"theme-preset" + (selectedPreset === preset.id ? " selected" : "")}
              type="button"
              key={preset.id}
              onClick={() => applyPreset(preset)}
              aria-pressed={selectedPreset === preset.id}
            >
              <span className="theme-swatch" style={{ background: preset.colors.background, borderColor: preset.colors.sidebar }}>
                <i style={{ background: preset.colors.sidebar }} />
                <i style={{ background: preset.colors.topbar }} />
                <i style={{ background: preset.colors.teal }} />
                <i style={{ background: preset.colors.orange }} />
              </span>
              <strong>{preset.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Live Workspace Mini Preview */}
      <div className="theme-preview-card" style={{ background: colors.background, color: colors.foreground, borderColor: colors.line }}>
        <div className="preview-mini-sidebar" style={{ background: colors.sidebar, color: colors.sidebarText, fontFamily: sidebarFont.family }}>
          <strong style={{ color: colors.sidebarText }}>TaskTrackerHQ</strong>
          <span className="preview-mini-nav active" style={{ background: colors.sidebarActive, color: colors.sidebarText }}>
            ? Overview
          </span>
          <span className="preview-mini-nav" style={{ color: colors.sidebarText }}>
            ? Tasks
          </span>
        </div>
        <div className="preview-mini-main">
          <div className="preview-mini-topbar" style={{ background: colors.topbar, color: colors.topbarText, fontFamily: topbarFont.family, borderColor: colors.line }}>
            <span>Workspace / Dashboard</span>
            <span className="preview-mini-bell" style={{ background: colors.orange }}>?</span>
          </div>
          <div className="preview-mini-content">
            <div className="preview-mini-panel" style={{ background: colors.surface, borderColor: colors.line }}>
              <strong>Live Workspace Preview</strong>
              <small style={{ color: colors.muted }}>Custom colors apply across Web App, Mobile PWA &amp; Extension.</small>
              <button type="button" className="preview-mini-btn" style={{ background: colors.navy, color: "#ffffff" }}>
                Primary Action
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Color Groups with 1-Click Swatches */}
      <div className="theme-section">
        <h3 className="custom-colors-title">Custom Colors &amp; Quick Swatches</h3>
        <div className="color-groups-container">
          {colorGroups.map((group) => (
            <div className="color-group-card" key={group.title}>
              <h4>{group.title}</h4>
              <div className="color-picker-grid">
                {group.items.map(({ key, label, swatches }) => {
                  const currentValue = colors[key] || "#000000";
                  return (
                    <div className="color-picker-item" key={key}>
                      <div className="color-picker-label-row">
                        <span>{label}</span>
                        <input
                          type="text"
                          className="hex-input"
                          value={currentValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                              updateColor(key, val);
                            }
                          }}
                        />
                      </div>
                      <div className="color-picker-input-row">
                        <input
                          type="color"
                          value={currentValue.length === 7 ? currentValue : "#000000"}
                          onChange={(event) => updateColor(key, event.target.value)}
                        />
                        <div className="swatch-row">
                          {swatches.map((hex) => (
                            <button
                              type="button"
                              className={"quick-swatch" + (currentValue.toLowerCase() === hex.toLowerCase() ? " selected" : "")}
                              key={hex}
                              style={{ background: hex }}
                              onClick={() => updateColor(key, hex)}
                              title={"Apply " + hex}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography & Fonts */}
      <div className="theme-section">
        <h3 className="custom-colors-title">Typography &amp; Fonts</h3>
        <div className="font-choices" aria-label="Font choices">
          {fontChoices.map((choice) => (
            <button
              className={"font-choice" + (font.id === choice.id ? " selected" : "")}
              type="button"
              key={choice.id}
              onClick={() => setFont(choice)}
              style={{ fontFamily: choice.family }}
              aria-pressed={font.id === choice.id}
            >
              {choice.name}
            </button>
          ))}
        </div>

        <div className="bar-font-settings">
          <label>
            Sidebar Font
            <select
              value={sidebarFont.id}
              onChange={(event) => setSidebarFont(fontChoices.find((choice) => choice.id === event.target.value) || fontChoices[0])}
            >
              {fontChoices.map((choice) => (
                <option value={choice.id} key={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Top Bar Font
            <select
              value={topbarFont.id}
              onChange={(event) => setTopbarFont(fontChoices.find((choice) => choice.id === event.target.value) || fontChoices[0])}
            >
              {fontChoices.map((choice) => (
                <option value={choice.id} key={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Interface Style */}
      <div className="theme-section">
        <h3 className="custom-colors-title">Interface Style</h3>
        <div className="style-controls">
          <label>
            Corner Style
            <select value={options.radius} onChange={(event) => updateOption("radius", event.target.value as ThemeOptions["radius"])}>
              <option value="sharp">Sharp</option>
              <option value="soft">Soft</option>
              <option value="round">Round</option>
            </select>
          </label>
          <label>
            Spacing &amp; Density
            <select value={options.density} onChange={(event) => updateOption("density", event.target.value as ThemeOptions["density"])}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="airy">Airy</option>
            </select>
          </label>
          <label className="style-toggle">
            <input type="checkbox" checked={options.shadows} onChange={(event) => updateOption("shadows", event.target.checked)} />
            Card Shadows
          </label>
        </div>
      </div>
    </section>
  );
}
