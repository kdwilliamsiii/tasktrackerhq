"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";

type FocusStats = { sessions: number; minutes: number; lastSession?: string; sessionDates?: string[] };
const defaultStats: FocusStats = { sessions: 0, minutes: 0 };

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function FocusPage() {
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<FocusStats>(defaultStats);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("tasktracker-focus-stats") || "null") as FocusStats | null;
        if (saved) setStats({ sessions: saved.sessions || 0, minutes: saved.minutes || 0, lastSession: saved.lastSession, sessionDates: saved.sessionDates || [] });
      } catch {
        setStats(defaultStats);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(load);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) return current - 1;
        setRunning(false);
        setStats((currentStats) => {
          const completedAt = new Date().toISOString();
          const next = { sessions: currentStats.sessions + 1, minutes: currentStats.minutes + duration, lastSession: completedAt, sessionDates: [...(currentStats.sessionDates || []), completedAt].slice(-365) };
          localStorage.setItem("tasktracker-focus-stats", JSON.stringify(next));
          return next;
        });
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, duration]);

  function chooseDuration(minutes: number) {
    if (running) return;
    setDuration(minutes);
    setRemaining(minutes * 60);
  }

  function reset() {
    setRunning(false);
    setRemaining(duration * 60);
  }

  const progress = ((duration * 60 - remaining) / (duration * 60)) * 100;

  return (
    <AppShell active="Focus" eyebrow="Workspace" title="Focus Mode" description="A quiet space to do your best work.">
      <main className="focus-page">
        <section className="focus-card">
          <span className="focus-kicker">{running ? "STAY FOCUSED" : remaining === 0 ? "SESSION COMPLETE" : "READY WHEN YOU ARE"}</span>
          <div className="focus-timer" aria-live="polite">{formatTime(remaining)}</div>
          <p className="focus-message">{running ? "One task. No distractions." : remaining === 0 ? "Nice work. Take a short break." : "Choose a session and start when you’re ready."}</p>
          <div className="focus-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="focus-controls">
            <button className="focus-primary" onClick={() => setRunning((value) => !value)} disabled={!hydrated}>{running ? "Pause" : remaining === 0 ? "Start again" : "Start focus"}</button>
            <button className="focus-reset" onClick={reset}>Reset</button>
          </div>
          <div className="focus-presets" aria-label="Session length">
            {[15, 25, 50].map((minutes) => <button className={duration === minutes ? "selected" : ""} key={minutes} onClick={() => chooseDuration(minutes)} disabled={running}>{minutes} min</button>)}
          </div>
        </section>
        <section className="focus-stats">
          <div><strong>{stats.sessions}</strong><span>Sessions completed</span></div>
          <div><strong>{stats.minutes}</strong><span>Focused minutes</span></div>
          <div><strong>{stats.lastSession ? new Date(stats.lastSession).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</strong><span>Last session</span></div>
        </section>
        <p className="focus-note">Put your notifications away, pick one task, and give it your full attention.</p>
      </main>
    </AppShell>
  );
}
