"use client";

export type AdminSuggestion = {
  id: string;
  featureName: string;
  description: string;
  category: string;
  priority: string;
  status: "new" | "reviewing" | "approved" | "rejected";
  createdAt: string;
};

const statuses: AdminSuggestion["status"][] = ["new", "reviewing", "approved", "rejected"];

export default function AdminReviewWidget({
  suggestions,
  loading,
  onStatusChange,
  onDelete,
}: {
  suggestions: AdminSuggestion[];
  loading: boolean;
  onStatusChange: (id: string, status: AdminSuggestion["status"]) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="feedback-table-panel" aria-labelledby="admin-review-title">
      <div className="feedback-widget-heading"><div><span className="dashboard-kicker">FEEDBACK QUEUE</span><h2 id="admin-review-title">Suggestion review</h2></div><strong>{suggestions.length}</strong></div>
      <div className="feedback-table-wrap">
        <table>
          <thead><tr><th>Feature</th><th>Description</th><th>Category</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6}>Loading suggestions...</td></tr> : suggestions.map((item) => <tr key={item.id}>
              <td><strong>{item.featureName}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></td>
              <td className="feedback-description">{item.description}</td>
              <td><span className="feedback-category">{item.category}</span></td>
              <td><span className={`feedback-priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td>
              <td><select className={`feedback-status status-${item.status}`} value={item.status} onChange={(event) => onStatusChange(item.id, event.target.value as AdminSuggestion["status"])} aria-label={`Status for ${item.featureName}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
              <td><button className="text-button task-delete" onClick={() => onDelete(item.id)}>Delete</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && !suggestions.length && <p className="empty-state">No suggestions have been submitted yet.</p>}
    </section>
  );
}
