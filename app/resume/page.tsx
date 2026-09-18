"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import TTBotHint from "../../components/TTBotHint";
import { useAuthGate } from "../../components/AuthModalProvider";
import { broadcastDataChanged, subscribeToDataSync } from "../../lib/sync";
import { callAiAssistant } from "../../lib/ai";
import { Sparkles, Plus, Trash2, Download, Save, FileText } from "lucide-react";

type ExperienceItem = {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
};

type EducationItem = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
};

type ProjectItem = {
  id: string;
  name: string;
  description: string;
  link: string;
};

type ResumeState = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
};

const STORAGE_KEY = "tasktracker-resume-draft";

const DEMO_RESUME: ResumeState = {
  fullName: "Jordan Avery (Preview)",
  title: "Product-Minded Software Engineer",
  email: "jordan.avery@example.com",
  phone: "(555) 012-3456",
  location: "Austin, TX",
  linkedin: "linkedin.com/in/jordanavery",
  website: "jordanavery.dev",
  summary:
    "Software engineer with 4+ years building reliable web applications end-to-end. Focused on shipping fast, measuring impact, and mentoring junior developers.",
  experience: [
    {
      id: "demo-exp-1",
      role: "Senior Frontend Engineer",
      company: "Northwind Digital",
      location: "Remote",
      startDate: "2023-02",
      endDate: "",
      current: true,
      bullets: [
        "Led migration of a legacy dashboard to a component-driven React architecture, cutting page load time by 38%.",
        "Mentored 3 junior engineers through structured code reviews and pairing sessions.",
        "Partnered with design and product to ship a redesigned onboarding flow that lifted activation by 12%.",
      ],
    },
    {
      id: "demo-exp-2",
      role: "Software Engineer",
      company: "Bright Path Labs",
      location: "Austin, TX",
      startDate: "2020-06",
      endDate: "2023-01",
      current: false,
      bullets: [
        "Built and maintained REST APIs serving 500K+ daily requests with 99.9% uptime.",
        "Automated the deployment pipeline, reducing release time from 45 minutes to under 8 minutes.",
      ],
    },
  ],
  education: [
    {
      id: "demo-edu-1",
      school: "University of Texas at Austin",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2016-08",
      endDate: "2020-05",
    },
  ],
  skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "AWS", "CI/CD"],
  projects: [
    {
      id: "demo-proj-1",
      name: "TaskTrackerHQ",
      description: "Personal productivity workspace with tasks, calendar sync, focus timer, and AI assistance.",
      link: "tasktrackerhq.app",
    },
  ],
};

const emptyResume: ResumeState = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  website: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

