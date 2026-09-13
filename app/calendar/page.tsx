"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell, PrimaryButton } from "../components/app-shell";
import CalendarEventList, { type CalendarListEvent } from "../../components/CalendarEventList";
import MonthCalendar from "../../components/MonthCalendar";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";
import { CalendarDays, PlusCircle, Share2, RotateCw, CheckCircle2, Lock } from "lucide-react";
import { useAuthGate } from "../../components/AuthModalProvider";

type EventItem = CalendarListEvent;
type EventDraft = { title: string; date: string; time: string; reminderMinutes: string };
const emptyDraft = { title: "", date: new Date().toISOString().slice(0, 10), time: "", reminderMinutes: "30" };

function localDateTimeValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DEMO_CALENDAR_EVENTS: EventItem[] = [
  { id: "demo-cal-1", title: "Team Architecture Review (Preview)", date: new Date().toISOString().slice(0, 10), time: new Date(Date.now() + 3600000).toISOString(), provider: "Google", reminderMinutes: 15 },
  { id: "demo-cal-2", title: "Project Sprint Planning (Preview)", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: new Date(Date.now() + 86400000 + 7200000).toISOString(), provider: "Microsoft", reminderMinutes: 30 },
  { id: "demo-cal-3", title: "Design Feedback Session (Preview)", date: new Date(Date.now() + 172800000).toISOString().slice(0, 10), provider: "Local", reminderMinutes: 30 },
];

