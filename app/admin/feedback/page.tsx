"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
type Suggestion = { id: string; featureName: string; description: string; category: string; priority: string; status: string; createdAt: string };
export default function FeedbackReviewPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { if (session?.user?.role === "admin") fetch("/api/suggestions").then((r) => r.json()).then(setSuggestions).catch(() => setError("Unable to load feedback")); }, [session]);
  if (sessionStatus === "loading") return <main><p>Checking access…</p></main>;
  if (!session || session.user.role !== "admin") { redirect("/"); }
  async function update(id: string, status: string) { const response = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); if (response.ok) setSuggestions((items) => items.map((item) => item.id === id ? { ...item, status } : item)); }
  async function remove(id: string) { const response = await fetch("/api/admin/feedback", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (response.ok) setSuggestions((items) => items.filter((item) => item.id !== id)); }
  return <main className="admin-feedback"><h1>User Suggestions</h1><p>Review and manage feature requests.</p>{error && <p className="form-error">{error}</p>}<table><thead><tr><th>Feature</th><th>Description</th><th>Category</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>{suggestions.map((item) => <tr key={item.id}><td>{item.featureName}</td><td>{item.description}</td><td>{item.category}</td><td>{item.priority}</td><td><select value={item.status} onChange={(e) => update(item.id, e.target.value)}><option>new</option><option>planned</option><option>in-progress</option><option>completed</option><option>dismissed</option></select></td><td><button className="text-button" onClick={() => remove(item.id)}>Delete</button></td></tr>)}</tbody></table>{!suggestions.length && <p>No feedback submitted yet.</p>}</main>;
}
