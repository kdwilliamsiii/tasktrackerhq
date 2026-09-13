"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";

type CourseClass = {
  id: string;
  name: string;
  code: string;
  credits: number;
  pointsEarned: number;
  currentPossible: number;
  totalPossible: number;
};

type ClassDraft = {
  name: string;
  code: string;
  credits: string;
  pointsEarned: string;
  currentPossible: string;
  totalPossible: string;
};

const emptyDraft: ClassDraft = {
  name: "",
  code: "",
  credits: "3",
  pointsEarned: "",
  currentPossible: "",
  totalPossible: "",
};

function getLetterGrade(percentage: number): { letter: string; gpaPoints: number } {
  if (percentage >= 93) return { letter: "A", gpaPoints: 4.0 };
  if (percentage >= 90) return { letter: "A-", gpaPoints: 3.7 };
  if (percentage >= 87) return { letter: "B+", gpaPoints: 3.3 };
  if (percentage >= 83) return { letter: "B", gpaPoints: 3.0 };
  if (percentage >= 80) return { letter: "B-", gpaPoints: 2.7 };
  if (percentage >= 77) return { letter: "C+", gpaPoints: 2.3 };
  if (percentage >= 73) return { letter: "C", gpaPoints: 2.0 };
  if (percentage >= 70) return { letter: "C-", gpaPoints: 1.7 };
  if (percentage >= 67) return { letter: "D+", gpaPoints: 1.3 };
  if (percentage >= 60) return { letter: "D", gpaPoints: 1.0 };
  return { letter: "F", gpaPoints: 0.0 };
}

export default function GpaPage() {
  const formRef = useRef<HTMLElement>(null);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [draft, setDraft] = useState<ClassDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { notify } = useNotifications();

  const loadClasses = async () => {
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
      setClasses(merged);
      if (typeof window !== "undefined") {
        localStorage.setItem("tasktracker-gpa-classes", JSON.stringify(merged));
      }
    } catch {
      try {
        const stored = localStorage.getItem("tasktracker-gpa-classes");
        if (stored) setClasses(JSON.parse(stored));
      } catch {
        setClasses([]);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClasses();
    }, 0);

    const handleUpdate = () => {
      void loadClasses();
    };

    window.addEventListener("tasktracker-data-changed", handleUpdate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("tasktracker-data-changed", handleUpdate);
    };
  }, []);

  function saveClasses(next: CourseClass[]) {
    setClasses(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasktracker-gpa-classes", JSON.stringify(next));
      window.dispatchEvent(new Event("tasktracker-data-changed"));
    }
  }

  function updateDraft(field: keyof ClassDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startEdit(item: CourseClass) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      code: item.code,
      credits: String(item.credits),
      pointsEarned: String(item.pointsEarned),
      currentPossible: String(item.currentPossible),
      totalPossible: String(item.totalPossible),
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

  // Calculate Cumulative Current GPA & Total Course Stats
  const { evaluatedClasses, currentGpa, currentPercentage, totalEarnedPoints, totalCurrentPossible, totalCredits } = useMemo(() => {
    let qPointsSum = 0;
    let creditsSum = 0;
    let earnedSum = 0;
    let currentPossibleSum = 0;

    const list = classes.map((item) => {
      const currentPct = item.currentPossible > 0 ? (item.pointsEarned / item.currentPossible) * 100 : 0;
      const { letter, gpaPoints } = getLetterGrade(currentPct);
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

  return (
    <AppShell active="GPA Tracker" eyebrow="Workspace" title="GPA Tracker" description="Track points graded so far vs. total course points to stay on top of your current GPA.">
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
        </div>

        {evaluatedClasses.length ? (
          <div className="gpa-class-list">
            {evaluatedClasses.map((item) => (
              <article className="gpa-class-card" key={item.id}>
                <div className="gpa-class-badge">
                  <strong>{item.letter}</strong>
                  <small>{item.gpaPoints.toFixed(1)} GPA</small>
                </div>
                <div className="gpa-class-body">
                  <div className="gpa-class-title-row">
                    <strong>{item.name}</strong>
                    <span className="gpa-course-code">{item.code} ({item.credits} cr)</span>
                  </div>
                  <div className="gpa-progress-bar">
                    <span style={{ width: Math.min(100, Math.max(0, item.currentPercentage)) + "%" }} />
                  </div>
                  <div className="gpa-class-meta">
                    <span>Graded so far: <b>{item.pointsEarned} / {item.currentPossible}</b></span>
                    <span>Current Score: <b>{item.currentPercentage.toFixed(1)}%</b></span>
                    <span>Term Total: <b>{item.totalPossible} pts</b></span>
                  </div>
                </div>
                <div className="task-row-actions">
                  <button className="text-button" type="button" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <button className="text-button task-delete" type="button" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No classes added yet. Add a class above to calculate your GPA.</p>
        )}
      </section>
    </AppShell>
  );
}
