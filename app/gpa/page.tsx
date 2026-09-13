"use client";

import { useMemo, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";

type CourseClass = {
  id: string;
  name: string;
  code: string;
  credits: number;
  pointsEarned: number;
  pointsPossible: number;
};

type ClassDraft = {
  name: string;
  code: string;
  credits: string;
  pointsEarned: string;
  pointsPossible: string;
};

const emptyDraft: ClassDraft = {
  name: "",
  code: "",
  credits: "3",
  pointsEarned: "",
  pointsPossible: "",
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
  const [classes, setClasses] = useState<CourseClass[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("tasktracker-gpa-classes");
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback
      }
      return [
        { id: crypto.randomUUID(), name: "Intro to Computer Science", code: "CS 101", credits: 3, pointsEarned: 460, pointsPossible: 500 },
        { id: crypto.randomUUID(), name: "Academic Writing", code: "WRTG 111", credits: 3, pointsEarned: 380, pointsPossible: 400 },
      ];
    }
    return [];
  });

  const [draft, setDraft] = useState<ClassDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { notify } = useNotifications();

  function saveClasses(next: CourseClass[]) {
    setClasses(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasktracker-gpa-classes", JSON.stringify(next));
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
      pointsPossible: String(item.pointsPossible),
    });
    setError("");
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Please enter a class name.");
      return;
    }
    const credits = Number(draft.credits) || 0;
    const pointsEarned = Number(draft.pointsEarned) || 0;
    const pointsPossible = Number(draft.pointsPossible) || 0;

    if (pointsPossible <= 0) {
      setError("Total possible points must be greater than 0.");
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
      pointsPossible,
    };

    const next = editingId
      ? classes.map((c) => (c.id === editingId ? newItem : c))
      : [...classes, newItem];

    saveClasses(next);
    resetDraft();
    notify(editingId ? "Class updated." : "Class added.", "success");
  }

  function handleDelete(id: string) {
    const target = classes.find((c) => c.id === id);
    if (!target) return;
    if (!window.confirm(`Delete "${target.name}"?`)) return;
    const next = classes.filter((c) => c.id !== id);
    saveClasses(next);
    if (editingId === id) resetDraft();
    notify("Class deleted.", "info");
  }

 // Calculate Cumulative GPA with useMemo
  const { evaluatedClasses, cumulativeGpa, overallPercentage, overallEarnedPoints, overallPossiblePoints, totalCredits } = useMemo(() => {
    let qPointsSum = 0;
    let creditsSum = 0;
    let earnedSum = 0;
    let possibleSum = 0;

    const list = classes.map((item) => {
      const pct = item.pointsPossible > 0 ? (item.pointsEarned / item.pointsPossible) * 100 : 0;
      const { letter, gpaPoints } = getLetterGrade(pct);
      const qualityPoints = gpaPoints * item.credits;

      return { item, pct, letter, gpaPoints, qualityPoints };
    });

    for (const entry of list) {
      qPointsSum += entry.qualityPoints;
      creditsSum += entry.item.credits;
      earnedSum += entry.item.pointsEarned;
      possibleSum += entry.item.pointsPossible;
    }

    const evaluated = list.map((entry) => ({
      ...entry.item,
      percentage: entry.pct,
      letter: entry.letter,
      gpaPoints: entry.gpaPoints,
    }));

    const gpaVal = creditsSum > 0 ? (qPointsSum / creditsSum).toFixed(2) : "0.00";
    const pctVal = possibleSum > 0 ? ((earnedSum / possibleSum) * 100).toFixed(1) : "0.0";

    return {
      evaluatedClasses: evaluated,
      cumulativeGpa: gpaVal,
      overallPercentage: pctVal,
      overallEarnedPoints: earnedSum,
      overallPossiblePoints: possibleSum,
      totalCredits: creditsSum,
    };
  }, [classes]);

  return (
    <AppShell active="GPA Tracker" eyebrow="Workspace" title="GPA Tracker" description="Track your class points, letter grades, and overall GPA automatically.">
      <div className="gpa-summary-hero">
        <div className="gpa-main-stat">
          <span className="gpa-kicker">CUMULATIVE GPA</span>
          <h2>{cumulativeGpa}</h2>
          <p>{totalCredits} total credit hours across {classes.length} class{classes.length === 1 ? "" : "es"}</p>
        </div>
        <div className="gpa-stats-divider" />
        <div className="gpa-sub-stats">
          <div>
            <strong>{overallPercentage}%</strong>
            <span>Overall Course Average</span>
          </div>
          <div>
            <strong>{overallEarnedPoints} / {overallPossiblePoints}</strong>
            <span>Total Points Earned</span>
          </div>
        </div>
      </div>

      <TTBotHint command="What is my current GPA?">TT Bot can analyze your course points and suggest which classes need attention.</TTBotHint>

      <section className="panel task-manager-form">
        <div className="panel-header">
          <div>
            <h2>{editingId ? "Edit class" : "Add a class"}</h2>
            <p>{editingId ? "Update your class details and grade points." : "Enter class name, total points possible, and points earned."}</p>
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
            Points earned
            <input
              type="number"
              step="any"
              min="0"
              value={draft.pointsEarned}
              onChange={(e) => updateDraft("pointsEarned", e.target.value)}
              placeholder="e.g. 450"
              required
            />
          </label>
          <label className="task-field">
            Total points possible
            <input
              type="number"
              step="any"
              min="1"
              value={draft.pointsPossible}
              onChange={(e) => updateDraft("pointsPossible", e.target.value)}
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
                    <span style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }} />
                  </div>
                  <div className="gpa-class-meta">
                    <span>Points: <b>{item.pointsEarned} / {item.pointsPossible}</b></span>
                    <span>Score: <b>{item.percentage.toFixed(1)}%</b></span>
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
