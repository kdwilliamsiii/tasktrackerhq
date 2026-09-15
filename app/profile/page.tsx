"use client";
import { SignInButtons } from "../../components/SignInButtons";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Flame, Zap, Award } from "lucide-react";
import { AppShell } from "../components/app-shell";
import ThemeCustomizer from "../../components/ThemeCustomizer";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [rewards, setRewards] = useState<{ xp: number; level: number; tier: string; currentStreak: number; bestStreak: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    fetch("/api/rewards", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.rewards) {
          setRewards({
            xp: data.rewards.xp || 0,
            level: data.rewards.level || 1,
            tier: data.rewards.tier || "Beginner",
            currentStreak: data.rewards.currentStreak || 0,
            bestStreak: data.rewards.bestStreak || 0,
          });
        }
      })
      .catch(() => {});
  }, [session]);

  async function deleteAccount() {
    if (!window.confirm("Delete your TaskTrackerHQ account? This cannot be undone.")) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/profile", { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete account");
      localStorage.removeItem("tasktracker-events");
      localStorage.removeItem("tasktracker-focus-stats");
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Your account could not be deleted. Please try again.");
      setDeleting(false);
    }
  }

  if (status === "loading") return <main className="profile-page"><p>Loading profile...</p></main>;
  if (!session) return <AppShell active="Profile" eyebrow="Account" title="User Profile" description="Manage your identity and account settings."><section className="panel profile-guest"><h2>Sign in to view your profile</h2><p className="panel-subtitle">Connect Google or Microsoft to manage your profile and calendar integrations.</p><SignInButtons callbackUrl="/profile" /></section></AppShell>;

  const providerName = session.user.provider === "azure-ad" ? "Microsoft" : "Google";
  return <AppShell active="Profile" eyebrow="Account" title="User Profile" description="Manage your identity, connected accounts, and preferences.">
    <div className="profile-page">
      <section className="panel profile-identity">
        <div className="profile-identity-heading">{session.user.image ? <Image className="profile-image" src={session.user.image} alt="" width={58} height={58} /> : <span className="profile-image profile-image-fallback">{session.user.name?.slice(0, 1).toUpperCase() || "?"}</span>}<div><h2>{session.user.name || "TaskTrackerHQ user"}</h2><p>{session.user.email || "No email available"}</p></div><span className={`role-badge role-${session.user.role}`}>{session.user.role}</span></div>
        <dl className="profile-details"><div><dt>User ID</dt><dd>{session.user.id || "Unavailable"}</dd></div><div><dt>Account created</dt><dd>{session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : "Available after next sign-in"}</dd></div><div><dt>Authentication provider</dt><dd>{providerName}</dd></div></dl>
      </section>

      {/* HQ Rewards Profile Widget */}
      <section className="panel" style={{ background: "color-mix(in srgb, var(--teal) 4%, var(--surface))" }}>
        <div className="settings-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} color="var(--teal)" /> HQ Rewards Standing
            </h2>
            <p>Your current level, XP ranking, active streak, and badge progress.</p>
          </div>
          <Link href="/rewards" className="filter-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Award size={14} /> Open Rewards Hub
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 14 }}>
          <div style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
            <small style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Level</small>
            <strong style={{ display: "block", fontSize: 20, color: "var(--navy)", marginTop: 4 }}>Level {rewards?.level || 1}</strong>
            <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600 }}>{rewards?.tier || "Beginner"}</span>
          </div>
          <div style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
            <small style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Total XP</small>
            <strong style={{ display: "block", fontSize: 20, color: "var(--foreground)", marginTop: 4 }}>{rewards?.xp || 0} XP</strong>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Keep leveling up</span>
          </div>
          <div style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
            <small style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Streak</small>
            <strong style={{ display: "block", fontSize: 20, color: "var(--orange)", marginTop: 4 }}>{rewards?.currentStreak || 0} Days</strong>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Best: {rewards?.bestStreak || 0}d</span>
          </div>
        </div>
      </section>
      <section className="panel"><div className="settings-heading"><div><h2>Connected accounts</h2><p>Accounts available for calendar access.</p></div></div><div className="connected-account"><span className="connected-account-mark">{providerName === "Google" ? "G" : "M"}</span><div><strong>{providerName}</strong><small>{providerName} account connected</small></div><span className="connected-status">Connected</span></div><div className="button-row profile-account-actions"><button className="filter-button" onClick={() => void signIn(providerName === "Google" ? "google" : "azure-ad", { callbackUrl: "/profile" })}>Reconnect</button><button className="filter-button integration-connected" onClick={() => void signOut({ callbackUrl: "/" })}>Disconnect</button></div></section>
      <ThemeCustomizer />
      <section className="panel danger-zone"><h2>Delete account</h2><p className="panel-subtitle">Permanently remove your stored TaskTrackerHQ profile. This action cannot be undone.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="danger-button" onClick={() => void deleteAccount()} disabled={deleting}>{deleting ? "Deleting..." : "Delete my account"}</button></section>
    </div>
  </AppShell>;
}
