"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { AppShell } from "../components/app-shell";
import ThemeCustomizer from "../../components/ThemeCustomizer";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const connectedProvider = session?.user?.provider;
  const connect = (provider: "google" | "azure-ad") => signIn(provider, { callbackUrl: "/settings" });
  const disconnect = () => {
    localStorage.removeItem("tasktracker-events");
    return signOut({ callbackUrl: "/settings" });
  };

  return <AppShell active="Settings" eyebrow="Manage" title="Settings" description="Manage your account, preferences, and integrations.">
    <div className="settings-grid">
      <section className="panel">
        <div className="settings-heading"><div><h2>Account</h2><p>Manage your TaskTrackerHQ account.</p></div></div>
        <div className="account-summary"><span className="account-avatar">{session?.user?.name?.slice(0, 1).toUpperCase() || "?"}</span><div><strong>{status === "loading" ? "Checking session..." : session?.user?.name || "Guest user"}</strong><small>{session?.user?.email || "Not signed in"}</small></div></div>
        <p className="panel-subtitle">{session ? `Connected through ${connectedProvider === "azure-ad" ? "Microsoft" : "Google"}.` : "Development mode remains available without OAuth."}</p>
        {session ? <button className="primary-button" onClick={() => void signOut({ callbackUrl: "/" })}>Sign out</button> : <div className="button-row"><button className="primary-button" onClick={() => void connect("google")}>Sign in with Google</button><button className="filter-button" onClick={() => void connect("azure-ad")}>Microsoft</button></div>}
      </section>
      <section className="panel">
        <div className="settings-heading"><div><h2>Calendar integrations</h2><p>Connect a provider to sync calendar events into your workspace.</p></div></div>
        <div className="integration-row"><div><strong>Google Calendar</strong><small>{connectedProvider === "google" ? "Connected and ready to sync" : "Google account and calendar access"}</small></div>{connectedProvider === "google" ? <button className="filter-button integration-connected" onClick={() => void disconnect()}>Disconnect</button> : <button className="filter-button" onClick={() => void connect("google")}>Connect</button>}</div>
        <div className="integration-row"><div><strong>Outlook Calendar</strong><small>{connectedProvider === "azure-ad" ? "Connected and ready to sync" : "Microsoft account and calendar access"}</small></div>{connectedProvider === "azure-ad" ? <button className="filter-button integration-connected" onClick={() => void disconnect()}>Disconnect</button> : <button className="filter-button" onClick={() => void connect("azure-ad")}>Connect</button>}</div>
        {session && <p className="integration-note">Disconnecting removes your provider session and locally cached calendar events.</p>}
      </section>
      <ThemeCustomizer />
    </div>
  </AppShell>;
}
