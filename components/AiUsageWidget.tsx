"use client";

import { useEffect, useState } from "react";
import { Sparkles, Cpu, Zap, RefreshCw } from "lucide-react";

type AiSummary = {
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byModel: Record<string, { count: number; costUsd: number; tokensIn: number; tokensOut: number }>;
  byFeature: Record<string, { count: number; costUsd: number }>;
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
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/track");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setLogs(data.recentLogs || []);
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

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <div className="settings-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="var(--teal)" />
            AI Usage &amp; Cost Intelligence
          </h2>
          <p>Real-time analytics across On-Device (Gemini Nano) and Cloud (o3-mini, GPT-4.1) models.</p>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: "18px 0" }}>
        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Total Requests</span>
          <strong style={{ fontSize: 22, color: "var(--navy)", display: "block", marginTop: 4 }}>
            {summary?.totalRequests ?? 0}
          </strong>
        </div>

        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>On-Device (Gemini Nano)</span>
          <strong style={{ fontSize: 22, color: "var(--teal)", display: "block", marginTop: 4 }}>
            {summary?.byModel["gemini-nano"]?.count ?? 0}
          </strong>
          <small style={{ fontSize: 10, color: "var(--muted)" }}>$0.00 • 0 Tokens (Free)</small>
        </div>

        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Cloud Tokens (In / Out)</span>
          <strong style={{ fontSize: 22, color: "var(--foreground)", display: "block", marginTop: 4 }}>
            {(summary?.totalTokensIn ?? 0) + (summary?.totalTokensOut ?? 0)}
          </strong>
          <small style={{ fontSize: 10, color: "var(--muted)" }}>
            {summary?.totalTokensIn ?? 0} in / {summary?.totalTokensOut ?? 0} out
          </small>
        </div>

        <div style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--radius)", background: "var(--background)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Estimated Cost (USD)</span>
          <strong style={{ fontSize: 22, color: "var(--orange)", display: "block", marginTop: 4 }}>
            ${(summary?.totalCostUsd ?? 0).toFixed(4)}
          </strong>
        </div>
      </div>

      {summary && Object.keys(summary.byModel).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8, color: "var(--navy)" }}>Usage by Model</h3>
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
          <h3 style={{ fontSize: 13, marginBottom: 8, color: "var(--navy)" }}>Recent Request History</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 6px" }}>Time</th>
                  <th style={{ padding: "8px 6px" }}>User</th>
                  <th style={{ padding: "8px 6px" }}>Model</th>
                  <th style={{ padding: "8px 6px" }}>Feature</th>
                  <th style={{ padding: "8px 6px" }}>Tokens In/Out</th>
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
