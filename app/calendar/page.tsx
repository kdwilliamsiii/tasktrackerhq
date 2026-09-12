"use client";
import { useState } from "react";
import { AppShell, PrimaryButton } from "../components/app-shell";
type EventItem = { id: string; date: string; title: string; provider?: string; time?: string; location?: string };
export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("tasktracker-events") || "[]"); } catch { return []; }
  });
  const [title, setTitle] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [message, setMessage] = useState(""); const [syncing, setSyncing] = useState("");
  function add(e: React.FormEvent) { e.preventDefault(); if (!title.trim()) return; const next = [...events, { id: crypto.randomUUID(), title: title.trim(), date, provider: "Local" }]; setEvents(next); localStorage.setItem("tasktracker-events", JSON.stringify(next)); setTitle(""); }
  async function sync(provider: string) {
    setSyncing(provider);
    setMessage("");
    try {
      const response = await fetch("/api/calendar-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.synced) {
        setMessage(result?.reason || result?.error || `Unable to sync ${provider} calendar.`);
        return;
      }
      const syncedEvents = (result.events || []).filter((event: EventItem) => event.date).map((event: EventItem) => ({ ...event, provider: provider === "google" ? "Google" : "Microsoft" }));
      const localEvents = events.filter((event) => event.provider === "Local");
      const next = [...localEvents, ...syncedEvents];
      setEvents(next);
      localStorage.setItem("tasktracker-events", JSON.stringify(next));
      setMessage(`${provider} calendar synced (${syncedEvents.length} events).`);
    } catch {
      setMessage(`Unable to reach the ${provider} calendar service.`);
    } finally {
      setSyncing("");
    }
  }
  return <AppShell active="Calendar" eyebrow="Workspace" title="Calendar" description="See what's happening and keep your commitments in view." action={<PrimaryButton>Connect calendar</PrimaryButton>}>
    <div className="dashboard-grid"><section className="panel"><div className="panel-header"><div><h2>Events</h2><p>Local and connected calendars</p></div></div><form className="event-form" onSubmit={add}><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" aria-label="Event title" /><input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /><button className="primary-button" type="submit">Add event</button></form>{[...events].sort((a,b) => a.date.localeCompare(b.date)).map((event) => <div className="activity-item" key={`${event.provider}-${event.id}`}><strong>{event.date}</strong><span>{event.title}</span><small>{event.provider}{event.location ? ` · ${event.location}` : ""}</small></div>)}{!events.length && <p className="empty-state">No events yet.</p>}</section><section className="panel"><h2>Calendar integrations</h2><p className="panel-subtitle">Connect a provider to sync events.</p><div className="integration-row"><span>Google Calendar</span><button className="filter-button" disabled={Boolean(syncing)} onClick={() => sync("google")}>{syncing === "google" ? "Syncing..." : "Sync"}</button></div><div className="integration-row"><span>Microsoft Outlook</span><button className="filter-button" disabled={Boolean(syncing)} onClick={() => sync("microsoft")}>{syncing === "microsoft" ? "Syncing..." : "Sync"}</button></div>{message && <p className="form-success" role="status">{message}</p>}</section></div>
  </AppShell>;
}
