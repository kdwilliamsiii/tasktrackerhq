"use client";

import { useMemo, useState } from "react";
import type { CalendarListEvent } from "./CalendarEventList";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const eventTones = ["mint", "peach", "blue"] as const;

function toDateKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfCalendar(year: number, month: number) {
  const first = new Date(year, month, 1);
  // Monday-first grid: shift so Monday = 0 ... Sunday = 6.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function MonthCalendar({ events, selectedDate, onSelectDate }: { events: CalendarListEvent[]; selectedDate: string; onSelectDate: (dateKey: string) => void }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : today;
    return Number.isNaN(base.getTime()) ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarListEvent[]>();
    for (const event of events) {
      const key = (event.date || "").slice(0, 10);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = startOfCalendar(year, month);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = toDateKey(today);

  function goToMonth(delta: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function goToToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(todayKey);
  }

  return (
    <section className="panel calendar-shell">
      <div className="calendar-toolbar">
        <div className="month-nav">
          <button type="button" aria-label="Previous month" onClick={() => goToMonth(-1)}>‹</button>
          <strong>{monthLabel}</strong>
          <button type="button" aria-label="Next month" onClick={() => goToMonth(1)}>›</button>
        </div>
        <div className="calendar-actions">
          <button className="filter-button" type="button" onClick={goToToday}>Today</button>
        </div>
      </div>
      <div className="calendar-panel">
        <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {weeks.flat().map((day) => {
            const key = toDateKey(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const dayEvents = eventsByDate.get(key) || [];
            return (
              <button
                type="button"
                key={key}
                className={`calendar-cell ${inMonth ? "" : "muted-day"} ${isToday ? "current-day" : ""} ${isSelected ? "selected-day" : ""}`}
                onClick={() => onSelectDate(key)}
                aria-label={`${day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
              >
                <span className="date-number">{day.getDate()}</span>
                {dayEvents.slice(0, 3).map((event, index) => (
                  <span className={`calendar-event ${eventTones[index % eventTones.length]}`} key={event.id} title={event.title}>{event.title}</span>
                ))}
                {dayEvents.length > 3 && <span className="calendar-event-more">+{dayEvents.length - 3} more</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
