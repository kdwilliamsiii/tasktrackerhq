"use client";

import { useNotifications, SoundOption } from "./NotificationProvider";

const SOUND_LABELS: { value: SoundOption; label: string }[] = [
  { value: "chime", label: "Chime (Default)" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
  { value: "gentle", label: "Gentle" },
  { value: "marimba", label: "Marimba" },
  { value: "silent", label: "Silent" },
];

export default function NotificationSettings() {
  const { silentMode, soundOption, setSilentMode, setSoundOption, playSound, notify } = useNotifications();

  return (
    <section className="panel notification-settings-panel">
      <div className="settings-heading">
        <div>
          <h2>Smart Notifications &amp; Audio</h2>
          <p>Customize alert sounds, test tones, or toggle Silent Mode.</p>
        </div>
      </div>

      <div className="setting-line">
        <div>
          <strong>Silent Mode</strong>
          <small>Mute all audio chimes and toast sound effects</small>
        </div>
        <button
          type="button"
          className={"toggle" + (silentMode ? " on" : "")}
          onClick={() => setSilentMode(!silentMode)}
          aria-label="Toggle Silent Mode"
        >
          <i />
        </button>
      </div>

      <div className="setting-line">
        <div>
          <strong>Alert Sound</strong>
          <small>Select sound effect for new task and calendar alerts</small>
        </div>
        <div className="sound-picker-row">
          <select
            value={soundOption}
            onChange={(e) => {
              const selected = e.target.value as SoundOption;
              setSoundOption(selected);
              playSound(selected);
            }}
            disabled={silentMode}
            aria-label="Notification Sound"
          >
            {SOUND_LABELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="filter-button"
            onClick={() => {
              playSound(soundOption);
              notify("Sample notification test!", "info");
            }}
            disabled={silentMode || soundOption === "silent"}
          >
            ?? Test Sound
          </button>
        </div>
      </div>
    </section>
  );
}
