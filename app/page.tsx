"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, PrimaryButton } from "./components/app-shell";
import QuickAddWidget from "../components/QuickAddWidget";
import TaskProgressWidget from "../components/TaskProgressWidget";
import DailyOverviewWidget from "../components/DailyOverviewWidget";

type Task = { id: string; title: string; completed: boolean; priority: string; completedAt?: string };
type CalendarEvent = { id: string; title: string; date: string; provider?: string; time?: string; location?: string };

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    fetch("/api/tasks").then((response) => response.json()).then((data) => setTasks(data.tasks || [])).catch(() => setTasks([]));
    const loadEvents = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("tasktracker-events") || "[]") as CalendarEvent[];
        const now = Date.now();
        setEvents(stored.filter((event) => event.date && new Date(event.date).getTime() >= now - 86400000).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4));
      } catch {
        setEvents([]);
      }
    };
    const eventLoad = window.setTimeout(loadEvents, 0);
    return () => window.clearTimeout(eventLoad);
  }, []);

  const completed = tasks.filter((task) => task.completed).length;
  const openTasks = tasks.filter((task) => !task.completed).slice(0, 5);
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <AppShell active="Overview" eyebrow="Workspace" title="Dashboard" description={`Good morning, Jamie. Here's your plan for ${dateLabel}.`}>
      <section className="dashboard-hero">
        <div><span className="dashboard-kicker">TODAY&apos;S FOCUS</span><h2>Make progress on what matters.</h2><p>Stay on top of your priorities and keep your momentum going.</p></div>
        <Link href="/tasks"><PrimaryButton>New task</PrimaryButton></Link>
      </section>
      <DailyOverviewWidget tasks={tasks} events={events} />
      <QuickAddWidget />
      <TaskProgressWidget tasks={tasks} />
      <div className="dashboard-stats">
        <div className="dashboard-stat"><span>Open tasks</span><strong>{tasks.length - completed}</strong><small>Needs attention</small></div>
        <div className="dashboard-stat"><span>Completed</span><strong>{completed}</strong><small>{tasks.length ? Math.round(completed / tasks.length * 100) : 0}% completion rate</small></div>
        <div className="dashboard-stat"><span>Upcoming events</span><strong>{events.length}</strong><small>On your calendar</small></div>
        <div className="dashboard-stat dashboard-stat-accent"><span>Focus streak</span><strong>0 days</strong><small>Start today</small></div>
      </div>
      <div className="dashboard-grid dashboard-content-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-kicker">PRIORITIES</span><h2>Upcoming tasks</h2></div><Link className="dashboard-link" href="/tasks">View all →</Link></div>
          {openTasks.map((task) => <div className="dashboard-task" key={task.id}><span className={`dashboard-task-dot ${task.priority.toLowerCase()}`} /><div><strong>{task.title}</strong><small>{task.priority} priority</small></div><span className="dashboard-task-arrow">→</span></div>)}
          {!openTasks.length && <p className="dashboard-empty">You&apos;re all caught up. Add a task to keep moving.</p>}
        </section>
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-kicker">SCHEDULE</span><h2>Upcoming events</h2></div><Link className="dashboard-link" href="/calendar">Calendar →</Link></div>
          {events.map((event) => { const eventDate = new Date(event.date.includes("T") ? event.date : `${event.date}T00:00:00`); const eventTime = event.time ? new Date(event.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "All day"; return <div className="dashboard-event" key={`${event.provider}-${event.id}`}><div className="dashboard-event-date"><strong>{eventDate.getDate()}</strong><small>{eventDate.toLocaleDateString(undefined, { month: "short" })}</small></div><div><strong>{event.title}</strong><small>{eventTime} · {event.provider || "Local"}{event.location ? ` · ${event.location}` : ""}</small></div></div>; })}
          {!events.length && <p className="dashboard-empty">No upcoming events. Add one in Calendar.</p>}
        </section>
      </div>
    </AppShell>
  );
}
