"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppShell, PrimaryButton } from "./components/app-shell";
import QuickAddWidget from "../components/QuickAddWidget";
import TaskProgressWidget from "../components/TaskProgressWidget";
import DailyOverviewWidget from "../components/DailyOverviewWidget";
import DashboardCard from "../components/DashboardCard";
import TTBotHint from "../components/TTBotHint";

type Task = { id: string; title: string; completed: boolean; priority: string; completedAt?: string };
type CalendarEvent = { id: string; title: string; date: string; provider?: string; time?: string; location?: string };
type FocusStats = { sessions: number; minutes: number; lastSession?: string; sessionDates?: string[] };

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [focusStreak, setFocusStreak] = useState(0);
  const [dateInfo, setDateInfo] = useState<{ dateLabel: string; greeting: string } | null>(null);
  const { data: session } = useSession();

  const loadDashboardData = async () => {
    // 1. Fetch Tasks
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      setTasks([]);
    }

    // 2. Fetch Events (Database + localStorage merge)
    try {
      const stored = JSON.parse(localStorage.getItem("tasktracker-events") || "[]") as CalendarEvent[];
      const map = new Map<string, CalendarEvent>();
      for (const e of stored) {
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
      const now = Date.now();
      const filteredEvents = merged
        .filter((event) => event.date && new Date(event.date).getTime() >= now - 86400000)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4);

      setEvents(filteredEvents);
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date();
      setDateInfo({
        dateLabel: today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
        greeting: today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dataTimer = window.setTimeout(() => {
      void loadDashboardData();
    }, 0);

    const handleUpdate = () => {
      void loadDashboardData();
    };

    window.addEventListener("tasktracker-data-changed", handleUpdate);
    window.addEventListener("tasktracker-quick-add", handleUpdate);

    const focusLoad = window.setTimeout(() => {
      try {
        const stats = JSON.parse(localStorage.getItem("tasktracker-focus-stats") || "null") as FocusStats | null;
        const dates = new Set((stats?.sessionDates || []).map((date) => date.slice(0, 10)));
        let streak = 0;
        const cursor = new Date();
        while (dates.has(cursor.toISOString().slice(0, 10))) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        setFocusStreak(streak);
      } catch {
        setFocusStreak(0);
      }
    }, 0);

    return () => {
      window.clearTimeout(dataTimer);
      window.clearTimeout(focusLoad);
      window.removeEventListener("tasktracker-data-changed", handleUpdate);
      window.removeEventListener("tasktracker-quick-add", handleUpdate);
    };
  }, []);

  const completed = tasks.filter((task) => task.completed).length;
  const openTasks = tasks.filter((task) => !task.completed).slice(0, 5);
  const firstName = session?.user?.name?.split(/\s+/)[0] || "there";
  const description = dateInfo ? dateInfo.greeting + ", " + firstName + ". Here's your plan for " + dateInfo.dateLabel + "." : "Here's your plan for today.";

  return (
    <AppShell active="Overview" eyebrow="Workspace" title="Dashboard" description={description}>
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-kicker">TODAY&apos;S FOCUS</span>
          <h2>Make progress on what matters.</h2>
          <p>Stay on top of your priorities and keep your momentum going.</p>
        </div>
        <Link href="/tasks">
          <PrimaryButton>New task</PrimaryButton>
        </Link>
      </section>
      <DailyOverviewWidget tasks={tasks} events={events} />
      <TTBotHint command="show today's schedule">Need a quick read on your day? TT Bot can summarize your tasks and calendar.</TTBotHint>
      <QuickAddWidget />
      <TaskProgressWidget tasks={tasks} />
      <div className="dashboard-stats">
        <DashboardCard label="Open tasks" value={tasks.length - completed} detail="Needs attention" />
        <DashboardCard label="Completed" value={completed} detail={(tasks.length ? Math.round((completed / tasks.length) * 100) : 0) + "% completion rate"} />
        <DashboardCard label="Upcoming events" value={events.length} detail="On your calendar" />
        <DashboardCard label="Focus streak" value={focusStreak + " " + (focusStreak === 1 ? "day" : "days")} detail={focusStreak ? "Keep the momentum going" : "Start today"} accent />
      </div>
      <div className="dashboard-grid dashboard-content-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-kicker">PRIORITIES</span>
              <h2>Upcoming tasks</h2>
            </div>
            <Link className="dashboard-link" href="/tasks">View all ?</Link>
          </div>
          {openTasks.map((task) => (
            <div className="dashboard-task" key={task.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.title); e.dataTransfer.effectAllowed = "copy"; }}>
              <span className={"dashboard-task-dot " + task.priority.toLowerCase()} />
              <div>
                <strong>{task.title}</strong>
                <small>{task.priority} priority</small>
              </div>
              <span className="dashboard-task-arrow">?</span>
            </div>
          ))}
          {!openTasks.length && <p className="dashboard-empty">You&apos;re all caught up. Add a task to keep moving.</p>}
        </section>
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-kicker">SCHEDULE</span>
              <h2>Upcoming events</h2>
            </div>
            <Link className="dashboard-link" href="/calendar">Calendar ?</Link>
          </div>
          {events.map((event) => {
            const eventDate = new Date(event.date.includes("T") ? event.date : event.date + "T00:00:00");
            const eventTime = event.time ? new Date(event.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "All day";
            return (
              <div className="dashboard-event" key={event.provider + "-" + event.id}>
                <div className="dashboard-event-date">
                  <strong>{eventDate.getDate()}</strong>
                  <small>{eventDate.toLocaleDateString(undefined, { month: "short" })}</small>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <small>{eventTime + " ? " + (event.provider || "Local") + (event.location ? " ? " + event.location : "")}</small>
                </div>
              </div>
            );
          })}
          {!events.length && <p className="dashboard-empty">No upcoming events. Add one in Calendar.</p>}
        </section>
      </div>
    </AppShell>
  );
}
