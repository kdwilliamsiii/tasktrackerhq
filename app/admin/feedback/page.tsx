"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";

type Suggestion = { id: string; featureName: string; description: string; category: string; priority: string; status: "new" | "reviewing" | "approved" | "rejected"; createdAt: string };

const statuses: Suggestion["status"][] = ["new", "reviewing", "approved", "rejected"];

export default function FeedbackReviewPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== "admin") return;
    const request = window.setTimeout(() => {
      setLoading(true);
      fetch("/api/suggestions").then((response) => {
        if (!response.ok) throw new Error("Unable to load suggestions");
        return response.json();
      }).then(setSuggestions).catch(() => setError("Unable to load suggestions.")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(request);
  }, [session]);

  if (sessionStatus === "loading") return <main className="admin-feedback"><p>Checking access...</p></main>;
  if (!session || session.user.role !== "admin") redirect("/");

  async function update(id: string, status: Suggestion["status"]) {
    const response = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) setSuggestions((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    else setError("Unable to update suggestion status.");
  }

  async function remove(id: string) {
    const response = await fetch("/api/admin/feedback", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) setSuggestions((items) => items.filter((item) => item.id !== id));
    else setError("Unable to delete suggestion.");
  }

  return <main className="admin-feedback"><div className="feedback-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>Suggestion Review</h1><p>Moderate feature requests submitted by your users.</p></div><strong>{suggestions.length} suggestions</strong></div>{error && <p className="form-error" role="alert">{error}</p>}<section className="feedback-table-panel"><div className="feedback-table-wrap"><table><thead><tr><th>Feature</th><th>Description</th><th>Category</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={6}>Loading suggestions...</td></tr> : suggestions.map((item) => <tr key={item.id}><td><strong>{item.featureName}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></td><td className="feedback-description">{item.description}</td><td>{item.category}</td><td><span className={`feedback-priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td><td><select className={`feedback-status status-${item.status}`} value={item.status} onChange={(event) => void update(item.id, event.target.value as Suggestion["status"])} aria-label={`Status for ${item.featureName}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td><td><button className="text-button task-delete" onClick={() => void remove(item.id)}>Delete</button></td></tr>)}</tbody></table></div>{!loading && !suggestions.length && <p className="empty-state">No suggestions have been submitted yet.</p>}</section></main>;
}