export default function CalendarPage() {
  const { isAuthenticated, requireAuth } = useAuthGate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState("");
  const [syncMonthsBack, setSyncMonthsBack] = useState("3");
  const [eventFilter, setEventFilter] = useState("All");
  const [activeSection, setActiveSection] = useState<"events" | "add" | "integrations">("events");
  const integrationsRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const { notify } = useNotifications();

  // Load events from database & localStorage
  const loadEvents = async () => {
    try {
      const localStored = JSON.parse(localStorage.getItem("tasktracker-events") || "[]") as EventItem[];
      const map = new Map<string, EventItem>();
      for (const e of localStored) {
        map.set((e.provider || "Local") + "-" + e.id, e);
      }

      const res = await fetch("/api/events", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          for (const e of data.events) {
            map.set((e.provider || "Local") + "-" + e.id, e);
          }
        }
      }

      const merged = Array.from(map.values());
      if (merged.length === 0 && !isAuthenticated) {
        setEvents(DEMO_CALENDAR_EVENTS);
      } else {
        setEvents(merged);
        localStorage.setItem("tasktracker-events", JSON.stringify(merged));
      }
    } catch {
      try {
        const stored = JSON.parse(localStorage.getItem("tasktracker-events") || "[]");
        setEvents(stored.length > 0 ? stored : (!isAuthenticated ? DEMO_CALENDAR_EVENTS : []));
      } catch {
        setEvents(!isAuthenticated ? DEMO_CALENDAR_EVENTS : []);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEvents();
    }, 0);
    const autoSyncGoogle = async () => {
      try {
        const syncRes = await fetch("/api/calendar-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "google", monthsBack: Number(syncMonthsBack) }),
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.synced && Array.isArray(syncData.events)) {
            const googleEvents = syncData.events.map((e: EventItem) => ({ ...e, provider: "Google" }));
            setEvents((current) => {
              const kept = current.filter((item) => item.provider !== "Google");
              const next = [...kept, ...googleEvents];
              localStorage.setItem("tasktracker-events", JSON.stringify(next));
              return next;
            });
          }
        }
      } catch {
        // Silent background sync
      }
    };
    void autoSyncGoogle();

    const handleUpdate = () => { void loadEvents(); };
    window.addEventListener("tasktracker-data-changed", handleUpdate);
    window.addEventListener("tasktracker-quick-add", handleUpdate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("tasktracker-data-changed", handleUpdate);
      window.removeEventListener("tasktracker-quick-add", handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!requireAuth(() => {}, "Sign in or attach a Google or Microsoft account to create and manage calendar events.")) {
      return;
    }
    if (!draft.title.trim()) return;
    const target = events.find((item) => item.id === editingId);
    let time: string | undefined = undefined;
    if (draft.time) {
      const dt = new Date(`${draft.date.slice(0, 10)}T${draft.time.slice(0, 5)}:00`);
      if (!Number.isNaN(dt.getTime())) {
        time = dt.toISOString();
      }
    }

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
    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
    resetDraft();
    setActiveSection("events");
    if (target?.provider !== "Google") {
      notify(editingId ? "Calendar event updated." : "Calendar event added.", "success");
    }
  }

  function editEvent(event: EventItem) {
    if (!requireAuth(() => editEvent(event), "Sign in to edit calendar events.")) {
      return;
    }
    if (event.provider && event.provider !== "Local" && event.provider !== "Google") {
      notify(event.provider + " events are read-only here. Edit them in " + event.provider + ".", "info");
      return;
    }
    setEditingId(event.id);
    setActiveSection("add");
    setDraft({
      title: event.title,
      date: event.date.slice(0, 10),
      time: localDateTimeValue(event.time),
      reminderMinutes: String(event.reminderMinutes ?? 30),
    });
  }

  async function deleteEvent(event: EventItem) {
    if (!requireAuth(() => deleteEvent(event), "Sign in to delete calendar events.")) {
      return;
    }
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
    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
    if (editingId === event.id) resetDraft();
    if (event.provider !== "Google") {
      notify("Calendar event deleted.", "info");
    }
  }

  function focusIntegrations() {
    setActiveSection("integrations");
    integrationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (!requireAuth(() => openEventFromCalendar(event), "Sign in to edit calendar events.")) {
      return;
    }
    setEditingId(event.id);
    setActiveSection("add");
    if (event.provider === "Local" || event.provider === "Google") {
      setDraft({
        title: event.title,
        date: event.date.slice(0, 10),
        time: localDateTimeValue(event.time),
        reminderMinutes: String(event.reminderMinutes ?? 30),
      });
    }
  }

  async function handleExternalDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    if (!requireAuth(() => {}, "Sign in or attach a Google or Microsoft account to create events via drag and drop.")) {
      return;
    }
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
    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
    notify('Created event "' + (title.length > 30 ? title.slice(0, 30) + "..." : title) + '" on ' + dateKey + ".", "success");
  }

  async function moveEvent(eventId: string, dateKey: string) {
    if (!requireAuth(() => moveEvent(eventId, dateKey), "Sign in to reschedule calendar events.")) {
      return;
    }
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
      try {
        await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: target.id, date: dateKey, time }),
        });
      } catch {
        // Offline
      }
    }

    const next = events.map((event) => (event.id === eventId ? { ...event, date: dateKey, time } : event));
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
    if (target.provider !== "Google") {
      notify('"' + target.title + '" moved to ' + dateKey + ".", "success");
    }
  }

  async function sync(provider: string) {
    if (!requireAuth(() => sync(provider), "Sign in with Google or Microsoft to sync calendar events.")) {
      return;
    }
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
      if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));

      setMessage(provider + " calendar synced (" + syncedEvents.length + " events).");
      notify(provider + " calendar updated.", "success");
    } catch {
      setMessage("Unable to reach the " + provider + " calendar service.");
    } finally {
      setSyncing("");
    }
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const filteredEvents = events
    .filter((e) => {
      const matchesProvider = eventFilter === "All" || (e.provider || "Local") === eventFilter;
      const eventDateKey = (e.date || "").slice(0, 10);
      return matchesProvider && eventDateKey >= todayKey;
    })
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

      {/* Mobile Hub Navigation Selector */}
      <div className="calendar-hub-nav">
        <button
          type="button"
          className={"hub-tab" + (activeSection === "events" ? " active" : "")}
          onClick={() => setActiveSection("events")}
        >
          <CalendarDays size={16} />
          <span>Events ({filteredEvents.length})</span>
        </button>
        <button
          type="button"
          className={"hub-tab" + (activeSection === "add" ? " active" : "")}
          onClick={() => setActiveSection("add")}
        >
          <PlusCircle size={16} />
          <span>{editingId ? "Edit Event" : "Add Event"}</span>
        </button>
        <button
          type="button"
          className={"hub-tab" + (activeSection === "integrations" ? " active" : "")}
          onClick={() => setActiveSection("integrations")}
        >
          <Share2 size={16} />
          <span>Sync &amp; Integrations</span>
        </button>
      </div>

      <div className="calendar-sections-grid">
        {/* Scheduled Events List Section */}
        {(activeSection === "events" || typeof window !== "undefined") && (
          <section className={"panel calendar-events-panel" + (activeSection !== "events" ? " mobile-hidden-section" : "")}>
            <div className="panel-header calendar-events-header">
              <div className="section-title-badge">
                <CalendarDays size={18} className="badge-icon" />
                <div>
                  <h2>Scheduled events</h2>
                  <p>{filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} shown</p>
                </div>
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
              onReschedule={(event, newDate) => void moveEvent(event.id, newDate)}
              onDelete={deleteEvent}
            />
            {!events.length && <p className="empty-state">No events yet.</p>}
          </section>
        )}

        {/* Add/Edit Event Section */}
        <section className={"panel" + (activeSection !== "add" ? " mobile-hidden-section" : "")} ref={formRef}>
          <div className="panel-header">
            <div className="section-title-badge">
              <PlusCircle size={18} className="badge-icon" />
              <div>
                <h2>{editingId ? "Edit event" : "Add an event"}</h2>
                <p>{editingId ? "Update your event details." : "Add a local event or connect a calendar below."}</p>
              </div>
            </div>
            {editingId && (
              <button className="text-button" type="button" onClick={resetDraft}>
                Cancel edit
              </button>
            )}
          </div>
          <form className="event-form" onSubmit={saveEvent}>
            <div className="event-form-grid">
              <input
                required
                className="event-title-input"
                value={draft.title}
                onChange={(e) => updateDraft("title", e.target.value)}
                placeholder="Event title"
                aria-label="Event title"
              />
              <div className="event-form-row">
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
              </div>
              <button className="primary-button add-event-btn" type="submit">
                {editingId ? "Save changes" : "Add event"}
              </button>
            </div>
          </form>
        </section>

        {/* Calendar Integrations Section */}
        <section className={"panel calendar-integrations-panel" + (activeSection !== "integrations" ? " mobile-hidden-section" : "")} ref={integrationsRef} tabIndex={-1}>
          <div className="panel-header">
            <div className="section-title-badge">
              <Share2 size={18} className="badge-icon" />
              <div>
                <h2>Calendar integrations</h2>
                <p>Connect a provider to sync events into your workspace.</p>
              </div>
            </div>
          </div>

          <div className="sync-range-box">
            <span className="sync-range-title">Sync events from the last</span>
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
          </div>

          <div className="integration-cards-grid">
            <div className="integration-card">
              <div className="integration-info">
                <strong>Google Calendar</strong>
                <small>2-Way sync &amp; rescheduling enabled</small>
              </div>
              <button
                className="filter-button sync-btn"
                disabled={Boolean(syncing)}
                onClick={() => sync("google")}
                type="button"
              >
                {syncing === "google" ? <RotateCw size={14} className="spinning" /> : <CheckCircle2 size={14} />}
                <span>{syncing === "google" ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>

            <div className="integration-card">
              <div className="integration-info">
                <strong>Microsoft Outlook</strong>
                <small>1-Way read calendar sync</small>
              </div>
              <button
                className="filter-button sync-btn"
                disabled={Boolean(syncing)}
                onClick={() => sync("microsoft")}
                type="button"
              >
                {syncing === "microsoft" ? <RotateCw size={14} className="spinning" /> : <CheckCircle2 size={14} />}
                <span>{syncing === "microsoft" ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>
          </div>

          {message && <p className="form-success" role="status">{message}</p>}
        </section>
      </div>
    </AppShell>
  );
}
