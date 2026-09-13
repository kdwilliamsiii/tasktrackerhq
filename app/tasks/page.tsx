"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell, StatusPill } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";

type Priority = "Low" | "Medium" | "High";
type Task = { id: string; title: string; completed: boolean; priority: Priority; category?: string; dueDate?: string };
type TaskDraft = { title: string; priority: Priority; category: string; dueDate: string };

const emptyDraft: TaskDraft = { title: "", priority: "Medium", category: "General", dueDate: "" };

function formatDueDate(date?: string) {
  if (!date) return "No due date";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("updated");
  const { notify } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load tasks");
      const data = await response.json();
      setTasks(data.tasks || []);
      const today = new Date().toISOString().slice(0, 10);
      const due = (data.tasks || []).filter((task: Task) => !task.completed && task.dueDate === today).length;
      const overdue = (data.tasks || []).filter((task: Task) => !task.completed && task.dueDate && task.dueDate < today).length;
      if (due && !sessionStorage.getItem(`tasktracker-due-${today}`)) { notify(`${due} task${due === 1 ? "" : "s"} due today.`, "warning"); sessionStorage.setItem(`tasktracker-due-${today}`, "1"); }
      if (overdue && !sessionStorage.getItem(`tasktracker-overdue-${today}`)) { notify(`${overdue} overdue task${overdue === 1 ? "" : "s"} need attention.`, "error"); sessionStorage.setItem(`tasktracker-overdue-${today}`, "1"); }
    } catch {
      setError("Tasks could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const taskLoad = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(taskLoad);
  }, [load]);

  function updateDraft(field: keyof TaskDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setDraft({ title: task.title, priority: task.priority, category: task.category || "General", dueDate: task.dueDate || "" });
    setError("");
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function saveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError("Enter a task title before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...draft } : draft),
      });
      if (!response.ok) throw new Error("Unable to save task");
      resetDraft();
      notify(editingId ? "Task updated." : "Task created.", "success"); if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
      await load();
    } catch {
      setError("The task could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function update(task: Task, changes: Partial<Task>) {
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, ...changes }),
    });
    if (response.ok) { notify(changes.completed ? "Task marked complete." : "Task reopened.", "success"); if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed")); await load(); }
    else setError("The task could not be updated.");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) { setTasks((old) => old.filter((task) => task.id !== id)); notify("Task deleted.", "info"); if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed")); }
    else setError("The task could not be deleted.");
  }

  const shown = tasks
    .filter((task) => filter === "All" || (filter === "Open" ? !task.completed : task.completed))
    .slice()
    .sort((a, b) => {
      if (sort === "due") return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
      if (sort === "priority") {
        const rank = { High: 0, Medium: 1, Low: 2 };
        return rank[a.priority] - rank[b.priority];
      }
      return Number(a.completed) - Number(b.completed);
    });

  return (
    <AppShell active="Tasks" eyebrow="Workspace" title="Task Manager" description="Plan, prioritize, and complete your work.">
      <section className="panel task-manager-form">
        <div className="panel-header"><div><h2>{editingId ? "Edit task" : "Add a task"}</h2><p>{editingId ? "Update the details and save your changes." : "Capture the next thing you need to accomplish."}</p></div>{editingId && <button className="text-button" type="button" onClick={resetDraft}>Cancel edit</button>}</div>
        <form onSubmit={saveTask} className="task-form-grid">
          <label className="task-field task-field-wide">Task title<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="What needs to get done?" /></label>
          <label className="task-field">Priority<select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label className="task-field">Category<input value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} placeholder="e.g. Work" /></label>
          <label className="task-field">Due date<input type="date" value={draft.dueDate} onChange={(event) => updateDraft("dueDate", event.target.value)} /></label>
          <button className="primary-button task-save" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Add task"}</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
      <TTBotHint command="add a task: Review project notes">Tell TT Bot what you need to do and it can add a medium-priority task for you.</TTBotHint>
      <section className="panel task-list-panel">
        <div className="panel-header task-list-heading"><div><h2>Your tasks</h2><p>{tasks.filter((task) => !task.completed).length} open tasks</p></div><div className="filter-tabs"><select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Open first</option><option value="due">Due date</option><option value="priority">Priority</option></select>{["All", "Open", "Completed"].map((name) => <button className={filter === name ? "selected" : ""} key={name} onClick={() => setFilter(name)}>{name}<b>{name === "All" ? tasks.length : name === "Open" ? tasks.filter((task) => !task.completed).length : tasks.filter((task) => task.completed).length}</b></button>)}</div></div>
        {loading ? <p className="empty-state">Loading tasks...</p> : shown.length ? <div className="task-list">{shown.map((task) => <article className={`task-row-card ${task.completed ? "is-complete" : ""}`} key={task.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.title); e.dataTransfer.effectAllowed = "copy"; }}>
          <button className="task-check" onClick={() => void update(task, { completed: !task.completed })} aria-label={`Mark ${task.title} ${task.completed ? "open" : "complete"}`}>{task.completed ? "✓" : "○"}</button>
          <div className="task-row-copy"><strong>{task.title}</strong><div className="task-meta"><StatusPill status={task.priority} /><span>{task.category || "General"}</span><span className={task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !task.completed ? "task-overdue" : ""}>{formatDueDate(task.dueDate)}</span></div></div>
          <div className="task-row-actions"><button className="text-button" onClick={() => startEdit(task)}>Edit</button><button className="text-button task-delete" onClick={() => void remove(task.id)}>Delete</button></div>
        </article>)}</div> : <p className="empty-state">No tasks here yet. Add one above to get started.</p>}
      </section>
    </AppShell>
  );
}