function monthLabel(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function ResumePage() {
  const { isAuthenticated, requireAuth } = useAuthGate();
  const { notify } = useNotifications();
  const [resume, setResume] = useState<ResumeState>(emptyResume);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [polishingId, setPolishingId] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const loadResume = useCallback(async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const localDraft: ResumeState | null = stored ? JSON.parse(stored) : null;

      const res = await fetch("/api/resume", { cache: "no-store" });
      let serverResume: ResumeState | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data.resume) serverResume = data.resume;
      }

      if (serverResume) {
        setResume(serverResume);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverResume));
      } else if (localDraft) {
        setResume(localDraft);
      } else if (!isAuthenticated) {
        setResume(DEMO_RESUME);
      } else {
        setResume(emptyResume);
      }
    } catch {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : null;
        setResume(parsed || (!isAuthenticated ? DEMO_RESUME : emptyResume));
      } catch {
        setResume(!isAuthenticated ? DEMO_RESUME : emptyResume);
      }
    } finally {
      loadedOnce.current = true;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadResume();
    const unsubscribe = subscribeToDataSync(() => {
      void loadResume();
    });
    return () => unsubscribe();
  }, [loadResume]);

  useEffect(() => {
    if (!loadedOnce.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }, [resume]);

  function updateField<K extends keyof ResumeState>(field: K, value: ResumeState[K]) {
    setResume((current) => ({ ...current, [field]: value }));
  }

  // ---------------- Experience ----------------
  function addExperience() {
    setResume((current) => ({
      ...current,
      experience: [
        ...current.experience,
        { id: crypto.randomUUID(), role: "", company: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] },
      ],
    }));
  }

  function updateExperience(id: string, changes: Partial<ExperienceItem>) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
  }

  function removeExperience(id: string) {
    setResume((current) => ({ ...current, experience: current.experience.filter((item) => item.id !== id) }));
  }

  function addBullet(experienceId: string) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item) =>
        item.id === experienceId ? { ...item, bullets: [...item.bullets, ""] } : item
      ),
    }));
  }

  function updateBullet(experienceId: string, index: number, value: string) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item) =>
        item.id === experienceId
          ? { ...item, bullets: item.bullets.map((b, i) => (i === index ? value : b)) }
          : item
      ),
    }));
  }

  function removeBullet(experienceId: string, index: number) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item) =>
        item.id === experienceId ? { ...item, bullets: item.bullets.filter((_, i) => i !== index) } : item
      ),
    }));
  }

  async function polishBullet(experienceId: string, index: number, text: string) {
    if (!requireAuth(() => {}, "Sign in to polish resume bullet points with AI.")) return;
    if (!text.trim()) return;
    const key = experienceId + "-" + index;
    setPolishingId(key);
    try {
      const polished = await callAiAssistant(
        `Rewrite this resume bullet point using a strong action verb and quantifiable impact where reasonable. Keep it one concise line with no quotation marks: "${text}"`,
        "fast",
        "free",
        "resume-bullet"
      );
      if (polished) {
        updateBullet(experienceId, index, polished.trim().replace(/^"|"$/g, ""));
        notify("Bullet point polished with AI.", "success");
      }
    } catch {
      notify("Could not polish this bullet point right now.", "error");
    } finally {
      setPolishingId(null);
    }
  }

  // ---------------- Education ----------------
  function addEducation() {
    setResume((current) => ({
      ...current,
      education: [
        ...current.education,
        { id: crypto.randomUUID(), school: "", degree: "", field: "", startDate: "", endDate: "" },
      ],
    }));
  }

  function updateEducation(id: string, changes: Partial<EducationItem>) {
    setResume((current) => ({
      ...current,
      education: current.education.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
  }

  function removeEducation(id: string) {
    setResume((current) => ({ ...current, education: current.education.filter((item) => item.id !== id) }));
  }

  // ---------------- Projects ----------------
  function addProject() {
    setResume((current) => ({
      ...current,
      projects: [...current.projects, { id: crypto.randomUUID(), name: "", description: "", link: "" }],
    }));
  }

  function updateProject(id: string, changes: Partial<ProjectItem>) {
    setResume((current) => ({
      ...current,
      projects: current.projects.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
  }

  function removeProject(id: string) {
    setResume((current) => ({ ...current, projects: current.projects.filter((item) => item.id !== id) }));
  }

  // ---------------- Skills ----------------
  function addSkill() {
    const value = skillInput.trim();
    if (!value) return;
    setResume((current) => ({
      ...current,
      skills: current.skills.includes(value) ? current.skills : [...current.skills, value],
    }));
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setResume((current) => ({ ...current, skills: current.skills.filter((s) => s !== skill) }));
  }

  // ---------------- Summary AI Polish ----------------
  async function polishSummary() {
    if (!requireAuth(() => {}, "Sign in to polish your resume summary with AI.")) return;
    if (!resume.summary.trim()) {
      notify("Write a draft summary first, then polish it with AI.", "warning");
      return;
    }
    setPolishingId("summary");
    try {
      const polished = await callAiAssistant(
        `Rewrite this resume professional summary to be concise, impactful, and ATS-friendly in 2-4 sentences. No quotation marks: "${resume.summary}"`,
        "fast",
        "free",
        "resume-summary"
      );
      if (polished) {
        updateField("summary", polished.trim().replace(/^"|"$/g, ""));
        notify("Summary polished with AI.", "success");
      }
    } catch {
      notify("Could not polish the summary right now.", "error");
    } finally {
      setPolishingId(null);
    }
  }

  // ---------------- Save & Export ----------------
  async function saveResume() {
    if (!requireAuth(() => {}, "Sign in or attach a Google or Microsoft account to save your resume.")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      if (!response.ok) throw new Error("Unable to save resume");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
      broadcastDataChanged("resume-saved");
      notify("Resume saved.", "success");
    } catch {
      notify("Unable to save your resume right now. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  function exportPdf() {
    if (!requireAuth(() => {}, "Sign in to export your resume as a PDF.")) return;
    window.print();
  }

  return (
    <AppShell
      active="Resume Builder"
      eyebrow="Workspace"
      title="Resume Builder"
      description="Build a polished, ATS-friendly resume with AI-assisted writing help."
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="filter-button"
            type="button"
            onClick={exportPdf}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={14} /> Export PDF
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={saveResume}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Resume"}
          </button>
        </div>
      }
    >
      <TTBotHint command="help me write my resume summary">
        TT Bot and Fast AI can help polish your summary and bullet points for a stronger resume.
      </TTBotHint>

      <div className="resume-builder-grid">
        <div className="resume-editor-column">
          {/* Contact Info */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Contact information</h2>
                <p>This appears at the top of your resume.</p>
              </div>
            </div>
            <div className="task-form-grid">
              <label className="task-field task-field-wide">
                Full name
                <input value={resume.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="e.g. Jordan Avery" />
              </label>
              <label className="task-field task-field-wide">
                Professional headline
                <input value={resume.title} onChange={(e) => updateField("title", e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
              </label>
              <label className="task-field">
                Email
                <input value={resume.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" />
              </label>
              <label className="task-field">
                Phone
                <input value={resume.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(555) 012-3456" />
              </label>
              <label className="task-field">
                Location
                <input value={resume.location} onChange={(e) => updateField("location", e.target.value)} placeholder="City, State" />
              </label>
              <label className="task-field">
                LinkedIn
                <input value={resume.linkedin} onChange={(e) => updateField("linkedin", e.target.value)} placeholder="linkedin.com/in/you" />
              </label>
              <label className="task-field">
                Website / Portfolio
                <input value={resume.website} onChange={(e) => updateField("website", e.target.value)} placeholder="yoursite.dev" />
              </label>
            </div>
          </section>

          {/* Summary */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Professional summary</h2>
                <p>A 2-4 sentence pitch highlighting your experience and strengths.</p>
              </div>
              <button type="button" className="text-button" onClick={polishSummary} disabled={polishingId === "summary"}>
                <Sparkles size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                {polishingId === "summary" ? "Polishing..." : "AI Polish"}
              </button>
            </div>
            <textarea
              className="resume-textarea"
              rows={4}
              value={resume.summary}
              onChange={(e) => updateField("summary", e.target.value)}
              placeholder="Software engineer with 4+ years building reliable web applications end-to-end..."
            />
          </section>

          {/* Skills */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Skills</h2>
                <p>Add relevant technical and professional skills.</p>
              </div>
            </div>
            <div className="resume-skill-input-row">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. TypeScript"
              />
              <button type="button" className="filter-button" onClick={addSkill}>
                <Plus size={13} /> Add
              </button>
            </div>
            <div className="resume-skill-chip-list">
              {resume.skills.map((skill) => (
                <span className="resume-skill-chip" key={skill}>
                  {skill}
                  <button type="button" aria-label={"Remove " + skill} onClick={() => removeSkill(skill)}>
                    ×
                  </button>
                </span>
              ))}
              {!resume.skills.length && <p className="empty-state">No skills added yet.</p>}
            </div>
          </section>

          {/* Experience */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Work experience</h2>
                <p>List your roles, most recent first.</p>
              </div>
              <button type="button" className="text-button" onClick={addExperience}>
                <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> Add role
              </button>
            </div>
            <div className="resume-entry-list">
              {resume.experience.map((item) => (
                <div className="resume-entry-card" key={item.id}>
                  <div className="task-form-grid">
                    <label className="task-field">
                      Role
                      <input value={item.role} onChange={(e) => updateExperience(item.id, { role: e.target.value })} placeholder="e.g. Senior Frontend Engineer" />
                    </label>
                    <label className="task-field">
                      Company
                      <input value={item.company} onChange={(e) => updateExperience(item.id, { company: e.target.value })} placeholder="e.g. Northwind Digital" />
                    </label>
                    <label className="task-field">
                      Location
                      <input value={item.location} onChange={(e) => updateExperience(item.id, { location: e.target.value })} placeholder="City, State or Remote" />
                    </label>
                    <label className="task-field">
                      Start date
                      <input type="month" value={item.startDate} onChange={(e) => updateExperience(item.id, { startDate: e.target.value })} />
                    </label>
                    <label className="task-field">
                      End date
                      <input
                        type="month"
                        value={item.endDate}
                        disabled={item.current}
                        onChange={(e) => updateExperience(item.id, { endDate: e.target.value })}
                      />
                    </label>
                    <label className="task-field resume-inline-checkbox">
                      <input
                        type="checkbox"
                        checked={item.current}
                        onChange={(e) => updateExperience(item.id, { current: e.target.checked, endDate: e.target.checked ? "" : item.endDate })}
                      />
                      <span>I currently work here</span>
                    </label>
                  </div>

                  <div className="resume-bullet-list">
                    <span className="resume-bullet-label">Highlights</span>
                    {item.bullets.map((bullet, index) => (
                      <div className="resume-bullet-row" key={index}>
                        <textarea
                          rows={2}
                          value={bullet}
                          onChange={(e) => updateBullet(item.id, index, e.target.value)}
                          placeholder="Describe an accomplishment with measurable impact..."
                        />
                        <div className="resume-bullet-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => polishBullet(item.id, index, bullet)}
                            disabled={polishingId === item.id + "-" + index}
                          >
                            <Sparkles size={12} />
                          </button>
                          <button type="button" className="text-button danger-text" onClick={() => removeBullet(item.id, index)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="text-button" onClick={() => addBullet(item.id)}>
                      <Plus size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Add bullet
                    </button>
                  </div>

                  <button type="button" className="text-button danger-text resume-remove-entry" onClick={() => removeExperience(item.id)}>
                    <Trash2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Remove role
                  </button>
                </div>
              ))}
              {!resume.experience.length && <p className="empty-state">No work experience added yet.</p>}
            </div>
          </section>

          {/* Education */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Education</h2>
                <p>Schools, degrees, and fields of study.</p>
              </div>
              <button type="button" className="text-button" onClick={addEducation}>
                <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> Add school
              </button>
            </div>
            <div className="resume-entry-list">
              {resume.education.map((item) => (
                <div className="resume-entry-card" key={item.id}>
                  <div className="task-form-grid">
                    <label className="task-field task-field-wide">
                      School
                      <input value={item.school} onChange={(e) => updateEducation(item.id, { school: e.target.value })} placeholder="e.g. University of Texas at Austin" />
                    </label>
                    <label className="task-field">
                      Degree
                      <input value={item.degree} onChange={(e) => updateEducation(item.id, { degree: e.target.value })} placeholder="e.g. B.S." />
                    </label>
                    <label className="task-field">
                      Field of study
                      <input value={item.field} onChange={(e) => updateEducation(item.id, { field: e.target.value })} placeholder="e.g. Computer Science" />
                    </label>
                    <label className="task-field">
                      Start date
                      <input type="month" value={item.startDate} onChange={(e) => updateEducation(item.id, { startDate: e.target.value })} />
                    </label>
                    <label className="task-field">
                      End date
                      <input type="month" value={item.endDate} onChange={(e) => updateEducation(item.id, { endDate: e.target.value })} />
                    </label>
                  </div>
                  <button type="button" className="text-button danger-text resume-remove-entry" onClick={() => removeEducation(item.id)}>
                    <Trash2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Remove school
                  </button>
                </div>
              ))}
              {!resume.education.length && <p className="empty-state">No education added yet.</p>}
            </div>
          </section>

          {/* Projects */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Projects</h2>
                <p>Optional: showcase personal, academic, or open-source projects.</p>
              </div>
              <button type="button" className="text-button" onClick={addProject}>
                <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> Add project
              </button>
            </div>
            <div className="resume-entry-list">
              {resume.projects.map((item) => (
                <div className="resume-entry-card" key={item.id}>
                  <div className="task-form-grid">
                    <label className="task-field task-field-wide">
                      Project name
                      <input value={item.name} onChange={(e) => updateProject(item.id, { name: e.target.value })} placeholder="e.g. TaskTrackerHQ" />
                    </label>
                    <label className="task-field task-field-wide">
                      Description
                      <input value={item.description} onChange={(e) => updateProject(item.id, { description: e.target.value })} placeholder="Briefly describe the project and your role." />
                    </label>
                    <label className="task-field">
                      Link
                      <input value={item.link} onChange={(e) => updateProject(item.id, { link: e.target.value })} placeholder="yoursite.com/project" />
                    </label>
                  </div>
                  <button type="button" className="text-button danger-text resume-remove-entry" onClick={() => removeProject(item.id)}>
                    <Trash2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> Remove project
                  </button>
                </div>
              ))}
              {!resume.projects.length && <p className="empty-state">No projects added yet.</p>}
            </div>
          </section>
        </div>

        {/* Live Preview / Print Area */}
        <div className="resume-preview-column">
          <section className="panel resume-preview-panel">
            <div className="panel-header">
              <div>
                <h2>
                  <FileText size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                  Live preview
                </h2>
                <p>This is what your exported PDF will look like.</p>
              </div>
            </div>
            <div id="resume-print-area" className="resume-print-area">
              <header className="resume-print-header">
                <h1>{resume.fullName || "Your Name"}</h1>
                {resume.title && <p className="resume-print-headline">{resume.title}</p>}
                <p className="resume-print-contact">
                  {[resume.email, resume.phone, resume.location, resume.linkedin, resume.website].filter(Boolean).join(" · ")}
                </p>
              </header>

              {resume.summary && (
                <section className="resume-print-section">
                  <h3>Summary</h3>
                  <p>{resume.summary}</p>
                </section>
              )}

              {resume.experience.length > 0 && (
                <section className="resume-print-section">
                  <h3>Experience</h3>
                  {resume.experience.map((item) => (
                    <div className="resume-print-entry" key={item.id}>
                      <div className="resume-print-entry-heading">
                        <strong>{item.role || "Role"}{item.company ? " — " + item.company : ""}</strong>
                        <span>
                          {monthLabel(item.startDate)} – {item.current ? "Present" : monthLabel(item.endDate)}
                        </span>
                      </div>
                      {item.location && <p className="resume-print-entry-location">{item.location}</p>}
                      {item.bullets.filter(Boolean).length > 0 && (
                        <ul>
                          {item.bullets.filter(Boolean).map((bullet, index) => (
                            <li key={index}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {resume.education.length > 0 && (
                <section className="resume-print-section">
                  <h3>Education</h3>
                  {resume.education.map((item) => (
                    <div className="resume-print-entry" key={item.id}>
                      <div className="resume-print-entry-heading">
                        <strong>{item.school || "School"}</strong>
                        <span>
                          {monthLabel(item.startDate)} – {monthLabel(item.endDate)}
                        </span>
                      </div>
                      {(item.degree || item.field) && (
                        <p className="resume-print-entry-location">
                          {[item.degree, item.field].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {resume.skills.length > 0 && (
                <section className="resume-print-section">
                  <h3>Skills</h3>
                  <p>{resume.skills.join(" · ")}</p>
                </section>
              )}

              {resume.projects.length > 0 && (
                <section className="resume-print-section">
                  <h3>Projects</h3>
                  {resume.projects.map((item) => (
                    <div className="resume-print-entry" key={item.id}>
                      <div className="resume-print-entry-heading">
                        <strong>{item.name || "Project"}</strong>
                        {item.link && <span>{item.link}</span>}
                      </div>
                      {item.description && <p className="resume-print-entry-location">{item.description}</p>}
                    </div>
                  ))}
                </section>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
