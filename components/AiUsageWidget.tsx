"use client";

import { useEffect, useState } from "react";
import { Sparkles, Cpu, Zap, RefreshCw, ShieldCheck, ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNotifications } from "./NotificationProvider";

type MonthlyStats = {
  monthLabel: string;
  fastCount: number;
  advancedCount: number;
  nanoCount: number;
  limitFast: number;
  limitAdvanced: number;
};

type TierConfig = {
  name: string;
  monthlyPriceUsd: number;
  monthlyLimitFast: number;
  monthlyLimitAdvanced: number;
  allowGeminiNano: boolean;
};

type UserAiLog = {
  id: string;
  feature: string;
  model: string;
  createdAt: string;
};

export default function AiUsageWidget() {
  const [logs, setLogs] = useState<UserAiLog[]>([]);
  const [currentTier, setCurrentTier] = useState<"free" | "pro" | "enterprise">("free");
  const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTier, setUpdatingTier] = useState(false);
  const { notify } = useNotifications();

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/track");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.recentLogs || []);
        if (data.tier) setCurrentTier(data.tier);
        if (data.tierConfig) setTierConfig(data.tierConfig);
        if (data.monthlyStats) setMonthlyStats(data.monthlyStats);
      }
    } catch (err) {
      console.error("Failed to load user AI usage", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const switchTier = async (newTier: "free" | "pro" | "enterprise") => {
    setUpdatingTier(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });
      if (res.ok) {
        setCurrentTier(newTier);
        notify(`Subscription plan switched to ${newTier.toUpperCase()}`, "success");
        await fetchUsage();
      } else {
        notify("Could not update subscription plan.", "error");
      }
    } catch {
      notify("Network error while updating plan.", "error");
    } finally {
      setUpdatingTier(false);
    }
  };

  const limitFast = monthlyStats?.limitFast || tierConfig?.monthlyLimitFast || 100;
  const limitAdv = monthlyStats?.limitAdvanced ?? tierConfig?.monthlyLimitAdvanced ?? 0;
  const fastCount = monthlyStats?.fastCount || 0;
  const advCount = monthlyStats?.advancedCount || 0;
  const nanoCount = monthlyStats?.nanoCount || 0;

  const fastUsagePct = Math.min(100, Math.round((fastCount / (limitFast || 1)) * 100));
  const advUsagePct = limitAdv > 0 ? Math.min(100, Math.round((advCount / limitAdv) * 100)) : 0;

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      {/* Header */}
      <div className="settings-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="var(--teal)" />
            AI Workspace &amp; Quotas
          </h2>
          <p>Monitor your monthly AI actions, available limits, and on-device speed boosts.</p>
        </div>
        <button
          className="text-button"
          onClick={fetchUsage}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Upgrade Callout if near limits or on free tier */}
      {currentTier === "free" && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: "var(--radius)",
            background: "color-mix(in srgb, var(--teal) 10%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--teal) 30%, var(--line))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <strong style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--navy)", fontSize: 13 }}>
              <ArrowUpRight size={16} color="var(--teal)" />
              Unlock Advanced Reasoning (GPT-4.1) &amp; 2,000 Monthly Actions
            </strong>
            <small style={{ color: "var(--muted)", fontSize: 11 }}>
              Pro tier gives you full day-planning roadmaps, project phase breakdowns, and TT Bot deep analysis.
            </small>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => switchTier("pro")}
            disabled={updatingTier}
            style={{ padding: "7px 14px", fontSize: 11 }}
          >
            Upgrade to Pro ($12/mo)
          </button>
        </div>
      )}

      {/* Tier Selector & Status */}
      <div style={{ marginTop: 16, padding: "16px", background: "var(--background)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 13, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={16} color="var(--teal)" />
              Your Plan: <span style={{ textTransform: "uppercase", color: "var(--teal)" }}>{currentTier}</span>
            </strong>
            <small style={{ color: "var(--muted)", fontSize: 11 }}>
              Quota resets at the start of every calendar month ({monthlyStats?.monthLabel || "This Month"}).
            </small>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["free", "pro", "enterprise"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTier(t)}
                disabled={updatingTier || currentTier === t}
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: "var(--radius)",
                  border: currentTier === t ? "1px solid var(--teal)" : "1px solid var(--line)",
                  background: currentTier === t ? "var(--sidebarActive)" : "var(--surface)",
                  color: currentTier === t ? "var(--teal)" : "var(--foreground)",
                  cursor: currentTier === t ? "default" : "pointer",
                }}
              >
                {t.toUpperCase()} {t === "free" ? "($0)" : t === "pro" ? "($12/mo)" : "($49/mo)"}
              </button>
            ))}
          </div>
        </div>

        {/* Quota Progress Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {/* Fast Cloud Assistant Quota */}
          <div style={{ padding: 12, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>Fast Actions (Cloud)</span>
              <strong>{fastCount} / {limitFast}</strong>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden", margin: "6px 0" }}>
              <div style={{ height: "100%", width: `${fastUsagePct}%`, background: fastUsagePct >= 90 ? "var(--orange)" : "var(--teal)", transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
              <span>{Math.max(0, limitFast - fastCount)} actions remaining</span>
              <span>{fastUsagePct}% used</span>
            </div>
          </div>

          {/* Advanced Reasoning Quota */}
          <div style={{ padding: 12, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>Advanced Reasoning</span>
              <strong>{limitAdv === 0 ? "Requires Pro" : `${advCount} / ${limitAdv}`}</strong>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden", margin: "6px 0" }}>
              <div style={{ height: "100%", width: `${limitAdv === 0 ? 0 : advUsagePct}%`, background: "var(--orange)", transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
              <span>{limitAdv === 0 ? "GPT-4.1 Reasoning & Day Planner" : `${Math.max(0, limitAdv - advCount)} actions remaining`}</span>
              <span>{limitAdv === 0 ? "Locked" : `${advUsagePct}% used`}</span>
            </div>
          </div>

          {/* Gemini Nano On-Device Boost */}
          <div style={{ padding: 12, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Cpu size={13} color="var(--teal)" /> On-Device (Gemini Nano)
              </span>
              <strong style={{ color: "var(--teal)" }}>{nanoCount} actions</strong>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden", margin: "6px 0" }}>
              <div style={{ height: "100%", width: "100%", background: "var(--teal)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
              <span>Private &amp; Offline execution</span>
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>Unlimited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Availability Matrix */}
      <div style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 12, color: "var(--navy)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Feature Access &amp; Quota Matrix
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--surface)", fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>
              <CheckCircle2 size={14} color="var(--teal)" /> Quick Task Polish &amp; Rewrite
            </div>
            <span style={{ color: "var(--muted)" }}>Fast Mode &amp; On-device Gemini Nano</span>
          </div>

          <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--surface)", fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>
              <CheckCircle2 size={14} color="var(--teal)" /> Browser Extension Quick-Add
            </div>
            <span style={{ color: "var(--muted)" }}>Instant AI title enhancement from any tab</span>
          </div>

          <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--surface)", fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: currentTier === "free" ? "var(--muted)" : "var(--navy)", marginBottom: 4 }}>
              {currentTier === "free" ? <AlertCircle size={14} color="var(--orange)" /> : <CheckCircle2 size={14} color="var(--teal)" />}
              TT Bot Full Day Planning
            </div>
            <span style={{ color: "var(--muted)" }}>{currentTier === "free" ? "Requires Pro or Enterprise" : "Full access (GPT-4.1)"}</span>
          </div>

          <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--surface)", fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: currentTier === "free" ? "var(--muted)" : "var(--navy)", marginBottom: 4 }}>
              {currentTier === "free" ? <AlertCircle size={14} color="var(--orange)" /> : <CheckCircle2 size={14} color="var(--teal)" />}
              Coursework &amp; GPA Projections
            </div>
            <span style={{ color: "var(--muted)" }}>{currentTier === "free" ? "Requires Pro or Enterprise" : "Full access (GPT-4.1)"}</span>
          </div>
        </div>
      </div>

      {/* User's Recent Action History (Tokens & internal costs stripped) */}
      {logs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 12, color: "var(--navy)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Your Recent AI History
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 6px" }}>Time</th>
                  <th style={{ padding: "8px 6px" }}>Action / Feature</th>
                  <th style={{ padding: "8px 6px" }}>Engine</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--sidebarActive)",
                          color: "var(--sidebarText)",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {log.feature}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", color: "var(--foreground)" }}>
                      {log.model.includes("nano") ? "Gemini Nano (On-Device)" : log.model}
                    </td>
                    <td style={{ padding: "8px 6px", color: "var(--teal)", fontWeight: 600 }}>
                      ✓ Completed
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
