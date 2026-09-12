"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminReviewWidget, { type AdminSuggestion } from "../../../components/AdminReviewWidget";
import { useNotifications } from "../../../components/NotificationProvider";
import TTBotHint from "../../../components/TTBotHint";

export default function FeedbackReviewPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();

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

  async function update(id: string, status: AdminSuggestion["status"]) {
    const response = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) { setSuggestions((items) => items.map((item) => item.id === id ? { ...item, status } : item)); notify(`Suggestion ${status}.`, status === "rejected" ? "warning" : "success"); }
    else setError("Unable to update suggestion status.");
  }

  async function remove(id: string) {
    const response = await fetch("/api/admin/feedback", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) { setSuggestions((items) => items.filter((item) => item.id !== id)); notify("Suggestion deleted.", "info"); }
    else setError("Unable to delete suggestion.");
  }

  return <main className="admin-feedback"><div className="feedback-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>Suggestion Review</h1><p>Review and moderate feature requests submitted by your users.</p></div><strong>{suggestions.length} suggestions</strong></div>{error && <p className="form-error" role="alert">{error}</p>}<TTBotHint command="show new suggestions">TT Bot can summarize new feedback and identify the highest-priority suggestion.</TTBotHint><AdminReviewWidget suggestions={suggestions} loading={loading} onStatusChange={(id, status) => void update(id, status)} onDelete={(id) => void remove(id)} /></main>;
}
