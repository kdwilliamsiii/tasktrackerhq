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
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState("");
  const [syncMonthsBack, setSyncMonthsBack] = useState("3");
  const [eventFilter, setEventFilter] = useState("All");
  const integrationsRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const { notify } = useNotifications();

  // Load events from database & localStorage
  const loadEvents = async () => {
    try {
      const localStored = JSON.parse(localStorage.getItem("tasktracker-events") || "[]") as EventItem[];
      // Keep only current local storage events and map uniquely
      const map = new Map<string, EventItem>();
      for (const e of localStored) {
        const key = (e.provider || "Local") + "-" + e.id;
        map.set(key, e);
      }
      const uniqueList = Array.from(map.values());
      setEvents(uniqueList);
      localStorage.setItem("tasktracker-events", JSON.stringify(uniqueList));
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const check = window.setTimeout(() => {
      const now = Date.now();
      const soon = events.find(
        (event) =>
          event.time &&
          (event.reminderMinutes ?? 30) > 0 &&
          new Date(event.time).getTime() > now &&
          new Date(event.time).getTime() - now < (event.reminderMinutes ?? 30) * 60 * 1000
      );
      if (soon && !sessionStorage.getItem("tasktracker-event-" + soon.id)) {
        notify(soon.title + " starts soon.", "warning");
        sessionStorage.setItem("tasktracker-event-" + soon.id, "1");
      }
    }, 0);
    return () => window.clearTimeout(check);
  }, [events, notify]);

  function updateDraft(field: keyof EventDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setEditingId(null);
    setDraft({ ...emptyDraft, date: new Date().toISOString().slice(0, 10) });
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const target = events.find((item) => item.id === editingId);
    const time = draft.time ? new Date(draft.time).toISOString() : undefined;

    // 2-Way Sync for Google events
    if (target?.provider === "Google") {
      notify("Updating Google Calendar...", "info");
      try {
        const res = await fetch("/api/calendar-sync", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: target.id,
            provider: "Google",
            title: draft.title.trim(),
            date: draft.date,
            time,
          }),
        });
        if (!res.ok) throw new Error("Failed");
        notify("Google Calendar event updated!", "success");
      } catch {
        notify("Failed to update Google Calendar. Reconnect Google if needed.", "error");
      }
    }

    const updated: EventItem = {
      id: editingId || crypto.randomUUID(),
      title: draft.title.trim(),
      date: draft.date,
      time,
      provider: target?.provider || "Local",
      reminderMinutes: Number(draft.reminderMinutes),
    };

    if (updated.provider === "Local") {
      try {
        await fetch("/api/events", {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
      } catch {
        // Offline fallback
      }
    }

    const next = editingId
      ? events.map((event) => (event.id === editingId ? { ...event, ...updated } : event))
      : [...events, updated];

    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    resetDraft();
    if (target?.provider !== "Google") {
      notify(editingId ? "Calendar event updated." : "Calendar event added.", "success");
    }
  }

  function editEvent(event: EventItem) {
    if (event.provider && event.provider !== "Local" && event.provider !== "Google") {
      notify(event.provider + " events are read-only here. Edit them in " + event.provider + ".", "info");
      return;
    }
    setEditingId(event.id);
    setDraft({
      title: event.title,
      date: event.date.slice(0, 10),
      time: localDateTimeValue(event.time),
      reminderMinutes: String(event.reminderMinutes ?? 30),
    });
  }

  async function deleteEvent(event: EventItem) {
    if (!window.confirm('Delete "' + event.title + '"?')) return;

    if (event.provider === "Google") {
      notify("Deleting from Google Calendar...", "info");
      try {
        await fetch("/api/calendar-sync", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: event.id, provider: "Google" }),
        });
        notify("Google Calendar event deleted.", "success");
      } catch {
        notify("Failed to delete from Google Calendar.", "error");
      }
    } else if (event.provider && event.provider !== "Local") {
      notify(event.provider + " events are read-only here.", "info");
      return;
    }

    // Delete from Database API
    try {
      await fetch("/api/events?id=" + encodeURIComponent(event.id), {
        method: "DELETE",
      });
    } catch {
      // Offline fallback
    }

    const next = events.filter((item) => item.id !== event.id);
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    if (editingId === event.id) resetDraft();
    if (event.provider !== "Google") {
      notify("Calendar event deleted.", "info");
    }
  }

  


  function focusIntegrations() {
    integrationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => integrationsRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(), 250);
  }

  function handleTrashDelete(eventId: string) {
    const target = events.find((item) => item.id === eventId);
    if (!target) return;
    deleteEvent(target);
  }

  function selectDate(dateKey: string) {
    setDraft((current) => ({ ...current, date: dateKey }));
  }

  function openEventFromCalendar(event: EventItem) {
    setEditingId(event.id);
    if (event.provider === "Local" || event.provider === "Google") {
      setDraft({
        title: event.title,
        date: event.date.slice(0, 10),
        time: localDateTimeValue(event.time),
        reminderMinutes: String(event.reminderMinutes ?? 30),
      });
    }
    const itemEl = document.getElementById("event-item-" + event.id);
    if (itemEl) {
      itemEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

    async function handleExternalDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    const textData = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list") || "";
    const htmlData = e.dataTransfer.getData("text/html");

    let title = "";
    if (htmlData) {
      try {
        const doc = new DOMParser().parseFromString(htmlData, "text/html");
        title = (doc.body.textContent || "").trim();
      } catch {
        // Fallback
      }
    }
    if (!title && textData) {
      title = textData.trim();
    }

    title = title.replace(/\s+/g, " ").slice(0, 100);

    if (!title) {
      notify("No text found in dropped item.", "warning");
      return;
    }

    const newEvent: EventItem = {
      id: crypto.randomUUID(),
      title,
      date: dateKey,
      provider: "Local",
      reminderMinutes: 30,
    };

    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
    } catch {
      // Offline
    }

    const next = [...events, newEvent];
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    notify('Created event "' + (title.length > 30 ? title.slice(0, 30) + "..." : title) + '" on ' + dateKey + ".", "success");
  }

  async function moveEvent(eventId: string, dateKey: string) {
    const target = events.find((event) => event.id === eventId);
    if (!target) return;
    if (target.provider && target.provider !== "Local" && target.provider !== "Google") {
      notify(target.provider + " events are read-only here.", "info");
      return;
    }
    if (target.date.slice(0, 10) === dateKey) return;

    let time = target.time;
    if (time) {
      const [year, month, day] = dateKey.split("-").map(Number);
      const updated = new Date(time);
      updated.setFullYear(year, month - 1, day);
      time = updated.toISOString();
    }

    if (target.provider === "Google") {
      notify("Rescheduling in Google Calendar...", "info");
      try {
        await fetch("/api/calendar-sync", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: target.id,
            provider: "Google",
            title: target.title,
            date: dateKey,
            time,
          }),
        });
        notify('"' + target.title + '" rescheduled in Google Calendar!', "success");
      } catch {
        notify("Failed to reschedule in Google Calendar.", "error");
      }
    } else {
      // Save local move to database
      try {
        await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: target.id, date: dateKey, time }),
        });
      } catch {
        // Offline fallback
      }
    }

    const next = events.map((event) => (event.id === eventId ? { ...event, date: dateKey, time } : event));
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    if (target.provider !== "Google") {
      notify('"' + target.title + '" moved to ' + dateKey + ".", "success");
    }
  }

  async function sync(provider: string) {
    setSyncing(provider);
    setMessage("");
    try {
      const response = await fetch("/api/calendar-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, monthsBack: Number(syncMonthsBack) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.synced) {
        setMessage(result?.reason || result?.error || "Unable to sync " + provider + " calendar.");
        return;
      }
      const providerLabel = provider === "google" ? "Google" : "Microsoft";
      const syncedEvents = (result.events || [])
        .filter((event: EventItem) => event.date)
        .map((event: EventItem) => ({ ...event, provider: providerLabel }));
      const keptEvents = events.filter((event) => event.provider !== providerLabel);
      const next = [...keptEvents, ...syncedEvents];
      setEvents(next);
      localStorage.setItem("tasktracker-events", JSON.stringify(next));



      setMessage(provider + " calendar synced (" + syncedEvents.length + " events).");
      notify(provider + " calendar updated.", "success");
    } catch {
      setMessage("Unable to reach the " + provider + " calendar service.");
    } finally {
      setSyncing("");
    }
  }

  
  const filteredEvents = events
    .filter((e) => eventFilter === "All" || (e.provider || "Local") === eventFilter)
    .slice()
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

  return (
    <AppShell
      active="Calendar"
      eyebrow="Workspace"
      title="Calendar"
      description="See what's happening and keep your commitments in view."
      action={<PrimaryButton onClick={focusIntegrations}>Connect calendar</PrimaryButton>}
    >
      <TTBotHint command="show today's schedule">
        TT Bot can help you spot meetings starting soon and keep your schedule in view.
      </TTBotHint>
      <MonthCalendar
        events={events}
        selectedDate={draft.date}
        onSelectDate={selectDate}
        onEventClick={openEventFromCalendar}
        onEventDrop={moveEvent}
        onExternalDrop={handleExternalDrop}
        onEventDelete={handleTrashDelete}
      />
      <div className="dashboard-grid">
        <section className="panel" ref={formRef}>
          <div className="panel-header">
            <div>
              <h2>{editingId ? "Edit event" : "Add an event"}</h2>
              <p>{editingId ? "Update your event details." : "Add a local event or connect a calendar below."}</p>
            </div>
            {editingId && (
              <button className="text-button" type="button" onClick={resetDraft}>
                Cancel edit
              </button>
            )}
          </div>
          <form className="event-form" onSubmit={saveEvent}>
            <input
              required
              value={draft.title}
              onChange={(e) => updateDraft("title", e.target.value)}
              placeholder="Event title"
              aria-label="Event title"
            />
            <input
              required
              type="date"
              value={draft.date}
              onChange={(e) => updateDraft("date", e.target.value)}
              aria-label="Event date"
            />
            <input
              type="time"
              value={draft.time}
              onChange={(e) => updateDraft("time", e.target.value)}
              aria-label="Event time"
            />
            <select
              value={draft.reminderMinutes}
              onChange={(e) => updateDraft("reminderMinutes", e.target.value)}
              aria-label="Reminder"
            >
              <option value="0">No reminder</option>
              <option value="5">5 min before</option>
              <option value="15">15 min before</option>
              <option value="30">30 min before</option>
              <option value="60">1 hour before</option>
            </select>
            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "Add event"}
            </button>
          </form>
          <div className="panel-header" style={{ marginTop: "20px", marginBottom: "12px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
            <div>
              <h2>Scheduled events</h2>
              <p>{filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} shown</p>
            </div>
            <div className="filter-tabs">
              {["All", "Local", "Google", "Microsoft"].map((name) => (
                <button
                  className={eventFilter === name ? "selected" : ""}
                  key={name}
                  onClick={() => setEventFilter(name)}
                  type="button"
                >
                  {name}
                  <b>
                    {name === "All"
                      ? events.length
                      : events.filter((e) => (e.provider || "Local") === name).length}
                  </b>
                </button>
              ))}
            </div>
          </div>
          <CalendarEventList
            selectedEventId={editingId}
            events={filteredEvents}
            onEdit={editEvent}
            onDelete={deleteEvent}
          />
          {!events.length && <p className="empty-state">No events yet.</p>}
        </section>
        <section className="panel" ref={integrationsRef} tabIndex={-1}>
          <h2>Calendar integrations</h2>
          <p className="panel-subtitle">Connect a provider to sync events.</p>
          <label className="sync-range-label">
            Sync events from the last
            <select
              value={syncMonthsBack}
              onChange={(e) => setSyncMonthsBack(e.target.value)}
              aria-label="Sync range"
            >
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">1 year</option>
            </select>
          </label>
          <div className="integration-row">
            <span>Google Calendar</span>
            <button className="filter-button" disabled={Boolean(syncing)} onClick={() => sync("google")}>
              {syncing === "google" ? "Syncing..." : "Sync"}
            </button>
          </div>
          <div className="integration-row">
            <span>Microsoft Outlook</span>
            <button className="filter-button" disabled={Boolean(syncing)} onClick={() => sync("microsoft")}>
              {syncing === "microsoft" ? "Syncing..." : "Sync"}
            </button>
          </div>
          {message && <p className="form-success" role="status">{message}</p>}
        </section>
      </div>
    </AppShell>
  );
}
