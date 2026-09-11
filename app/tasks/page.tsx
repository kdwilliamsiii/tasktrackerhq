"use client";

import { useEffect, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "../components/app-shell";

type Task = { id: string; title: string; completed: boolean; priority: "Low" | "Medium" | "High" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const load = () => fetch("/api/tasks").then((r) => r.json()).then((d) => setTasks(d.tasks || [])).catch(() => setTasks([])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) { e.preventDefault(); if (!title.trim()) return; const r = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, priority }) }); if (r.ok) { setTitle(""); load(); } }
  async function update(task: Task, changes: Partial<Task>) { await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, ...changes }) }); load(); }
  async function remove(id: string) { await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setTasks((old) => old.filter((t) => t.id !== id)); }
  const shown = tasks.filter((t) => filter === "All" || (filter === "Open" ? !t.completed : t.completed));
  return <AppShell active="Tasks" eyebrow="Workspace" title="Tasks" description="Keep your team aligned and moving forward." action={<PrimaryButton>New task</PrimaryButton>}>
    <div className="panel task-toolbar"><form onSubmit={add} className="task-add"><input aria-label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task..." /><select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}><option>Low</option><option>Medium</option><option>High</option></select><button className="primary-button" type="submit">Add task</button></form><div className="filter-tabs">{["All", "Open", "Completed"].map((name) => <button className={filter === name ? "selected" : ""} key={name} onClick={() => setFilter(name)}>{name}</button>)}</div></div>
    <section className="panel"><div className="panel-header"><div><h2>Your tasks</h2><p>{tasks.filter((t) => !t.completed).length} open tasks</p></div></div>{loading ? <p>Loading tasks…</p> : shown.length ? <ul className="task-list">{shown.map((task) => <li key={task.id}><button className="task-check" onClick={() => update(task, { completed: !task.completed })} aria-label={`Mark ${task.title} ${task.completed ? "open" : "complete"}`}>{task.completed ? "✓" : "○"}</button><span className={task.completed ? "completed" : ""}>{task.title}</span><StatusPill status={task.priority} /><button className="text-button task-delete" onClick={() => remove(task.id)}>Delete</button></li>)}</ul> : <p className="empty-state">No tasks here yet.</p>}</section>
  </AppShell>;
}
