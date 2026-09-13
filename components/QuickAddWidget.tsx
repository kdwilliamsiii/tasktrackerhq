"use client";

import { useState, type FormEvent } from "react";
import { useAuthGate } from "./AuthModalProvider";

type QuickAddType = "task" | "note" | "reminder";

export default function QuickAddWidget() {
  const [type, setType] = useState<QuickAddType>("task");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const { requireAuth } = useAuthGate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;

    const authed = requireAuth(async () => {
      setSaving(true);
      setMessage("");

      try {
        const title = value.trim();
        const category = type === "task" ? "Quick add" : type === "note" ? "Note" : "Reminder";

        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, priority: "Medium", category }),
        });

        if (!response.ok) throw new Error("Unable to add " + type);

        if (typeof window !== "undefined") {
          const key = type === "note" ? "tasktracker-notes" : "tasktracker-reminders";
          if (type !== "task") {
            const saved = JSON.parse(localStorage.getItem(key) || "[]") as Array<{ id: string; text: string; createdAt: string }>;
            saved.unshift({ id: crypto.randomUUID(), text: title, createdAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(saved.slice(0, 50)));
          }
          window.dispatchEvent(new Event("tasktracker-quick-add"));
          window.dispatchEvent(new Event("tasktracker-data-changed"));
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
      <form onSubmit={submit} className="quick-add-form">
        <select value={type} onChange={(event) => setType(event.target.value as QuickAddType)} aria-label="Quick add type">
          <option value="task">Task</option>
          <option value="note">Note</option>
          <option value="reminder">Reminder</option>
        </select>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={"Add a " + type + "..."} aria-label={"Add a " + type} />
        <button type="submit" aria-label={"Add " + type} disabled={saving || !value.trim()}>
          +
        </button>
      </form>
      {message && <p className="quick-add-message" role="status">{message}</p>}
    </section>
  );
}
