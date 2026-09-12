"use client";
import { SignInButtons } from "../../components/SignInButtons";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { AppShell } from "../components/app-shell";
import ThemeCustomizer from "../../components/ThemeCustomizer";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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
      <section className="panel"><div className="settings-heading"><div><h2>Connected accounts</h2><p>Accounts available for calendar access.</p></div></div><div className="connected-account"><span className="connected-account-mark">{providerName === "Google" ? "G" : "M"}</span><div><strong>{providerName}</strong><small>{providerName} account connected</small></div><span className="connected-status">Connected</span></div><div className="button-row profile-account-actions"><button className="filter-button" onClick={() => void signIn(providerName === "Google" ? "google" : "azure-ad", { callbackUrl: "/profile" })}>Reconnect</button><button className="filter-button integration-connected" onClick={() => void signOut({ callbackUrl: "/" })}>Disconnect</button></div></section>
      <ThemeCustomizer />
      <section className="panel danger-zone"><h2>Delete account</h2><p className="panel-subtitle">Permanently remove your stored TaskTrackerHQ profile. This action cannot be undone.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="danger-button" onClick={() => void deleteAccount()} disabled={deleting}>{deleting ? "Deleting..." : "Delete my account"}</button></section>
    </div>
  </AppShell>;
}
