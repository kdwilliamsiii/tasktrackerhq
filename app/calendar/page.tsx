"use client";
import { useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import MonthCalendar from "../../components/MonthCalendar";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";
import type { CalendarListEvent } from "../../components/CalendarEventList";

type EventItem = CalendarListEvent;

export default function CalendarPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
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
      setEvents(merged);
      localStorage.setItem("tasktracker-events", JSON.stringify(merged));
    } catch {
      try {
        setEvents(JSON.parse(localStorage.getItem("tasktracker-events") || "[]"));
      } catch {
        setEvents([]);
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
          body: JSON.stringify({ provider: "google", monthsBack: 3 }),
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
    if (event.provider !== "Google") {
      notify("Calendar event deleted.", "info");
    }
  }

  function handleTrashDelete(eventId: string) {
    const target = events.find((item) => item.id === eventId);
    if (!target) return;
    deleteEvent(target);
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
    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
    notify('Created event "' + (title.length > 30 ? title.slice(0, 30) + "..." : title) + '" on ' + dateKey + ".", "success");
  }

  async function moveEvent(eventId: string, dateKey: string) {
    const target = events.find((event) => event.id === eventId || (event.provider + "-" + event.id) === eventId);
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
        const res = await fetch("/api/calendar-sync", {
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
        if (!res.ok) throw new Error("Sync failed");
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

    const next = events.map((event) => (event.id === target.id ? { ...event, date: dateKey, time } : event));
    setEvents(next);
    localStorage.setItem("tasktracker-events", JSON.stringify(next));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
    if (target.provider !== "Google") {
      notify('"' + target.title + '" moved to ' + dateKey + ".", "success");
    }
  }

  return (
    <AppShell
      active="Calendar"
      eyebrow="Workspace"
      title="Calendar"
      description="See what's happening and keep your commitments in view."
    >
      <TTBotHint command="show today's schedule">
        TT Bot can help you spot meetings starting soon and keep your schedule in view.
      </TTBotHint>

      <MonthCalendar
        events={events}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onEventDrop={moveEvent}
        onExternalDrop={handleExternalDrop}
        onEventDelete={handleTrashDelete}
      />
    </AppShell>
  );
}
