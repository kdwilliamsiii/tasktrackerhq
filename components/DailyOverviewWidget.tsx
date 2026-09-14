"use client";

import { useEffect, useState } from "react";

type OverviewTask = { dueDate?: string; completed: boolean };
type OverviewEvent = { date: string };

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DailyOverviewWidget({ tasks, events }: { tasks: OverviewTask[]; events: OverviewEvent[] }) {
  const [mounted, setMounted] = useState(false);
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    setDateLabel(today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const today = new Date();
  const todayKey = localDateKey(today);
  const dueToday = mounted
    ? tasks.filter((task) => task.dueDate === todayKey && !task.completed).length
    : 0;
  const eventsToday = mounted
    ? events.filter((event) => {
        const eventDate = new Date(event.date.includes("T") ? event.date : `${event.date}T00:00:00`);
        return !Number.isNaN(eventDate.getTime()) && localDateKey(eventDate) === todayKey;
      }).length
    : 0;
  const totalItems = dueToday + eventsToday;
  const summary = !mounted
    ? "Reviewing your daily schedule..."
    : totalItems
    ? `${dueToday ? `${dueToday} task${dueToday === 1 ? "" : "s"} due` : "No tasks due"}${eventsToday ? ` and ${eventsToday} event${eventsToday === 1 ? "" : "s"} on your calendar` : ""}.`
    : "Your schedule is clear today. A great time to make progress.";

  return (
    <section className="daily-overview-widget" aria-labelledby="daily-overview-title">
      <div className="daily-overview-copy">
        <span className="dashboard-kicker">DAILY OVERVIEW</span>
        <h2 id="daily-overview-title" suppressHydrationWarning>
          {dateLabel || "Today's Schedule"}
        </h2>
        <p suppressHydrationWarning>{summary}</p>
      </div>
      <div className="daily-overview-stats">
        <div>
          <strong suppressHydrationWarning>{dueToday}</strong>
          <span>Tasks due today</span>
        </div>
        <div>
          <strong suppressHydrationWarning>{eventsToday}</strong>
          <span>Events today</span>
        </div>
      </div>
    </section>
  );
}

