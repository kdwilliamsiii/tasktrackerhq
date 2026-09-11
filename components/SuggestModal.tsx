"use client";

import { useState, type FormEvent } from "react";

export default function SuggestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [featureName, setFeatureName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tasks");
  const [priority, setPriority] = useState("Medium");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureName, description, category, priority }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || "Unable to submit your suggestion.");
      }

      setFeatureName("");
      setDescription("");
      onClose();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit your suggestion.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close suggestion form">×</button>
        <h2 id="suggestion-title">Suggest a Feature</h2>
        <p>Help shape the future of TaskTrackerHQ.</p>
        <form onSubmit={submit}>
          <input required value={featureName} onChange={(event) => setFeatureName(event.target.value)} placeholder="What should we add?" />
          <textarea required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell us more about your idea..." />
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category"><option>Tasks</option><option>Calendar</option><option>Focus Mode</option><option>AI Features</option><option>Study Tools</option><option>Team Collaboration</option><option>UI/Design</option><option>Other</option></select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Priority"><option>Low</option><option>Medium</option><option>High</option></select>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Suggestion"}</button>
        </form>
      </section>
    </div>
  );
}
