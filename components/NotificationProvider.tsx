"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "./Toast";

export type NotificationTone = "success" | "info" | "warning" | "error";
export type AppNotification = { id: string; message: string; tone: NotificationTone; read: boolean };

export type SoundOption = "chime" | "bell" | "pop" | "gentle" | "marimba" | "silent";

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  silentMode: boolean;
  soundOption: SoundOption;
  setSilentMode: (silent: boolean) => void;
  setSoundOption: (sound: SoundOption) => void;
  playSound: (sound?: SoundOption) => void;
  notify: (message: string, tone?: NotificationTone) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function playNotificationTone(sound: SoundOption) {
  if (sound === "silent" || typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (sound === "chime") {
      // Gentle dual-tone synth chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.25); // E6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (sound === "bell") {
      // Clear metallic bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } else if (sound === "pop") {
      // Short crisp pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (sound === "gentle") {
      // Soft warm pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } else if (sound === "marimba") {
      // Wooden marimba strike
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.exponentialRampToValueAtTime(392.0, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {
    // Ignore web audio block
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  
  const [silentMode, setSilentModeState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tasktracker-silent-mode") === "true";
    }
    return false;
  });

  const [soundOption, setSoundOptionState] = useState<SoundOption>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tasktracker-sound-option") as SoundOption) || "chime";
    }
    return "chime";
  });

  const setSilentMode = useCallback((silent: boolean) => {
    setSilentModeState(silent);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasktracker-silent-mode", String(silent));
    }
  }, []);

  const setSoundOption = useCallback((sound: SoundOption) => {
    setSoundOptionState(sound);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasktracker-sound-option", sound);
    }
  }, []);

  const playSound = useCallback((sound?: SoundOption) => {
    const selected = sound || soundOption;
    if (silentMode || selected === "silent") return;
    playNotificationTone(selected);
  }, [silentMode, soundOption]);

  const notify = useCallback((message: string, tone: NotificationTone = "info") => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { id, message, tone, read: false }].slice(-30));
    setVisibleIds((current) => [...current, id].slice(-4));
    
    // Play audio tone if not silent
    playSound();

    window.setTimeout(() => setVisibleIds((current) => current.filter((item) => item !== id)), 4500);
  }, [playSound]);

  const dismissToast = useCallback((id: string) => {
    setVisibleIds((current) => current.filter((item) => item !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    silentMode,
    soundOption,
    setSilentMode,
    setSoundOption,
    playSound,
    notify,
    markAsRead,
    markAllAsRead,
  }), [notifications, unreadCount, silentMode, soundOption, setSilentMode, setSoundOption, playSound, notify, markAsRead, markAllAsRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-stack" aria-live="polite" aria-atomic="false">
        {notifications.filter((item) => visibleIds.includes(item.id)).map((item) => (
          <Toast key={item.id} message={item.message} tone={item.tone} onDismiss={() => dismissToast(item.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
