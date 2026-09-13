"use client";

import { useMemo, useRef, useState } from "react";
import type { CalendarListEvent } from "./CalendarEventList";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toneForProvider(provider?: string) {
  if (provider === "Google") return "blue";
  if (provider === "Microsoft") return "peach";
  return "mint";
}

function isMovable(event: CalendarListEvent) {
  return !event.provider || event.provider === "Local" || event.provider === "Google";
}

function toDateKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfCalendar(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function MonthCalendar({
  events,
  selectedDate,
  onSelectDate,
  onEventClick,
  onEventDrop,
  onExternalDrop,
  onEventDelete,
}: {
  events: CalendarListEvent[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onEventClick?: (event: CalendarListEvent) => void;
  onEventDelete?: (eventId: string) => void;
  onEventDrop?: (eventId: string, dateKey: string) => void;
  onExternalDrop?: (e: React.DragEvent, dateKey: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : today;
    return Number.isNaN(base.getTime()) ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const activeTouchRef = useRef<{ eventId: string } | null>(null);

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

  function handleDragStart(e: React.DragEvent, event: CalendarListEvent) {
    if (!isMovable(event)) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/tasktracker-event-id", event.id);
    e.dataTransfer.setData("text/plain", event.title);
  }

  function handleTouchStart(e: React.TouchEvent, event: CalendarListEvent) {
    if (!isMovable(event)) return;
    activeTouchRef.current = { eventId: event.id };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!activeTouchRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const cell = el.closest("[data-date-key]") as HTMLElement | null;
    if (cell && cell.dataset.dateKey) {
      setDragOverDate(cell.dataset.dateKey);
    }
  }

  function handleTouchEnd() {
    if (!activeTouchRef.current) return;
    const eventId = activeTouchRef.current.eventId;
    const targetKey = dragOverDate;
    activeTouchRef.current = null;
    setDragOverDate(null);
    if (eventId && targetKey) {
      onEventDrop?.(eventId, targetKey);
    }
  }

  function handleTrashDrop(e: React.DragEvent) {
    e.preventDefault();
    setTrashHover(false);
    const eventId = e.dataTransfer.getData("application/tasktracker-event-id");
    if (eventId) {
      onEventDelete?.(eventId);
    }
  }

  function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    setDragOverDate(null);
    const eventId = e.dataTransfer.getData("application/tasktracker-event-id");
    if (eventId) {
      onEventDrop?.(eventId, dateKey);
    } else {
      onExternalDrop?.(e, dateKey);
    }
  }

  return (
    <section className="panel calendar-shell">
      <div className="calendar-toolbar">
        <div className="month-nav">
          <button type="button" aria-label="Previous month" onClick={() => goToMonth(-1)}>
            <ChevronLeft size={16} />
          </button>
          <strong>{monthLabel}</strong>
          <button type="button" aria-label="Next month" onClick={() => goToMonth(1)}>
            <ChevronRight size={16} />
          </button>
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
              <div
                key={key}
                data-date-key={key}
                role="button"
                tabIndex={0}
                className={`calendar-cell ${inMonth ? "" : "muted-day"} ${isToday ? "current-day" : ""} ${isSelected ? "selected-day" : ""} ${dragOverDate === key ? "drop-target" : ""}`}
                onClick={() => onSelectDate(key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectDate(key); } }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverDate !== key) setDragOverDate(key); }}
                onDragLeave={() => setDragOverDate((current) => (current === key ? null : current))}
                onDrop={(e) => handleDrop(e, key)}
                aria-label={`${day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
              >
                <span className="date-number">{day.getDate()}</span>
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    type="button"
                    className={`calendar-event ${toneForProvider(event.provider)}`}
                    key={event.id}
                    title={event.title}
                    draggable={isMovable(event)}
                    onDragStart={(e) => handleDragStart(e, event)}
                    onTouchStart={(e) => handleTouchStart(e, event)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && <span className="calendar-event-more">+{dayEvents.length - 3} more</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="calendar-footer">
        <p className="calendar-legend"><span className="calendar-legend-dot mint" /> Local <span className="calendar-legend-dot blue" /> Google <span className="calendar-legend-dot peach" /> Microsoft</p>
        <div
          className={"calendar-trash-zone" + (trashHover ? " trash-hover" : "")}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!trashHover) setTrashHover(true); }}
          onDragLeave={() => setTrashHover(false)}
          onDrop={handleTrashDrop}
          title="Drag any local event here to delete"
        >
          <svg className="trash-icon-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span>Drag event here to delete</span>
        </div>
      </div>
    </section>
  );
}
