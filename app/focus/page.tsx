"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, Sparkles, Coffee, Lock } from "lucide-react";
import { useAuthGate } from "../../components/AuthModalProvider";
import { broadcastDataChanged, subscribeToDataSync } from "../../lib/sync";

type FocusStats = { sessions: number; minutes: number; lastSession?: string; sessionDates?: string[] };
type TaskItem = { id: string; title: string; completed: boolean; priority: string; category?: string };

const defaultStats: FocusStats = { sessions: 0, minutes: 0 };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Gentle Web Audio API synthesizer for timer chimes
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  } catch {
    // AudioContext blocked or not allowed
  }
}

export default function FocusPage() {
  const [mode, setMode] = useState<"pomodoro" | "shortBreak" | "longBreak" | "custom">("pomodoro");
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<FocusStats>(defaultStats);
  const [hydrated, setHydrated] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ambientSound, setAmbientSound] = useState<"off" | "rain" | "noise">("off");
  const { notify } = useNotifications();
  const { requireAuth } = useAuthGate();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  const loadFocusData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("tasktracker-focus-stats") || "null") as FocusStats | null;
      if (saved) setStats({ sessions: saved.sessions || 0, minutes: saved.minutes || 0, lastSession: saved.lastSession, sessionDates: saved.sessionDates || [] });
    } catch {
      setStats(defaultStats);
    }

    fetch("/api/tasks", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks.filter((t: TaskItem) => !t.completed));
        }
      })
      .catch(() => {});
  };

  // Load stats & tasks
  useEffect(() => {
    loadFocusData();
    const unsubscribe = subscribeToDataSync(() => {
      loadFocusData();
    });
    setHydrated(true);
    return () => unsubscribe();
  }, []);

  // Sync timer to document tab title
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (running) {
      document.title = `(${formatTime(remaining)}) Focus Mode | TaskTrackerHQ`;
    } else {
      document.title = "Focus Mode | TaskTrackerHQ";
    }
  }, [remaining, running]);

  // Ambient sound synthesizer
  useEffect(() => {
    if (ambientSound === "off" || !running) {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        noiseNodeRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (ambientSound === "rain") {
          output[i] = (lastOut + 0.02 * white) / 1.02; // Brown/pink noise for soothing rain
          lastOut = output[i];
          output[i] *= 3.5;
        } else {
          output[i] = white * 0.15; // Soft white noise
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = ambientSound === "rain" ? "lowpass" : "bandpass";
      filter.frequency.value = ambientSound === "rain" ? 800 : 1200;

      const gain = ctx.createGain();
      gain.gain.value = 0.04;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
      noiseNodeRef.current = whiteNoise;
    } catch {
      // Audio autoplay restrictions
    }

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [ambientSound, running]);

  // Countdown loop
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) return current - 1;

        setRunning(false);
        if (soundEnabled) playChime();

        if (mode === "pomodoro") {
          notify("Session complete! Great work. Take a 5-minute break.", "success");
          setStats((currentStats) => {
            const completedAt = new Date().toISOString();
            const next = {
              sessions: currentStats.sessions + 1,
              minutes: currentStats.minutes + duration,
              lastSession: completedAt,
              sessionDates: [...(currentStats.sessionDates || []), completedAt].slice(-365)
            };
            localStorage.setItem("tasktracker-focus-stats", JSON.stringify(next));
            broadcastDataChanged("focus-session-completed");
            return next;
          });
        } else {
          notify("Break finished! Ready to focus again?", "info");
        }
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, duration, mode, soundEnabled, notify]);

  function switchMode(newMode: "pomodoro" | "shortBreak" | "longBreak" | "custom", mins: number) {
    if (running) return;
    setMode(newMode);
    setDuration(mins);
    setRemaining(mins * 60);
  }

  function reset() {
    setRunning(false);
    setRemaining(duration * 60);
  }

  async function completeFocusTask() {
    if (!selectedTaskId) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTaskId, completed: true })
      });
      if (res.ok) {
        notify("Focused task marked as completed! 🎉", "success");
        setTasks(prev => prev.filter(t => t.id !== selectedTaskId));
        setSelectedTaskId("");
        broadcastDataChanged("focus-task-completed");
      }
    } catch {
      notify("Could not update task.", "error");
    }
  }

  const progress = duration > 0 ? ((duration * 60 - remaining) / (duration * 60)) * 100 : 0;
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <AppShell active="Focus" eyebrow="Workspace" title="Focus Mode" description="A quiet, high-productivity space with Pomodoro timing and ambient audio.">
      <main className="focus-page">
        {/* Mode Selector Tabs */}
        <div className="focus-mode-tabs">
          <button
            type="button"
            className={`focus-mode-tab ${mode === "pomodoro" && duration === 25 ? "active" : ""}`}
            onClick={() => switchMode("pomodoro", 25)}
            disabled={running}
          >
            ⚡ Focus (25m)
          </button>
          <button
            type="button"
            className={`focus-mode-tab ${mode === "pomodoro" && duration === 50 ? "active" : ""}`}
            onClick={() => switchMode("pomodoro", 50)}
            disabled={running}
          >
            🎯 Deep Work (50m)
          </button>
          <button
            type="button"
            className={`focus-mode-tab ${mode === "shortBreak" ? "active" : ""}`}
            onClick={() => switchMode("shortBreak", 5)}
            disabled={running}
          >
            ☕ Short Break (5m)
          </button>
          <button
            type="button"
            className={`focus-mode-tab ${mode === "longBreak" ? "active" : ""}`}
            onClick={() => switchMode("longBreak", 15)}
            disabled={running}
          >
            🌿 Long Break (15m)
          </button>
        </div>

        {/* Focus Timer Hero Card */}
        <section className="focus-card">
          <span className="focus-kicker">
            {running ? "STAY FOCUSED" : remaining === 0 ? "SESSION COMPLETE" : "READY WHEN YOU ARE"}
          </span>
          <div className="focus-timer" aria-live="polite">
            {formatTime(remaining)}
          </div>
          <p className="focus-message">
            {selectedTask ? (
              <span style={{ color: "#fff", fontWeight: 600 }}>
                Working on: {selectedTask.title}
              </span>
            ) : running ? (
              "One task. Zero distractions."
            ) : remaining === 0 ? (
              "Great session! Take a breath."
            ) : (
              "Select your duration and hit Start."
            )}
          </p>

          <div className="focus-progress">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="focus-controls">
            <button
              className="focus-primary"
              onClick={() => {
                if (!running) {
                  requireAuth(() => setRunning(true), "Sign in with Google or Microsoft to start focus sessions and track streaks.");
                } else {
                  setRunning(false);
                }
              }}
              disabled={!hydrated}
            >
              {running ? (
                <>
                  <Pause size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Pause
                </>
              ) : remaining === 0 ? (
                <>
                  <RotateCcw size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Start Again
                </>
              ) : (
                <>
                  <Play size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
                  Start Focus
                </>
              )}
            </button>
            <button className="focus-reset" onClick={reset}>
              Reset
            </button>
          </div>

          {/* Audio & Ambience Controls */}
          <div className="focus-audio-bar">
            <button
              type="button"
              className={`focus-audio-btn ${soundEnabled ? "active" : ""}`}
              onClick={() => setSoundEnabled(s => !s)}
              title="Toggle Bell Sound"
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>{soundEnabled ? "Bell ON" : "Bell OFF"}</span>
            </button>

            <button
              type="button"
              className={`focus-audio-btn ${ambientSound === "rain" ? "active" : ""}`}
              onClick={() => setAmbientSound(a => (a === "rain" ? "off" : "rain"))}
              title="Synthesized Rain Sound"
            >
              🌧️ <span>Rain Ambience</span>
            </button>

            <button
              type="button"
              className={`focus-audio-btn ${ambientSound === "noise" ? "active" : ""}`}
              onClick={() => setAmbientSound(a => (a === "noise" ? "off" : "noise"))}
              title="Soft White Noise"
            >
              🌊 <span>White Noise</span>
            </button>
          </div>
        </section>

        {/* Task Focus Attachment */}
        <section className="focus-task-picker">
          <div className="focus-task-picker-header">
            <strong>🎯 Focus on a Task</strong>
            {selectedTaskId && (
              <button
                type="button"
                className="btn-complete-focus-task"
                onClick={completeFocusTask}
              >
                <CheckCircle2 size={13} /> Mark Task Done
              </button>
            )}
          </div>
          <div className="focus-task-select-row">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="focus-task-select"
            >
              <option value="">-- Choose a task to work on during this session --</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.priority}] {t.title} {t.category ? `(${t.category})` : ""}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Statistics Cards */}
        <section className="focus-stats">
          <div>
            <strong>{stats.sessions}</strong>
            <span>Sessions completed</span>
          </div>
          <div>
            <strong>{stats.minutes}</strong>
            <span>Focused minutes</span>
          </div>
          <div>
            <strong>
              {stats.lastSession
                ? new Date(stats.lastSession).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </strong>
            <span>Last session</span>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

