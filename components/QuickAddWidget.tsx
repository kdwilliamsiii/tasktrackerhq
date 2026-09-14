"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuthGate } from "./AuthModalProvider";
import { broadcastDataChanged } from "../lib/sync";

type QuickAddType = "task" | "note" | "reminder";

const defaultCategorySuggestions = ["Quick add", "General", "Work", "Study", "Personal", "Errands", "Note", "Reminder"];
const defaultCategoryByType: Record<QuickAddType, string> = {
  task: "Quick add",
  note: "Note",
  reminder: "Reminder",
};

export default function QuickAddWidget() {
  const [type, setType] = useState<QuickAddType>("task");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState(defaultCategoryByType.task);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>(defaultCategorySuggestions);
  const { requireAuth } = useAuthGate();

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const response = await fetch("/api/tasks", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load categories");
        const data = await response.json();
        const categories = Array.from(
          new Set([
            ...defaultCategorySuggestions,
            ...((data.tasks || [])
              .map((item: { category?: string }) => item.category)
              .filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim()))),
          ])
        ).sort((a, b) => a.localeCompare(b));
        setCategorySuggestions(categories);
      } catch {
        setCategorySuggestions(defaultCategorySuggestions);
      }
    }

    const timer = window.setTimeout(() => {
      void loadSuggestions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function handleTypeChange(nextType: QuickAddType) {
    setType(nextType);
    setCategory((current) => {
      const trimmed = current.trim();
      const defaultValues = Object.values(defaultCategoryByType);
      if (!trimmed || defaultValues.includes(trimmed)) {
        return defaultCategoryByType[nextType];
      }
      return trimmed;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;

    const authed = requireAuth(async () => {
      setSaving(true);
      setMessage("");

      try {
        const title = value.trim();
        const categoryValue = category.trim() || defaultCategoryByType[type];

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, priority: "Medium", category: categoryValue }),
        });

        if (!response.ok) throw new Error("Unable to add " + type);

        if (typeof window !== "undefined") {
          const key = type === "note" ? "tasktracker-notes" : "tasktracker-reminders";
          if (type !== "task") {
            const saved = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ id: string; text: string; createdAt: string }>;
            saved.unshift({ id: crypto.randomUUID(), text: title, createdAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(saved.slice(0, 50)));
          }
          broadcastDataChanged(`quick-add-${type}`);
        }

        setValue("");
        setMessage(type[0].toUpperCase() + type.slice(1) + " saved & synced!");
      } catch {
        setMessage("Unable to save. Please try again.");
      } finally {
        setSaving(false);
      }
    }, `Sign in with Google or Microsoft to capture and save ${type}s.`);

    if (!authed) return;
  }

  return (
    <section className="quick-add-widget" aria-labelledby="quick-add-title">
      <div className="quick-add-heading">
        <div>
          <span className="dashboard-kicker">QUICK ADD</span>
          <h2 id="quick-add-title">Capture an idea</h2>
        </div>
        <span className="quick-add-plus">+</span>
      </div>
      <form onSubmit={submit} className="quick-add-form" suppressHydrationWarning>
        <select
          value={type}
          onChange={(event) => handleTypeChange(event.target.value as QuickAddType)}
          aria-label="Quick add type"
          suppressHydrationWarning
        >
          <option value="task">Task</option>
          <option value="note">Note</option>
          <option value="reminder">Reminder</option>
        </select>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={"Add a " + type + "..."}
          aria-label={"Add a " + type}
          suppressHydrationWarning
        />
        <input
          type="text"
          list="quick-add-category-suggestions"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Category"
          aria-label="Task category"
          style={{ minWidth: 110 }}
          suppressHydrationWarning
        />
        <datalist id="quick-add-category-suggestions">
          {categorySuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <button type="submit" aria-label={"Add " + type} disabled={saving || !value.trim()}>
          +
        </button>
      </form>
      {message && <p className="quick-add-message" role="status">{message}</p>}
    </section>
  );
}
