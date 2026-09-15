"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { useNotifications } from "../../components/NotificationProvider";
import { subscribeToDataSync } from "../../lib/sync";
import {
  Trophy,
  Flame,
  Zap,
  Timer,
  CheckCircle2,
  Award,
  Sparkles,
  Lock,
} from "lucide-react";
import type { RewardsProfile, Badge } from "../../lib/rewards";

type RewardsApiResponse = {
  rewards: RewardsProfile & {
    tier: string;
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercent: number;
  };
  badges: (Badge & { unlocked: boolean })[];
  isAuthenticated: boolean;
};

export default function RewardsPage() {
  const [data, setData] = useState<RewardsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "tasks" | "focus" | "ai" | "streaks">("all");
  const { notify } = useNotifications();

  const loadRewards = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      notify("Could not load rewards profile.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    // Initial fetch
    void loadRewards();
    const unsubscribe = subscribeToDataSync(() => {
      void loadRewards();
    });
    return () => unsubscribe();
  }, [loadRewards]);

  const rewards = data?.rewards;
  const badges = data?.badges || [];

  const filteredBadges = badges.filter((b) => {
    if (activeTab === "all") return true;
    return b.category === activeTab;
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case "Productivity Master":
        return "var(--orange)";
      case "Advanced":
        return "var(--teal)";
      case "Intermediate":
        return "var(--navy)";
      default:
        return "var(--muted)";
    }
  };

  return (
    <AppShell
      active="HQ Rewards"
      eyebrow="Gamification"
      title="HQ Rewards"
      description="Earn XP, maintain unbroken streaks, level up your productivity tier, and unlock milestone badges."
    >
      <div className="rewards-page" style={{ display: "grid", gap: 20 }}>
        {/* Hero Level & XP Card */}
        <section
          className="panel rewards-hero"
          style={{
            background: "linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--teal) 8%, var(--surface)) 100%)",
            borderColor: "color-mix(in srgb, var(--teal) 35%, var(--line))",
            padding: "24px 28px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--teal), var(--navy))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 8px 20px color-mix(in srgb, var(--teal) 30%, transparent)",
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                {rewards?.level || 1}
              </div>
              <div>
                <span className="dashboard-kicker" style={{ color: getTierColor(rewards?.tier) }}>
                  {rewards?.tier?.toUpperCase() || "BEGINNER"} TIER
                </span>
                <h2 style={{ margin: "4px 0 2px", fontSize: 22, color: "var(--foreground)" }}>
                  Level {rewards?.level || 1} Achiever
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                  {rewards?.xp || 0} Total XP Earned • {unlockedCount} of {badges.length} Badges Unlocked
                </p>
              </div>
            </div>

            {/* Streak Highlight */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                borderRadius: "var(--radius)",
                background: "color-mix(in srgb, var(--orange) 12%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--orange) 30%, var(--line))",
              }}
            >
              <Flame size={24} color="var(--orange)" />
              <div>
                <strong style={{ fontSize: 18, display: "block", color: "var(--foreground)", lineHeight: 1.1 }}>
                  {rewards?.currentStreak || 0} Day{rewards?.currentStreak === 1 ? "" : "s"}
                </strong>
                <small style={{ fontSize: 10, color: "var(--orange)", fontWeight: 700 }}>
                  Active Streak (Best: {rewards?.bestStreak || 0}d)
                </small>
              </div>
            </div>
          </div>

          {/* XP Progress Bar to Next Level */}
          <div style={{ marginTop: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
              <span>Level Progress</span>
              <span>
                {rewards?.currentLevelXp || 0} / {rewards?.nextLevelXp || 100} XP ({rewards?.progressPercent || 0}%)
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "var(--line)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${rewards?.progressPercent || 0}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--teal), var(--orange))",
                  borderRadius: 99,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 5 }}>
              <span>Level {rewards?.level || 1}</span>
              <span>Level {(rewards?.level || 1) + 1}</span>
            </div>
          </div>
        </section>

        {/* Milestone Stats Grid */}
        <section className="rewards-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div className="panel" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--teal)", marginBottom: 6 }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tasks Done</span>
            </div>
            <strong style={{ fontSize: 24, color: "var(--foreground)" }}>{rewards?.tasksCompleted || 0}</strong>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>+15 XP per task</p>
          </div>

          <div className="panel" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", marginBottom: 6 }}>
              <Timer size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Focus Sessions</span>
            </div>
            <strong style={{ fontSize: 24, color: "var(--foreground)" }}>{rewards?.focusSessionsCompleted || 0}</strong>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>+25–55 XP per session ({rewards?.focusMinutes || 0}m total)</p>
          </div>

          <div className="panel" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--orange)", marginBottom: 6 }}>
              <Sparkles size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Optimizations</span>
            </div>
            <strong style={{ fontSize: 24, color: "var(--foreground)" }}>{rewards?.aiActionsUsed || 0}</strong>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>+10 XP per AI polish/reasoning</p>
          </div>

          <div className="panel" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--teal)", marginBottom: 6 }}>
              <Trophy size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Badges Earned</span>
            </div>
            <strong style={{ fontSize: 24, color: "var(--foreground)" }}>
              {unlockedCount} / {badges.length}
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>{Math.round((unlockedCount / (badges.length || 1)) * 100)}% completed</p>
          </div>
        </section>

        {/* Badges Showcase Panel */}
        <section className="panel">
          <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>HQ Milestone Badges</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Accomplish tasks, pomodoros, AI collaborations, and streaks to unlock badges.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs" style={{ display: "flex", gap: 6 }}>
              {(["all", "tasks", "focus", "ai", "streaks"] as const).map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "selected" : ""}
                  onClick={() => setActiveTab(tab)}
                  style={{ textTransform: "capitalize" }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="empty-state">Loading HQ Rewards...</p>
          ) : (
            <div
              className="badges-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 14,
                marginTop: 16,
              }}
            >
              {filteredBadges.map((badge) => {
                return (
                  <div
                    key={badge.id}
                    style={{
                      border: "1px solid",
                      borderColor: badge.unlocked ? "color-mix(in srgb, var(--teal) 45%, var(--line))" : "var(--line)",
                      borderRadius: "var(--radius)",
                      padding: "16px 14px",
                      background: badge.unlocked ? "color-mix(in srgb, var(--teal) 5%, var(--surface))" : "var(--surface)",
                      opacity: badge.unlocked ? 1 : 0.65,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: badge.unlocked ? "color-mix(in srgb, var(--teal) 15%, var(--surface))" : "var(--line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {badge.unlocked ? badge.icon : <Lock size={18} color="var(--muted)" />}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <strong style={{ fontSize: 13, color: "var(--foreground)" }}>{badge.name}</strong>
                        {badge.unlocked ? (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--teal)", background: "color-mix(in srgb, var(--teal) 15%, transparent)", padding: "1px 6px", borderRadius: 4 }}>
                            UNLOCKED
                          </span>
                        ) : (
                          <span style={{ fontSize: 9, fontWeight: 600, color: "var(--muted)" }}>LOCKED</span>
                        )}
                      </div>
                      <p style={{ margin: "4px 0 6px", fontSize: 11, color: "var(--muted)", lineHeight: 1.3 }}>
                        {badge.description}
                      </p>
                      {badge.unlocked && badge.unlockedAt && (
                        <small style={{ fontSize: 9, color: "var(--muted)" }}>
                          Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tier Roadmap & Level Breakdown */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Productivity Tier Roadmap</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Level up by collecting XP from your daily work and consistency.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginTop: 14 }}>
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: 16,
                background: rewards?.tier === "Beginner" ? "color-mix(in srgb, var(--teal) 6%, var(--surface))" : "var(--surface)",
                borderColor: rewards?.tier === "Beginner" ? "var(--teal)" : "var(--line)",
              }}
            >
              <span className="dashboard-kicker">LEVEL 1–10</span>
              <h3 style={{ margin: "4px 0 6px", fontSize: 14 }}>Beginner</h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                Establish core habits, create tasks, and begin regular focus timer routines.
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: 16,
                background: rewards?.tier === "Intermediate" ? "color-mix(in srgb, var(--teal) 6%, var(--surface))" : "var(--surface)",
                borderColor: rewards?.tier === "Intermediate" ? "var(--teal)" : "var(--line)",
              }}
            >
              <span className="dashboard-kicker">LEVEL 11–25</span>
              <h3 style={{ margin: "4px 0 6px", fontSize: 14 }}>Intermediate</h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                Build multi-day streaks, collaborate with Fast AI, and master task completion speed.
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: 16,
                background: rewards?.tier === "Advanced" ? "color-mix(in srgb, var(--teal) 6%, var(--surface))" : "var(--surface)",
                borderColor: rewards?.tier === "Advanced" ? "var(--teal)" : "var(--line)",
              }}
            >
              <span className="dashboard-kicker">LEVEL 26–50</span>
              <h3 style={{ margin: "4px 0 6px", fontSize: 14 }}>Advanced</h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                Consistent flow states, deep project execution with Advanced AI &amp; TT Bot reasoning.
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: 16,
                background: rewards?.tier === "Productivity Master" ? "color-mix(in srgb, var(--orange) 8%, var(--surface))" : "var(--surface)",
                borderColor: rewards?.tier === "Productivity Master" ? "var(--orange)" : "var(--line)",
              }}
            >
              <span className="dashboard-kicker" style={{ color: "var(--orange)" }}>LEVEL 51+</span>
              <h3 style={{ margin: "4px 0 6px", fontSize: 14 }}>Productivity Master</h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                Elite mastery of focus, unbroken long-term streaks, and maximum workflow velocity.
              </p>
            </div>
          </div>
        </section>

        {/* XP Activity Log */}
        {rewards?.history && rewards.history.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2 style={{ margin: 0, fontSize: 16 }}>Recent XP Activity</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {rewards.history.slice(0, 10).map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: "color-mix(in srgb, var(--background) 70%, var(--surface))",
                    border: "1px solid var(--line)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Zap size={14} color="var(--orange)" />
                    <span>{h.action}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <strong style={{ color: "var(--teal)", fontWeight: 700 }}>+{h.xp} XP</strong>
                    <small style={{ color: "var(--muted)", fontSize: 10 }}>
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
