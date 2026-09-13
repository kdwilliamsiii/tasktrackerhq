"use client";

import { useEffect, useState, useMemo } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "../../components/app-shell";
import { useNotifications } from "../../../components/NotificationProvider";
import {
  ShieldAlert,
  Cpu,
  Zap,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Users,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Search,
  Ban,
  CheckCircle2,
  Trash2,
  Key,
} from "lucide-react";

type GlobalToggles = {
  ttBotEnabled: boolean;
  fastModeEnabled: boolean;
  advancedModeEnabled: boolean;
  calendarAnalysisEnabled: boolean;
  projectBreakdownEnabled: boolean;
};

type UserUsageRow = {
  userId: string;
  name: string;
  email: string;
  tier: "free" | "pro" | "enterprise";
  banned: boolean;
  totalRequests: number;
  fastCount: number;
  advancedCount: number;
  nanoCount: number;
  tokensIn: number;
  tokensOut: number;
  totalCostUsd: number;
  lastActive: string;
  abuseFlag: boolean;
  abuseReason?: string;
};

type AdminAnalytics = {
  monthLabel: string;
  totalAllTimeCostUsd: number;
  totalAllTimeRequests: number;
  totalAllTimeTokensIn: number;
  totalAllTimeTokensOut: number;
  monthly: {
    requests: number;
    costUsd: number;
    fastCount: number;
    advancedCount: number;
    nanoCount: number;
  };
  costByModel: Record<string, { count: number; costUsd: number; tokensIn: number; tokensOut: number }>;
  costByFeature: Record<string, { count: number; costUsd: number }>;
  volumeByDay: Record<string, number>;
  userTable: UserUsageRow[];
  recentLogs: Array<{
    id: string;
    userId: string;
    model: string;
    feature: string;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    createdAt: string;
  }>;
};

