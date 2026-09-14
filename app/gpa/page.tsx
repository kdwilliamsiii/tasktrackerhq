"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";
import { Download, Calculator } from "lucide-react";
import { useAuthGate } from "../../components/AuthModalProvider";
import { broadcastDataChanged, subscribeToDataSync } from "../../lib/sync";

type CourseClass = {
  id: string;
  name: string;
  code: string;
  credits: number;
  pointsEarned: number;
  currentPossible: number;
  totalPossible: number;
  isHonors?: boolean;
};

type ClassDraft = {
  name: string;
  code: string;
  credits: string;
  pointsEarned: string;
  currentPossible: string;
  totalPossible: string;
  isHonors: boolean;
};

const emptyDraft: ClassDraft = {
  name: "",
  code: "",
  credits: "3",
  pointsEarned: "",
  currentPossible: "",
  totalPossible: "",
  isHonors: false,
};

function getLetterGrade(percentage: number, isHonors = false): { letter: string; gpaPoints: number } {
  const bonus = isHonors ? 0.5 : 0;
  if (percentage >= 93) return { letter: "A", gpaPoints: 4.0 + bonus };
  if (percentage >= 90) return { letter: "A-", gpaPoints: 3.7 + bonus };
  if (percentage >= 87) return { letter: "B+", gpaPoints: 3.3 + bonus };
  if (percentage >= 83) return { letter: "B", gpaPoints: 3.0 + bonus };
  if (percentage >= 80) return { letter: "B-", gpaPoints: 2.7 + bonus };
  if (percentage >= 77) return { letter: "C+", gpaPoints: 2.3 + bonus };
  if (percentage >= 73) return { letter: "C", gpaPoints: 2.0 + bonus };
  if (percentage >= 70) return { letter: "C-", gpaPoints: 1.7 + bonus };
  if (percentage >= 67) return { letter: "D+", gpaPoints: 1.3 + bonus };
  if (percentage >= 60) return { letter: "D", gpaPoints: 1.0 + bonus };
  return { letter: "F", gpaPoints: 0.0 };
}

const DEMO_CLASSES: CourseClass[] = [
  { id: "demo-gpa-1", name: "Data Structures & Algorithms (Preview)", code: "CS 201", credits: 4, pointsEarned: 375, currentPossible: 400, totalPossible: 500, isHonors: false },
  { id: "demo-gpa-2", name: "Honors Linear Algebra (Preview)", code: "MATH 240", credits: 4, pointsEarned: 280, currentPossible: 300, totalPossible: 400, isHonors: true },
  { id: "demo-gpa-3", name: "Technical Writing (Preview)", code: "ENG 105", credits: 3, pointsEarned: 190, currentPossible: 200, totalPossible: 300, isHonors: false },
];

