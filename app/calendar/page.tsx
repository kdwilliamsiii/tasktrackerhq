"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell, PrimaryButton } from "../components/app-shell";
import CalendarEventList, { type CalendarListEvent } from "../../components/CalendarEventList";
import MonthCalendar from "../../components/MonthCalendar";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";
type EventItem = CalendarListEvent;
type EventDraft = { title: string; date: string; time: string; reminderMinutes: string };
const emptyDraft = { title: "", date: new Date().toISOString().slice(0, 10), time: "", reminderMinutes: "30" };

function localDateTimeValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft); const [editingId, setEditingId] = useState<string | null>(null); const [message, setMessage] = useState(""); const [syncing, setSyncing] = useState(""); const [syncMonthsBack, setSyncMonthsBack] = useState("3");
  const integrationsRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const { notify } = useNotifications();
  useEffect(() => {
    const load = window.setTimeout(() => {
      try { setEvents(JSON.parse(localStorage.getItem("tasktracker-events") || "[]")); } catch { setEvents([]); }
    }, 0);
    return () => window.clearTimeout(load);
  }, []);
  useEffect(() => {
    const check = window.setTimeout(() => {
      const now = Date.now();
      const soon = events.find((event) => event.time && (event.reminderMinutes ?? 30) > 0 && new Date(event.time).getTime() > now && new Date(event.time).getTime() - now < (event.reminderMinutes ?? 30) * 60 * 1000);
      if (soon && !sessionStorage.getItem(`tasktracker-event-${soon.id}`)) {
        notify(`${soon.title} starts soon.`, "warning");
        sessionStorage.setItem(`tasktracker-event-${soon.id}`, "1");
      }
    }, 0);
    return () => window.clearTimeout(check);
  }, [events, notify]);
  function updateDraft(field: keyof EventDraft, value: string) { setDraft((current) => ({ ...current, [field]: value })); }
  function resetDraft() { setEditingId(null); setDraft({ ...emptyDraft, date: new Date().toISOString().slice(0, 10) }); }
  function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const time = draft.time ? new Date(draft.time).toISOString() : undefined;
    const updated: EventItem = { id: editingId || crypto.randomUUID(), title: draft.title.trim(), date: draft.date, time, provider: "Local", reminderMinutes: Number(draft.reminderMinutes) };
    const next = editingId ? events.map((event) => event.id === editingId ? { ...event, ...updated } : event) : [...events, updated];
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    resetDraft();
    notify(editingId ? "Calendar event updated." : "Calendar event added.", "success");
  }
  function editEvent(event: EventItem) {
    setEditingId(event.id);
    setDraft({ title: event.title, date: event.date.slice(0, 10), time: localDateTimeValue(event.time), reminderMinutes: String(event.reminderMinutes ?? 30) });
  }
  function deleteEvent(event: EventItem) {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const next = events.filter((item) => item.id !== event.id);
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    if (editingId === event.id) resetDraft();
    notify("Calendar event deleted.", "info");
  }
  function focusIntegrations() {
    integrationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => integrationsRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(), 250);
  }
  function selectDate(dateKey: string) {
    setDraft((current) => ({ ...current, date: dateKey }));
  }
  function openEventFromCalendar(event: EventItem) {
    if (event.provider && event.provider !== "Local") {
      notify(`${event.provider} events are read-only here. Edit them in ${event.provider}.`, "info");
      return;
    }
    editEvent(event);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function moveEvent(eventId: string, dateKey: string) {
    const target = events.find((event) => event.id === eventId);
    if (!target || (target.provider && target.provider !== "Local")) return;
    if (target.date.slice(0, 10) === dateKey) return;
    let time = target.time;
    if (time) {
      const [year, month, day] = dateKey.split("-").map(Number);
      const updated = new Date(time);
      updated.setFullYear(year, month - 1, day);
      time = updated.toISOString();
    }
    const next = events.map((event) => event.id === eventId ? { ...event, date: dateKey, time } : event);
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    notify(`"${target.title}" moved to ${dateKey}.`, "success");
  }
  async function sync(provider: string) {
    setSyncing(provider);
    setMessage("");
    try {
      const response = await fetch("/api/calendar-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, monthsBack: Number(syncMonthsBack) }) });
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
      notify(`${provider} calendar updated.`, "success");
    } catch {
      setMessage(`Unable to reach the ${provider} calendar service.`);
    } finally {
      setSyncing("");
    }
  }
  return <AppShell active="Calendar" eyebrow="Workspace" title="Calendar" description="See what's happening and keep your commitments in view." action={<PrimaryButton onClick={focusIntegrations}>Connect calendar</PrimaryButton>}>
    <TTBotHint command="show today's schedule">TT Bot can help you spot meetings starting soon and keep your schedule in view.</TTBotHint>
    <MonthCalendar events={events} selectedDate={draft.date} onSelectDate={selectDate} onEventClick={openEventFromCalendar} onEventDrop={moveEvent} />
    <div className="dashboard-grid"><section className="panel" ref={formRef}><div className="panel-header"><div><h2>{editingId ? "Edit event" : "Add an event"}</h2><p>{editingId ? "Update your local event details." : "Add a local event or connect a calendar below."}</p></div>{editingId && <button className="text-button" type="button" onClick={resetDraft}>Cancel edit</button>}</div><form className="event-form" onSubmit={saveEvent}><input required value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} placeholder="Event title" aria-label="Event title" /><input required type="date" value={draft.date} onChange={(e) => updateDraft("date", e.target.value)} aria-label="Event date" /><input type="time" value={draft.time} onChange={(e) => updateDraft("time", e.target.value)} aria-label="Event time" /><select value={draft.reminderMinutes} onChange={(e) => updateDraft("reminderMinutes", e.target.value)} aria-label="Reminder"><option value="0">No reminder</option><option value="5">5 min before</option><option value="15">15 min before</option><option value="30">30 min before</option><option value="60">1 hour before</option></select><button className="primary-button" type="submit">{editingId ? "Save changes" : "Add event"}</button></form><CalendarEventList events={[...events].sort((a,b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`))} onEdit={editEvent} onDelete={deleteEvent} />{!events.length && <p className="empty-state">No events yet.</p>}</section><section className="panel" ref={integrationsRef} tabIndex={-1}><h2>Calendar integrations</h2><p className="panel-subtitle">Connect a provider to sync events.</p><label className="sync-range-label">Sync events from the last<select value={syncMonthsBack} onChange={(e) => setSyncMonthsBack(e.target.value)} aria-label="Sync range"><option value="1">1 month</option><option value="3">3 months</option><option value="6">6 months</option><option value="12">1 year</option></select></label><div className="integration-row"><span>Google Calendar</span><button className="filter-button" disabled={Boolean(syncing)} onClick={() => sync("google")}>{syncing === "google" ? "Syncing..." : "Sync"}</button></div><div className="integration-row"><span>Microsoft Outlook</span><button className="filter-button" disabled={Boolean(syncing)} onClick={() => sync("microsoft")}>{syncing === "microsoft" ? "Syncing..." : "Sync"}</button></div>{message && <p className="form-success" role="status">{message}</p>}</section></div>
  </AppShell>;
}