export default function AdminAiUsageDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [toggles, setToggles] = useState<GlobalToggles | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterAbuseOnly, setFilterAbuseOnly] = useState(false);
  const { notify } = useNotifications();
  const userEmail = (session?.user?.email || "").toLowerCase();
  const isUserAdmin = session?.user?.role === "admin" || userEmail === "kdwilliamsiii@gmail.com" || userEmail === "kdwilliamsiii@tasktrackerhq.app";

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-usage");
      if (!res.ok) throw new Error("Failed to load admin analytics");
      const data = await res.json();
      setAnalytics(data.analytics);
      setToggles(data.toggles);
    } catch (err) {
      console.error(err);
      notify("Failed to fetch admin AI usage data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUserAdmin) {
      fetchData();
    }
  }, [session, isUserAdmin]);

  if (sessionStatus === "loading") {
    return (
      <AppShell active="Settings" eyebrow="Administration" title="AI Usage & Controls" description="Loading metrics...">
        <p>Verifying admin permissions...</p>
      </AppShell>
    );
  }

  if (!session || !isUserAdmin) {
    redirect("/");
  }

  const handleToggleFeature = async (key: keyof GlobalToggles) => {
    if (!toggles) return;
    const newToggles = { ...toggles, [key]: !toggles[key] };
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/ai-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-toggles", toggles: newToggles }),
      });
      if (res.ok) {
        setToggles(newToggles);
        notify(`Updated feature toggle: ${key}`, "success");
      }
    } catch {
      notify("Failed to update feature toggle.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUserBan = async (userId: string, currentBan: boolean) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/ai-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-user-ban", userId, banned: !currentBan }),
      });
      if (res.ok) {
        notify(`User ${!currentBan ? "banned" : "unbanned"} successfully.`, !currentBan ? "warning" : "success");
        await fetchData();
      }
    } catch {
      notify("Error toggling user ban status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetUsage = async (userId: string) => {
    if (!confirm(`Are you sure you want to reset all recorded AI usage for user ${userId}?`)) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/ai-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-user-usage", userId }),
      });
      if (res.ok) {
        notify(`AI usage reset for ${userId}.`, "info");
        await fetchData();
      }
    } catch {
      notify("Error resetting user usage.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateTier = async (userId: string, tier: "free" | "pro" | "enterprise") => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/ai-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-user-tier-limits", userId, tier }),
      });
      if (res.ok) {
        notify(`Updated user ${userId} to ${tier.toUpperCase()}`, "success");
        await fetchData();
      }
    } catch {
      notify("Error updating user tier.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!analytics?.userTable) return [];
    return analytics.userTable.filter((u) => {
      if (filterAbuseOnly && !u.abuseFlag) return false;
      if (filterTier !== "all" && u.tier !== filterTier) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.userId.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [analytics?.userTable, searchQuery, filterTier, filterAbuseOnly]);

  const fastTotal = analytics?.monthly.fastCount || 0;
  const advTotal = analytics?.monthly.advancedCount || 0;
  const nanoTotal = analytics?.monthly.nanoCount || 0;
  const totalVolume = fastTotal + advTotal + nanoTotal || 1;

  const fastRatio = Math.round((fastTotal / totalVolume) * 100);
  const advRatio = Math.round((advTotal / totalVolume) * 100);
  const nanoRatio = Math.round((nanoTotal / totalVolume) * 100);

  return (
    <AppShell
      active="Settings"
      eyebrow="Administration"
      title="Global AI Usage & Cost Intelligence"
      description="Admin dashboard for full AI telemetry, model cost tracking, tier enforcement, and manual overrides."
    >
      {/* Top Controls & Refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>
            Current Window: <span style={{ color: "var(--teal)" }}>{analytics?.monthLabel}</span>
          </span>
        </div>
        <button
          className="text-button"
          onClick={fetchData}
          disabled={loading || updating}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Metrics
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="stat-card" style={{ height: "auto", padding: 18 }}>
          <span className="stat-label">Total Monthly OpenAI Cost</span>
          <strong style={{ fontSize: 26, color: "var(--orange)" }}>
            ${(analytics?.monthly.costUsd ?? 0).toFixed(4)}
          </strong>
          <span className="stat-change" style={{ color: "var(--muted)" }}>
            All-time: ${(analytics?.totalAllTimeCostUsd ?? 0).toFixed(4)} USD
          </span>
        </div>

        <div className="stat-card" style={{ height: "auto", padding: 18 }}>
          <span className="stat-label">Monthly AI Invocations</span>
          <strong style={{ fontSize: 26, color: "var(--navy)" }}>
            {analytics?.monthly.requests ?? 0}
          </strong>
          <span className="stat-change" style={{ color: "var(--muted)" }}>
            All-time: {analytics?.totalAllTimeRequests ?? 0} requests
          </span>
        </div>

        <div className="stat-card" style={{ height: "auto", padding: 18 }}>
          <span className="stat-label">Cloud Tokens Consumed</span>
          <strong style={{ fontSize: 26, color: "var(--foreground)" }}>
            {((analytics?.totalAllTimeTokensIn ?? 0) + (analytics?.totalAllTimeTokensOut ?? 0)).toLocaleString()}
          </strong>
          <span className="stat-change" style={{ color: "var(--muted)" }}>
            {analytics?.totalAllTimeTokensIn.toLocaleString()} in / {analytics?.totalAllTimeTokensOut.toLocaleString()} out
          </span>
        </div>

        <div className="stat-card" style={{ height: "auto", padding: 18 }}>
          <span className="stat-label">Active Monitored Users</span>
          <strong style={{ fontSize: 26, color: "var(--teal)" }}>
            {analytics?.userTable.length ?? 0}
          </strong>
          <span className="stat-change" style={{ color: "var(--muted)" }}>
            {analytics?.userTable.filter((u) => u.abuseFlag).length ?? 0} abuse flags detected
          </span>
        </div>
      </div>

      {/* Fast vs Advanced Visual Ratio Chart */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h2>Request Distribution (Fast vs. Advanced vs. On-Device)</h2>
            <p>Visual workload breakdown across low-latency and deep-reasoning execution models.</p>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ height: 18, width: "100%", display: "flex", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--line)" }}>
            <div style={{ width: `${fastRatio}%`, background: "var(--teal)", transition: "width 0.3s" }} title={`Fast: ${fastTotal} (${fastRatio}%)`} />
            <div style={{ width: `${advRatio}%`, background: "var(--orange)", transition: "width 0.3s" }} title={`Advanced: ${advTotal} (${advRatio}%)`} />
            <div style={{ width: `${nanoRatio}%`, background: "#3b82f6", transition: "width 0.3s" }} title={`Gemini Nano: ${nanoTotal} (${nanoRatio}%)`} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, flexWrap: "wrap", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--teal)" }} />
              Fast Cloud ({fastTotal} reqs • {fastRatio}%)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--orange)" }} />
              Advanced GPT-4.1 ({advTotal} reqs • {advRatio}%)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6" }} />
              Gemini Nano On-Device ({nanoTotal} reqs • {nanoRatio}%)
            </span>
          </div>
        </div>
      </section>

      {/* Global Feature Kill-Switches & Toggles */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <h2>Global AI Feature Controls &amp; Kill Switches</h2>
            <p>Admin master toggles to immediately enable or disable AI capabilities system-wide.</p>
          </div>
        </div>

        {toggles && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
            {[
              { key: "ttBotEnabled" as const, label: "TT Bot Copilot", desc: "Interactive conversational assistant" },
              { key: "fastModeEnabled" as const, label: "Fast AI Mode", desc: "Quick task edits & title polish" },
              { key: "advancedModeEnabled" as const, label: "Advanced GPT-4.1", desc: "Day planner & structured reasoning" },
              { key: "calendarAnalysisEnabled" as const, label: "Calendar Schedule Engine", desc: "Event conflict & time mapping" },
              { key: "projectBreakdownEnabled" as const, label: "Project Phase Generator", desc: "Multi-step project breakdown" },
            ].map(({ key, label, desc }) => {
              const active = toggles[key];
              return (
                <div
                  key={key}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    background: "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 12, display: "block", color: "var(--navy)" }}>{label}</strong>
                    <small style={{ color: "var(--muted)", fontSize: 10 }}>{desc}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleFeature(key)}
                    disabled={updating}
                    style={{ background: "transparent", border: 0, cursor: "pointer", color: active ? "var(--teal)" : "var(--muted)" }}
                  >
                    {active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* User-by-User Management & Abuse Signals */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>User-by-User AI Telemetry &amp; Manual Overrides</h2>
            <p>Inspect user quotas, token usage, cost per user, manual limits, and abuse flags.</p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--background)", padding: "4px 8px", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
              <Search size={14} color="var(--muted)" />
              <input
                type="text"
                placeholder="Search user ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 0, background: "transparent", fontSize: 11, outline: "none", width: 140 }}
              />
            </div>

            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--surface)" }}
            >
              <option value="all">All Tiers</option>
              <option value="free">Free Tier</option>
              <option value="pro">Pro Tier</option>
              <option value="enterprise">Enterprise Tier</option>
            </select>

            <button
              type="button"
              onClick={() => setFilterAbuseOnly(!filterAbuseOnly)}
              style={{
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: "var(--radius)",
                border: filterAbuseOnly ? "1px solid var(--orange)" : "1px solid var(--line)",
                background: filterAbuseOnly ? "color-mix(in srgb, var(--orange) 15%, var(--surface))" : "var(--surface)",
                color: filterAbuseOnly ? "var(--orange)" : "var(--foreground)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AlertTriangle size={12} />
              Abuse Flags Only
            </button>
          </div>
        </div>

        {/* User Table */}
        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                <th style={{ padding: "8px 6px" }}>User</th>
                <th style={{ padding: "8px 6px" }}>Plan Tier</th>
                <th style={{ padding: "8px 6px" }}>Fast / Adv / Nano</th>
                <th style={{ padding: "8px 6px" }}>Tokens In / Out</th>
                <th style={{ padding: "8px 6px" }}>Total Cost</th>
                <th style={{ padding: "8px 6px" }}>Abuse Signal</th>
                <th style={{ padding: "8px 6px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, textAlign: "center", color: "var(--muted)" }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.userId} style={{ borderBottom: "1px solid var(--line)", background: u.abuseFlag ? "color-mix(in srgb, var(--orange) 5%, transparent)" : "transparent" }}>
                    <td style={{ padding: "8px 6px" }}>
                      <div style={{ fontWeight: 600, color: "var(--navy)" }}>{u.name}</div>
                      <small style={{ color: "var(--muted)", fontSize: 10 }}>{u.userId.slice(0, 14)} • {u.email}</small>
                    </td>

                    <td style={{ padding: "8px 6px" }}>
                      <select
                        value={u.tier}
                        onChange={(e) => handleUpdateTier(u.userId, e.target.value as "free" | "pro" | "enterprise")}
                        disabled={updating}
                        style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4, border: "1px solid var(--line)", background: "var(--surface)" }}
                      >
                        <option value="free">FREE</option>
                        <option value="pro">PRO</option>
                        <option value="enterprise">ENTERPRISE</option>
                      </select>
                    </td>

                    <td style={{ padding: "8px 6px" }}>
                      <span>{u.fastCount}</span> / <strong style={{ color: "var(--orange)" }}>{u.advancedCount}</strong> / <span style={{ color: "var(--teal)" }}>{u.nanoCount}</span>
                    </td>

                    <td style={{ padding: "8px 6px" }}>
                      {u.tokensIn.toLocaleString()} / {u.tokensOut.toLocaleString()}
                    </td>

                    <td style={{ padding: "8px 6px", fontWeight: 700, color: u.totalCostUsd > 1 ? "var(--orange)" : "var(--foreground)" }}>
                      ${u.totalCostUsd.toFixed(4)}
                    </td>

                    <td style={{ padding: "8px 6px" }}>
                      {u.abuseFlag ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", borderRadius: 4, background: "var(--orange)", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                          <AlertTriangle size={10} /> {u.abuseReason || "Abuse Detected"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--teal)", fontSize: 10 }}>Normal</span>
                      )}
                    </td>

                    <td style={{ padding: "8px 6px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleUserBan(u.userId, u.banned)}
                          title={u.banned ? "Unban User" : "Ban User"}
                          style={{
                            padding: "3px 6px",
                            fontSize: 10,
                            borderRadius: 4,
                            border: "1px solid var(--line)",
                            background: u.banned ? "#ef4444" : "var(--surface)",
                            color: u.banned ? "#fff" : "var(--foreground)",
                            cursor: "pointer",
                          }}
                        >
                          {u.banned ? "Banned" : "Ban"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetUsage(u.userId)}
                          title="Reset Usage Logs"
                          style={{
                            padding: "3px 6px",
                            fontSize: 10,
                            borderRadius: 4,
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            color: "var(--muted)",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raw Admin Audit Log */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Global AI Request Audit Stream (Last 100 Calls)</h2>
            <p>Real-time audit log containing all timestamps, token counts, model engines, and costs.</p>
          </div>
        </div>

        <div style={{ overflowX: "auto", marginTop: 14 }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                <th style={{ padding: "8px 6px" }}>Time</th>
                <th style={{ padding: "8px 6px" }}>User ID</th>
                <th style={{ padding: "8px 6px" }}>Model</th>
                <th style={{ padding: "8px 6px" }}>Feature</th>
                <th style={{ padding: "8px 6px" }}>Prompt Tokens</th>
                <th style={{ padding: "8px 6px" }}>Completion Tokens</th>
                <th style={{ padding: "8px 6px" }}>Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.recentLogs.slice(0, 50).map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{log.userId.slice(0, 12)}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600 }}>{log.model}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{ padding: "2px 6px", borderRadius: 4, background: "var(--sidebarActive)", color: "var(--sidebarText)", fontSize: 10 }}>
                      {log.feature}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px" }}>{log.tokensIn}</td>
                  <td style={{ padding: "8px 6px" }}>{log.tokensOut}</td>
                  <td style={{ padding: "8px 6px", fontWeight: 600, color: log.costUsd > 0 ? "var(--orange)" : "var(--teal)" }}>
                    ${log.costUsd.toFixed(5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
