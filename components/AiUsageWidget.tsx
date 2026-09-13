"use client";

import { useEffect, useState } from "react";
import { Sparkles, Cpu, Zap, RefreshCw, ShieldCheck } from "lucide-react";
import { useNotifications } from "./NotificationProvider";

type AiSummary = {
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byModel: Record<string, { count: number; costUsd: number; tokensIn: number; tokensOut: number }>;
  byFeature: Record<string, { count: number; costUsd: number }>;
};

type MonthlyStats = {
  monthLabel: string;
  totalRequests: number;
  fastCount: number;
  advancedCount: number;
  nanoCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
};

type TierConfig = {
  name: string;
  monthlyPriceUsd: number;
  monthlyLimitFast: number;
  monthlyLimitAdvanced: number;
  monthlyLimitCostUsd: number;
  allowGeminiNano: boolean;
};

type AiLog = {
  id: string;
  userId: string;
  model: string;
  feature: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: string;
};

export default function AiUsageWidget() {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [logs, setLogs] = useState<AiLog[]>([]);
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
        setSummary(data.summary);
        setLogs(data.recentLogs || []);
        if (data.tier) setCurrentTier(data.tier);
        if (data.tierConfig) setTierConfig(data.tierConfig);
        if (data.monthlyStats) setMonthlyStats(data.monthlyStats);
      }
    } catch (err) {
      console.error("Failed to load AI usage stats", err);
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

  const fastUsagePct = tierConfig?.monthlyLimitFast
    ? Math.min(100, Math.round(((monthlyStats?.fastCount || 0) / tierConfig.monthlyLimitFast) * 100))
    : 0;

  const advancedUsagePct = tierConfig?.monthlyLimitAdvanced
    ? Math.min(100, Math.round(((monthlyStats?.advancedCount || 0) / tierConfig.monthlyLimitAdvanced) * 100))
    : 0;

  const costUsagePct = tierConfig?.monthlyLimitCostUsd
    ? Math.min(100, Math.round(((monthlyStats?.totalCostUsd || 0) / tierConfig.monthlyLimitCostUsd) * 100))
    : 0;

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <div className="settings-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="var(--teal)" />
            AI Usage &amp; Cost Intelligence
          </h2>
          <p>Enforce tier limits, monitor token metrics, and review monthly AI costs per user.</p>
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

      {/* Pricing Tier Selector Bar */}
      <div style={{ marginTop: 16, padding: "16px", background: "var(--background)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 13, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={16} color="var(--teal)" />
              Active Subscription Tier: <span style={{ textTransform: "uppercase", color: "var(--teal)" }}>{currentTier}</span>
            </strong>
            <small style={{ color: "var(--muted)", fontSize: 11 }}>
              Limits and AI middleware controls are enforced automatically on every request.
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

        {/* Limit Enforcement Progress Bars */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
          {/* Fast Cloud Calls */}
          <div style={{ padding: 10, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span>Fast AI (o3-mini / Cloud)</span>
              <strong>{monthlyStats?.fastCount || 0} / {tierConfig?.monthlyLimitFast || 100}</strong>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fastUsagePct}%`, background: fastUsagePct > 90 ? "var(--orange)" : "var(--teal)", transition: "width 0.3s" }} />
            </div>
            <small style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, display: "block" }}>{fastUsagePct}% of monthly limit used</small>
          </div>

          {/* Advanced Reasoning Calls */}
          <div style={{ padding: 10, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span>Advanced AI (GPT-4.1)</span>
              <strong>
                {tierConfig?.monthlyLimitAdvanced === 0 ? "Blocked (Free)" : `${monthlyStats?.advancedCount || 0} / ${tierConfig?.monthlyLimitAdvanced || 0}`}
              </strong>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${tierConfig?.monthlyLimitAdvanced === 0 ? 0 : advancedUsagePct}%`, background: "var(--orange)", transition: "width 0.3s" }} />
            </div>
            <small style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, display: "block" }}>
              {tierConfig?.monthlyLimitAdvanced === 0 ? "Upgrade to Pro to unlock GPT-4.1" : `${advancedUsagePct}% of monthly limit used`}
            </small>
          </div>

          {/* Monthly Budget Cap */}
          <div style={{ padding: 10, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span>Monthly AI Cost Budget</span>
              <strong>${(monthlyStats?.totalCostUsd || 0).toFixed(3)} / ${(tierConfig?.monthlyLimitCostUsd || 0.5).toFixed(2)}</strong>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${costUsagePct}%`, background: costUsagePct > 90 ? "#ef4444" : "var(--teal)", transition: "width 0.3s" }} />
            </div>
            <small style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, display: "block" }}>{monthlyStats?.monthLabel || "This Month"}</small>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: "18px 0" }}>
        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Total Monthly Requests</span>
          <strong style={{ fontSize: 22, color: "var(--navy)", display: "block", marginTop: 4 }}>
            {monthlyStats?.totalRequests ?? summary?.totalRequests ?? 0}
          </strong>
        </div>

        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>On-Device (Gemini Nano)</span>
          <strong style={{ fontSize: 22, color: "var(--teal)", display: "block", marginTop: 4 }}>
            {monthlyStats?.nanoCount ?? summary?.byModel["gemini-nano"]?.count ?? 0}
          </strong>
          <small style={{ fontSize: 10, color: "var(--muted)" }}>Unlimited &amp; Free ($0.00)</small>
        </div>

        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Tokens Consumed (In / Out)</span>
          <strong style={{ fontSize: 22, color: "var(--foreground)", display: "block", marginTop: 4 }}>
            {(monthlyStats?.totalTokensIn ?? 0) + (monthlyStats?.totalTokensOut ?? 0)}
          </strong>
          <small style={{ fontSize: 10, color: "var(--muted)" }}>
            {monthlyStats?.totalTokensIn ?? 0} prompt / {monthlyStats?.totalTokensOut ?? 0} completion
          </small>
        </div>

        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Monthly Calculated Cost</span>
          <strong style={{ fontSize: 22, color: "var(--orange)", display: "block", marginTop: 4 }}>
            ${(monthlyStats?.totalCostUsd ?? 0).toFixed(4)}
          </strong>
          <small style={{ fontSize: 10, color: "var(--muted)" }}>USD across cloud models</small>
        </div>
      </div>

      {summary && Object.keys(summary.byModel).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8, color: "var(--navy)" }}>Usage Breakdown by Model</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {Object.entries(summary.byModel).map(([modelName, stats]) => (
              <div
                key={modelName}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  background: "var(--surface)",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {modelName.includes("nano") ? <Cpu size={14} color="var(--teal)" /> : <Zap size={14} color="var(--orange)" />}
                    {modelName}
                  </span>
                  <span>{stats.count} reqs</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
                  <span>{stats.tokensIn + stats.tokensOut} tokens</span>
                  <strong>${stats.costUsd.toFixed(4)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8, color: "var(--navy)" }}>Recent Request Telemetry</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 6px" }}>Time</th>
                  <th style={{ padding: "8px 6px" }}>User</th>
                  <th style={{ padding: "8px 6px" }}>Model</th>
                  <th style={{ padding: "8px 6px" }}>Feature</th>
                  <th style={{ padding: "8px 6px" }}>Tokens (In / Out)</th>
                  <th style={{ padding: "8px 6px" }}>Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{log.userId.slice(0, 12)}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{log.model}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--sidebarActive)",
                          color: "var(--sidebarText)",
                          fontSize: 10,
                        }}
                      >
                        {log.feature}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px" }}>{log.tokensIn} / {log.tokensOut}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600, color: log.costUsd > 0 ? "var(--orange)" : "var(--teal)" }}>
                      ${log.costUsd.toFixed(5)}
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
