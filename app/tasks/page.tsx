"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, StatusPill } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";
import { Search, Download, CheckSquare, Trash2, Sparkles } from "lucide-react";
import { callAiAssistant } from "../../lib/ai";
import { useAuthGate } from "../../components/AuthModalProvider";
import { broadcastDataChanged, subscribeToDataSync } from "../../lib/sync";

type Priority = "Low" | "Medium" | "High";
type Task = { id: string; title: string; completed: boolean; priority: Priority; category?: string; dueDate?: string };
type TaskDraft = { title: string; priority: Priority; category: string; dueDate: string };

const DEFAULT_CATEGORIES = [
  "General",
  "Academics",
  "Work",
  "Personal",
  "Study",
  "Homework",
  "Project",
  "Errands",
];

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
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("updated");
  const [polishing, setPolishing] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const { notify } = useNotifications();
  const { requireAuth, isAuthenticated } = useAuthGate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load tasks");
      const data = await response.json();
      const loadedTasks: Task[] = data.tasks || [];
      if (!loadedTasks.length && !isAuthenticated) {
        // Provide demo preview tasks so visitors can see how tasks look
        setTasks([
          { id: "demo-1", title: "Review CS301 data structures lecture slides", priority: "High", completed: false, category: "Academics", dueDate: new Date().toISOString().slice(0, 10) },
          { id: "demo-2", title: "Submit chemistry lab experiment findings", priority: "Medium", completed: false, category: "Homework", dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
          { id: "demo-3", title: "Sync team project milestone timeline", priority: "Low", completed: true, category: "Project" },
        ]);
      } else {
        setTasks(loadedTasks);
      }
      const today = new Date().toISOString().slice(0, 10);
      const due = (loadedTasks).filter((task: Task) => !task.completed && task.dueDate === today).length;
      const overdue = (loadedTasks).filter((task: Task) => !task.completed && task.dueDate && task.dueDate < today).length;
      if (due && !sessionStorage.getItem(`tasktracker-due-${today}`)) { notify(`${due} task${due === 1 ? "" : "s"} due today.`, "warning"); sessionStorage.setItem(`tasktracker-due-${today}`, "1"); }
      if (overdue && !sessionStorage.getItem(`tasktracker-overdue-${today}`)) { notify(`${overdue} overdue task${overdue === 1 ? "" : "s"} need attention.`, "error"); sessionStorage.setItem(`tasktracker-overdue-${today}`, "1"); }
    } catch {
      setError("Tasks could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [notify, isAuthenticated]);

  useEffect(() => {
    // Initial task hydration is intentionally done here so the list reflects persisted
    // data and live sync updates as soon as the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const unsubscribe = subscribeToDataSync(() => {
      void load();
    });
    return () => unsubscribe();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    tasks.forEach(t => {
      if (t.category && t.category.trim()) set.add(t.category.trim());
    });
    if (draft.category && draft.category.trim()) {
      set.add(draft.category.trim());
    }
    return Array.from(set);
  }, [tasks, draft.category]);

  function updateDraft(field: keyof TaskDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleCategorySelect(selected: string) {
    if (selected === "__custom__") {
      setIsCustomCategory(true);
      setCustomCategoryInput("");
    } else {
      setIsCustomCategory(false);
      setCustomCategoryInput("");
      updateDraft("category", selected);
    }
  }

  function handleCustomCategoryChange(val: string) {
    setCustomCategoryInput(val);
    updateDraft("category", val);
  }

  function startEdit(task: Task) {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to edit tasks.")) return;
    setEditingId(task.id);
    const cat = task.category || "General";
    setDraft({ title: task.title, priority: task.priority, category: cat, dueDate: task.dueDate || "" });
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setError("");
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(emptyDraft);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
  }

  async function polishTaskTitle() {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to polish task titles with Fast AI.")) return;
    if (!draft.title.trim()) {
      setError("Enter a task title first to polish with AI.");
      return;
    }
    setPolishing(true);
    setError("");
    try {
      const polished = await callAiAssistant(
        `Make this task title clearer, actionable, and concise: "${draft.title}"`,
        "fast"
      );
      if (polished) {
        updateDraft("title", polished.trim().replace(/^"|"$/g, ""));
        notify("Task title polished with Fast AI.", "success");
      }
    } catch {
      setError("Could not polish title with AI.");
    } finally {
      setPolishing(false);
    }
  }

  async function saveTask(event: React.FormEvent) {
    event.preventDefault();
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to create and save tasks.")) return;
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
      notify(editingId ? "Task updated." : "Task created.", "success");
      broadcastDataChanged(editingId ? "task-updated" : "task-created");
      await load();
    } catch {
      setError("The task could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function update(task: Task, changes: Partial<Task>) {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to update tasks.")) return;
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, ...changes }),
    });
    if (response.ok) {
      notify(changes.completed ? "Task marked complete." : "Task reopened.", "success");
      broadcastDataChanged("task-status-changed");
      await load();
    } else setError("The task could not be updated.");
  }

  async function remove(id: string) {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to delete tasks.")) return;
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (!window.confirm('Delete "' + task.title + '"?')) return;

    const response = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      setTasks((old) => old.filter((task) => task.id !== id));
      notify("Task deleted.", "info");
      broadcastDataChanged("task-deleted");
    } else setError("The task could not be deleted.");
  }

  async function completeAllOpen() {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to manage tasks.")) return;
    const openTasks = tasks.filter(t => !t.completed);
    if (!openTasks.length) return;
    try {
      await Promise.all(openTasks.map(t => fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, completed: true })
      })));
      notify(`Marked ${openTasks.length} task${openTasks.length === 1 ? "" : "s"} complete.`, "success");
      broadcastDataChanged("tasks-completed-all");
      await load();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
      await load();
    } catch {
      notify("Could not complete all tasks.", "error");
    }
  }

  async function clearCompleted() {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to clear tasks.")) return;
    const completedTasks = tasks.filter(t => t.completed);
    if (!completedTasks.length) return;
    try {
      await Promise.all(completedTasks.map(t => fetch(`/api/tasks?id=${encodeURIComponent(t.id)}`, { method: "DELETE" })));
      notify(`Cleared ${completedTasks.length} completed task${completedTasks.length === 1 ? "" : "s"}.`, "info");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("tasktracker-data-changed"));
      await load();
    } catch {
      notify("Could not clear completed tasks.", "error");
    }
  }

  function exportTasksCsv() {
    if (!requireAuth(() => {}, "Sign in with Google or Microsoft to export task lists.")) return;
    if (!tasks.length) return;
    const headers = ["Title", "Status", "Priority", "Category", "Due Date"];
    const rows = tasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      t.completed ? "Completed" : "Open",
      t.priority,
      `"${(t.category || "General").replace(/"/g, '""')}"`,
      t.dueDate || ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tasktracker-tasks-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Tasks exported to CSV.", "success");
  }

  const shown = tasks
    .filter((task) => {
      if (filter === "Open" && task.completed) return false;
      if (filter === "Completed" && !task.completed) return false;
      if (categoryFilter !== "All" && (task.category || "General") !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesCategory = (task.category || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory) return false;
      }
      return true;
    })
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
        <div className="panel-header">
          <div>
            <h2>{editingId ? "Edit task" : "Add a task"}</h2>
            <p>{editingId ? "Update the details and save your changes." : "Capture the next thing you need to accomplish."}</p>
          </div>
          {editingId && (
            <button className="text-button" type="button" onClick={resetDraft}>
              Cancel edit
            </button>
          )}
        </div>
        <form onSubmit={saveTask} className="task-form-grid">
          <label className="task-field task-field-wide">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Task title</span>
              <button
                type="button"
                onClick={polishTaskTitle}
                disabled={polishing || !draft.title.trim()}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--teal)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                }}
              >
                <Sparkles size={12} />
                {polishing ? "Polishing..." : "Fast AI Polish"}
              </button>
            </div>
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="What needs to get done?"
            />
          </label>
          <label className="task-field">
            Priority
            <select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value as Priority)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label className="task-field">
            Category
            {isCustomCategory ? (
              <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  placeholder="New category name"
                  autoFocus
                  style={{ margin: 0 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(false);
                    updateDraft("category", "General");
                  }}
                  className="task-action-btn"
                  style={{ padding: "0 8px", fontSize: 11 }}
                  title="Choose from list"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                value={draft.category}
                onChange={(event) => handleCategorySelect(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="__custom__">+ Add Custom Category...</option>
              </select>
            )}
          </label>
          <label className="task-field">
            Due date
            <input
              type="date"
              value={draft.dueDate}
              onChange={(event) => updateDraft("dueDate", event.target.value)}
            />
          </label>
          <button className="primary-button task-save" type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Add task"}
          </button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <TTBotHint command="add a task: Review project notes">
        Tell TT Bot what you need to do and it can add a medium-priority task for you.
      </TTBotHint>

      <section className="panel task-list-panel">
        <div className="panel-header task-list-heading">
          <div>
            <h2>Your tasks</h2>
            <p>{tasks.filter((task) => !task.completed).length} open tasks</p>
          </div>

          <div className="task-header-actions">
            <button
              type="button"
              className="task-action-btn"
              onClick={exportTasksCsv}
              title="Export tasks to CSV"
            >
              <Download size={13} /> Export
            </button>
            <button
              type="button"
              className="task-action-btn"
              onClick={completeAllOpen}
              title="Complete all open tasks"
            >
              <CheckSquare size={13} /> Complete All
            </button>
            <button
              type="button"
              className="task-action-btn"
              onClick={clearCompleted}
              title="Clear completed tasks"
            >
              <Trash2 size={13} /> Clear Done
            </button>
          </div>
        </div>

        {/* Task Search & Quick Category Filters */}
        <div className="task-search-filter-bar">
          <div className="task-search-box">
            <Search size={14} className="task-search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="task-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="task-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-tabs">
            <select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="updated">Open first</option>
              <option value="due">Due date</option>
              <option value="priority">Priority</option>
            </select>
            {["All", "Open", "Completed"].map((name) => (
              <button
                className={filter === name ? "selected" : ""}
                key={name}
                onClick={() => setFilter(name)}
              >
                {name}
                <b>
                  {name === "All"
                    ? tasks.length
                    : name === "Open"
                    ? tasks.filter((task) => !task.completed).length
                    : tasks.filter((task) => task.completed).length}
                </b>
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="task-category-pills">
            <button
              type="button"
              className={`category-pill ${categoryFilter === "All" ? "active" : ""}`}
              onClick={() => setCategoryFilter("All")}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                className={`category-pill ${categoryFilter === cat ? "active" : ""}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="empty-state">Loading tasks...</p>
        ) : shown.length ? (
          <div className="task-list">
            {shown.map((task) => (
              <article
                className={`task-row-card ${task.completed ? "is-complete" : ""}`}
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", task.title);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <button
                  className="task-check"
                  onClick={() => void update(task, { completed: !task.completed })}
                  aria-label={`Mark ${task.title} ${task.completed ? "open" : "complete"}`}
                >
                  {task.completed ? "✓" : "○"}
                </button>
                <div className="task-row-copy">
                  <strong>{task.title}</strong>
                  <div className="task-meta">
                    <StatusPill status={task.priority} />
                    <span>{task.category || "General"}</span>
                    <span
                      className={
                        task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && !task.completed
                          ? "task-overdue"
                          : ""
                      }
                    >
                      {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="task-row-actions">
                  <button className="text-button" onClick={() => startEdit(task)}>
                    Edit
                  </button>
                  <button className="text-button task-delete" onClick={() => void remove(task.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {searchQuery || categoryFilter !== "All"
              ? "No tasks match your filters."
              : "No tasks here yet. Add one above to get started."}
          </p>
        )}
      </section>
    </AppShell>
  );
}