export default function GpaPage() {
  const { isAuthenticated, requireAuth } = useAuthGate();
  const formRef = useRef<HTMLElement>(null);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [draft, setDraft] = useState<ClassDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { notify } = useNotifications();
  const targetLetter = "A";

  const loadClasses = useCallback(async () => {
    try {
      const stored = localStorage.getItem("tasktracker-gpa-classes");
      const localList: CourseClass[] = stored ? JSON.parse(stored) : [];
      const map = new Map<string, CourseClass>();
      for (const item of localList) map.set(item.id, item);

      const res = await fetch("/api/gpa", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.classes && Array.isArray(data.classes)) {
          for (const item of data.classes) map.set(item.id, item);
        }
      }

      const merged = Array.from(map.values());
      if (merged.length === 0 && !isAuthenticated) {
        setClasses(DEMO_CLASSES);
      } else {
        setClasses(merged);
        if (typeof window !== "undefined") {
          localStorage.setItem("tasktracker-gpa-classes", JSON.stringify(merged));
        }
      }
    } catch {
      try {
        const stored = localStorage.getItem("tasktracker-gpa-classes");
        const parsed = stored ? JSON.parse(stored) : [];
        setClasses(parsed.length > 0 ? parsed : (!isAuthenticated ? DEMO_CLASSES : []));
      } catch {
        setClasses(!isAuthenticated ? DEMO_CLASSES : []);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // This mount-time sync intentionally loads saved and server GPA content before
    // rendering the class list; the lint rule is overly strict for this async flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClasses();
    const unsubscribe = subscribeToDataSync(() => {
      void loadClasses();
    });
    return () => unsubscribe();
  }, [loadClasses]);

  function saveClasses(next: CourseClass[]) {
    setClasses(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasktracker-gpa-classes", JSON.stringify(next));
      broadcastDataChanged("gpa-classes-updated");
    }
  }

  function updateDraft(field: keyof ClassDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startEdit(item: CourseClass) {
    if (!requireAuth(() => startEdit(item), "Sign in to edit course grades.")) {
      return;
    }
    setEditingId(item.id);
    setDraft({
      name: item.name,
      code: item.code,
      credits: String(item.credits),
      pointsEarned: String(item.pointsEarned),
      currentPossible: String(item.currentPossible),
      totalPossible: String(item.totalPossible),
      isHonors: Boolean(item.isHonors),
    });
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth(() => {}, "Sign in or attach a Google or Microsoft account to save courses and calculate your GPA.")) {
      return;
    }
    if (!draft.name.trim()) {
      setError("Please enter a class name.");
      return;
    }
    const credits = Number(draft.credits) || 0;
    const pointsEarned = Number(draft.pointsEarned) || 0;
    const currentPossible = Number(draft.currentPossible) || pointsEarned || 0;
    const totalPossible = Number(draft.totalPossible) || currentPossible || 0;

    if (currentPossible <= 0 && totalPossible <= 0) {
      setError("Points possible must be greater than 0.");
      return;
    }
    if (pointsEarned < 0) {
      setError("Earned points cannot be negative.");
      return;
    }

    const newItem: CourseClass = {
      id: editingId || crypto.randomUUID(),
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase() || "COURSE",
      credits: credits > 0 ? credits : 3,
      pointsEarned,
      currentPossible: currentPossible > 0 ? currentPossible : totalPossible,
      totalPossible: totalPossible > 0 ? totalPossible : currentPossible,
      isHonors: draft.isHonors,
    };

    try {
      await fetch("/api/gpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
    } catch {
      // Offline fallback
    }

    const next = editingId
      ? classes.map((c) => (c.id === editingId ? newItem : c))
      : [...classes, newItem];

    saveClasses(next);
    resetDraft();
    notify(editingId ? "Class updated." : "Class added.", "success");
  }

  async function handleDelete(id: string) {
    if (!requireAuth(() => handleDelete(id), "Sign in to delete courses.")) {
      return;
    }
    const target = classes.find((c) => c.id === id);
    if (!target) return;
    if (!window.confirm('Delete "' + target.name + '"?')) return;

    try {
      await fetch("/api/gpa?id=" + encodeURIComponent(id), {
        method: "DELETE",
      });
    } catch {
      // Offline fallback
    }

    const next = classes.filter((c) => c.id !== id);
    saveClasses(next);
    if (editingId === id) resetDraft();
    notify("Class deleted.", "info");
  }

  function exportGpaCsv() {
    if (!requireAuth(exportGpaCsv, "Sign in to export your GPA transcripts and reports.")) {
      return;
    }
    if (!classes.length) return;
    const headers = ["Course Name", "Code", "Credits", "Points Earned", "Current Possible", "Term Total", "Current %", "Letter Grade", "Honors"];
    const rows = evaluatedClasses.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.code,
      c.credits,
      c.pointsEarned,
      c.currentPossible,
      c.totalPossible,
      c.currentPercentage.toFixed(1) + "%",
      c.letter,
      c.isHonors ? "Yes" : "No"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tasktracker-gpa-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("GPA report exported to CSV.", "success");
  }

  // Calculate Cumulative Current GPA & Total Course Stats
  const { evaluatedClasses, currentGpa, currentPercentage, totalEarnedPoints, totalCurrentPossible, totalCredits } = useMemo(() => {
    let qPointsSum = 0;
    let creditsSum = 0;
    let earnedSum = 0;
    let currentPossibleSum = 0;

    const list = classes.map((item) => {
      const currentPct = item.currentPossible > 0 ? (item.pointsEarned / item.currentPossible) * 100 : 0;
      const { letter, gpaPoints } = getLetterGrade(currentPct, item.isHonors);
      const qualityPoints = gpaPoints * item.credits;

      return { item, currentPct, letter, gpaPoints, qualityPoints };
    });

    for (const entry of list) {
      qPointsSum += entry.qualityPoints;
      creditsSum += entry.item.credits;
      earnedSum += entry.item.pointsEarned;
      currentPossibleSum += entry.item.currentPossible;
    }

    const evaluated = list.map((entry) => ({
      ...entry.item,
      currentPercentage: entry.currentPct,
      letter: entry.letter,
      gpaPoints: entry.gpaPoints,
    }));

    const gpaVal = creditsSum > 0 ? (qPointsSum / creditsSum).toFixed(2) : "0.00";
    const pctVal = currentPossibleSum > 0 ? ((earnedSum / currentPossibleSum) * 100).toFixed(1) : "0.0";

    return {
      evaluatedClasses: evaluated,
      currentGpa: gpaVal,
      currentPercentage: pctVal,
      totalEarnedPoints: earnedSum,
      totalCurrentPossible: currentPossibleSum,
      totalCredits: creditsSum,
    };
  }, [classes]);

  // Target threshold percentages
  const targetThresholds: Record<string, number> = {
    "A": 93,
    "A-": 90,
    "B+": 87,
    "B": 83,
    "B-": 80,
    "C+": 77,
    "C": 73
  };

  return (
    <AppShell active="GPA Tracker" eyebrow="Workspace" title="GPA Tracker" description="Track graded points vs. term points with honors weighting and grade projection simulations.">
      <div className="gpa-summary-hero">
        <div className="gpa-main-stat">
          <span className="gpa-kicker">CURRENT CUMULATIVE GPA</span>
          <h2>{currentGpa}</h2>
          <p>{totalCredits} total credit hours across {classes.length} class{classes.length === 1 ? "" : "es"}</p>
        </div>
        <div className="gpa-stats-divider" />
        <div className="gpa-sub-stats">
          <div>
            <strong>{currentPercentage}%</strong>
            <span>Current Average (Graded)</span>
          </div>
          <div>
            <strong>{totalEarnedPoints} / {totalCurrentPossible}</strong>
            <span>Points Earned so far</span>
          </div>
        </div>
      </div>

      <TTBotHint command="What is my current GPA?">TT Bot can analyze your current graded points and calculate your live GPA.</TTBotHint>

      <section className="panel task-manager-form" ref={formRef}>
        <div className="panel-header">
          <div>
            <h2>{editingId ? "Edit class details" : "Add a class"}</h2>
            <p>{editingId ? "Update your points earned, current points possible, or total points." : "Enter class name, points earned so far, current possible points, and total course points."}</p>
          </div>
          {editingId && (
            <button className="text-button" type="button" onClick={resetDraft}>
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="task-form-grid">
          <label className="task-field task-field-wide">
            Class name
            <input
              value={draft.name}
              onChange={(e) => updateDraft("name", e.target.value)}
              placeholder="e.g. Intro to Psychology"
              required
            />
          </label>
          <label className="task-field">
            Course code
            <input
              value={draft.code}
              onChange={(e) => updateDraft("code", e.target.value)}
              placeholder="e.g. PSYC 101"
            />
          </label>
          <label className="task-field">
            Credits
            <input
              type="number"
              min="1"
              max="12"
              value={draft.credits}
              onChange={(e) => updateDraft("credits", e.target.value)}
              required
            />
          </label>
          <label className="task-field">
            Points earned so far
            <input
              type="number"
              step="any"
              min="0"
              value={draft.pointsEarned}
              onChange={(e) => updateDraft("pointsEarned", e.target.value)}
              placeholder="e.g. 270"
              required
            />
          </label>
          <label className="task-field">
            Current possible points (Graded)
            <input
              type="number"
              step="any"
              min="1"
              value={draft.currentPossible}
              onChange={(e) => updateDraft("currentPossible", e.target.value)}
              placeholder="e.g. 300"
              required
            />
          </label>
          <label className="task-field">
            Total course points (Full term)
            <input
              type="number"
              step="any"
              min="1"
              value={draft.totalPossible}
              onChange={(e) => updateDraft("totalPossible", e.target.value)}
              placeholder="e.g. 500"
              required
            />
          </label>
          <label className="task-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22 }}>
            <input
              type="checkbox"
              checked={draft.isHonors}
              onChange={(e) => updateDraft("isHonors", e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--teal)" }}
            />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Honors / AP Weight (+0.5 GPA)</span>
          </label>
          <button className="primary-button task-save" type="submit">
            {editingId ? "Save changes" : "Add class"}
          </button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <section className="panel task-list-panel">
        <div className="panel-header task-list-heading">
          <div>
            <h2>Your classes</h2>
            <p>{classes.length} course{classes.length === 1 ? "" : "s"} tracked</p>
          </div>
          <div className="task-header-actions">
            <button
              type="button"
              className="task-action-btn"
              onClick={exportGpaCsv}
              title="Export GPA report to CSV"
            >
              <Download size={13} /> Export Report
            </button>
          </div>
        </div>

        {evaluatedClasses.length ? (
          <div className="gpa-class-list">
            {evaluatedClasses.map((item) => {
              const remainingPoints = Math.max(0, item.totalPossible - item.currentPossible);
              const targetPct = targetThresholds[targetLetter] || 90;
              const pointsNeeded = (targetPct / 100) * item.totalPossible - item.pointsEarned;
              const pctNeededOnRemaining = remainingPoints > 0 ? (pointsNeeded / remainingPoints) * 100 : null;

              return (
                <article className="gpa-class-card" key={item.id}>
                  <div className="gpa-class-badge">
                    <strong>{item.letter}</strong>
                    <small>{item.gpaPoints.toFixed(1)} GPA</small>
                  </div>
                  <div className="gpa-class-body">
                    <div className="gpa-class-title-row">
                      <strong>{item.name}</strong>
                      <span className="gpa-course-code">
                        {item.code} ({item.credits} cr){item.isHonors ? " • Honors" : ""}
                      </span>
                    </div>
                    <div className="gpa-progress-bar">
                      <span style={{ width: Math.min(100, Math.max(0, item.currentPercentage)) + "%" }} />
                    </div>
                    <div className="gpa-class-meta">
                      <span>Graded so far: <b>{item.pointsEarned} / {item.currentPossible}</b></span>
                      <span>Current Score: <b>{item.currentPercentage.toFixed(1)}%</b></span>
                      <span>Term Total: <b>{item.totalPossible} pts</b></span>
                    </div>

                    {remainingPoints > 0 && pctNeededOnRemaining !== null && (
                      <div className="gpa-projection-hint">
                        <Calculator size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4, color: "var(--teal)" }} />
                        <span>
                          Target <b>{targetLetter} ({targetPct}%)</b>: Need{" "}
                          <b>
                            {pctNeededOnRemaining <= 0
                              ? "Already secured!"
                              : pctNeededOnRemaining > 100
                              ? "Mathematically impossible (>100%)"
                              : `${pctNeededOnRemaining.toFixed(1)}% on remaining ${remainingPoints} pts`}
                          </b>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="gpa-class-actions">
                    <button className="text-button" type="button" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button className="text-button task-delete" type="button" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No classes added yet. Add a class above to calculate your GPA.</p>
        )}
      </section>
    </AppShell>
  );
}

