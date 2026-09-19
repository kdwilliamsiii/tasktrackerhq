"use client";
import NotificationSettings from "../../components/NotificationSettings";
import { SignInButtons } from "../../components/SignInButtons";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { AppShell } from "../components/app-shell";
import ThemeCustomizer from "../../components/ThemeCustomizer";
import AiUsageWidget from "../../components/AiUsageWidget";
import Link from "next/link";
import { Shield, FileText, Cpu, ShieldAlert } from "lucide-react";
import { clearLocalUserData } from "../../lib/sync";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const connectedProvider = session?.user?.provider;
  const userEmail = (session?.user?.email || "").toLowerCase();
  const isAdminUser = session?.user?.role === "admin" || userEmail === "kdwilliamsiii@gmail.com" || userEmail === "kdwilliamsiii@tasktrackerhq.app";

  const connect = (provider: "google" | "azure-ad") => signIn(provider, { callbackUrl: "/settings" });
  const disconnect = () => {
    clearLocalUserData();
    return signOut({ callbackUrl: "/settings" });
  };
  const doSignOut = () => {
    clearLocalUserData();
    return signOut({ callbackUrl: "/" });
  };

  return <AppShell active="Settings" eyebrow="Manage" title="Settings" description="Manage your account, preferences, and integrations.">
    <div className="settings-grid">
      {isAdminUser && (
        <section className="panel" style={{ gridColumn: "1 / -1", border: "1px solid rgba(224, 86, 36, 0.4)", background: "rgba(224, 86, 36, 0.05)" }}>
          <div className="settings-heading">
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={20} style={{ color: "var(--orange)" }} /> Administrator Portal
              </h2>
              <p>You are authenticated as an administrator ({userEmail}). Access internal management consoles below.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <Link
              href="/admin/ai-usage"
              className="primary-button"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "8px 16px" }}
            >
              <Cpu size={16} /> AI Intelligence &amp; Usage Dashboard
            </Link>
            <Link
              href="/admin/feedback"
              className="filter-button"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "8px 16px" }}
            >
              Feedback Moderation
            </Link>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="settings-heading"><div><h2>Account</h2><p>Manage your TaskTrackerHQ account.</p></div></div>
        <div className="account-summary">{session?.user?.image ? <Image className="account-avatar account-avatar-image" src={session.user.image} alt="" width={38} height={38} /> : <span className="account-avatar">{session?.user?.name?.slice(0, 1).toUpperCase() || "?"}</span>}<div><strong>{status === "loading" ? "Checking session..." : session?.user?.name || "Guest user"}</strong><small>{session?.user?.email || "Not signed in"}</small></div>{session && <span className={"role-badge role-" + (isAdminUser ? "admin" : session.user.role)}>{isAdminUser ? "admin" : session.user.role}</span>}</div>
        {session && <dl className="account-details"><div><dt>User ID</dt><dd>{session.user.id || "Unavailable"}</dd></div><div><dt>Provider</dt><dd>{connectedProvider === "azure-ad" ? "Microsoft" : "Google"}</dd></div><div><dt>Account created</dt><dd>{session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : "Available after next sign-in"}</dd></div></dl>}
        <p className="panel-subtitle">{session ? ("Connected through " + (connectedProvider === "azure-ad" ? "Microsoft" : "Google") + ".") : "Development mode remains available without OAuth."}</p>
        {session ? <button className="primary-button" onClick={() => void doSignOut()}>Sign out</button> : <SignInButtons callbackUrl="/settings" />}
      </section>
      <section className="panel">
        <div className="settings-heading"><div><h2>Calendar integrations</h2><p>Connect a provider to sync calendar events into your workspace.</p></div></div>
        <div className="integration-row"><div><strong>Google Calendar</strong><small>{connectedProvider === "google" ? "Connected and ready to sync" : "Google account and calendar access"}</small></div>{connectedProvider === "google" ? <button className="filter-button integration-connected" onClick={() => void disconnect()}>Disconnect</button> : <button className="filter-button" onClick={() => void connect("google")}>Connect</button>}</div>
        <div className="integration-row"><div><strong>Outlook Calendar</strong><small>{connectedProvider === "azure-ad" ? "Connected and ready to sync" : "Microsoft account and calendar access"}</small></div>{connectedProvider === "azure-ad" ? <button className="filter-button integration-connected" onClick={() => void disconnect()}>Disconnect</button> : <button className="filter-button" onClick={() => void connect("azure-ad")}>Connect</button>}</div>
        {session && <p className="integration-note">Disconnecting removes your provider session and locally cached calendar events.</p>}
      </section>

      <section className="panel extension-panel">
        <div className="settings-heading">
          <div>
            <h2>Browser extension (Chrome &amp; Edge)</h2>
            <p>Capture tasks from any webpage, right-click text to save, and chat with TT Bot.</p>
          </div>
        </div>
        <div className="extension-download-card">
          <div className="extension-download-info">
            <strong>TaskTrackerHQ Extension v1.0</strong>
            <small>Manifest V3 • Works with Chrome, Edge, Brave, and Opera</small>
          </div>
          <a className="primary-button extension-download-btn" href="/tasktrackerhq-extension.zip" download>
            <span>↓</span> Download Extension (.zip)
          </a>
        </div>
        <div className="extension-instructions">
          <strong>Installation Steps:</strong>
          <ol>
            <li>Download and unzip <code>tasktrackerhq-extension.zip</code>.</li>
            <li>Open Chrome or Edge and go to <code>chrome://extensions</code> (or <code>edge://extensions</code>).</li>
            <li>Enable <strong>Developer mode</strong> (toggle in top right).</li>
            <li>Click <strong>Load unpacked</strong> and select the unzipped <code>extension</code> folder.</li>
          </ol>
        </div>
      </section>

      <section className="panel mobile-app-panel">
        <div className="settings-heading">
          <div>
            <h2>Mobile App (iOS &amp; Android)</h2>
            <p>Install TaskTrackerHQ directly to your iPhone or Android home screen for full-screen access.</p>
          </div>
        </div>
        <div className="extension-instructions">
          <strong>How to install on Mobile:</strong>
          <ol>
            <li>Open <strong>www.tasktrackerhq.app</strong> in Safari (iPhone) or Chrome (Android).</li>
            <li>On iPhone (Safari): Tap <strong>Share</strong> (bottom) → <strong>Add to Home Screen</strong>.</li>
            <li>On Android (Chrome): Tap <strong>⋮ Menu</strong> (top right) → <strong>Install app</strong>.</li>
          </ol>
        </div>
      </section>
      <AiUsageWidget />
      <NotificationSettings />
      <ThemeCustomizer />

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="settings-heading">
          <div>
            <h2>Legal &amp; Compliance</h2>
            <p>Review TaskTrackerHQ terms of service, AI usage policies, and privacy disclosures.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
          <Link
            href="/terms"
            className="filter-button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", padding: "8px 14px", fontSize: 12 }}
          >
            <FileText size={14} /> Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="filter-button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", padding: "8px 14px", fontSize: 12 }}
          >
            <Shield size={14} /> Privacy Policy
          </Link>
        </div>
      </section>
    </div>
  </AppShell>;
}
