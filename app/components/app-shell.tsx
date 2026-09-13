"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import SearchBar from "../../components/SearchBar";
import { useNotifications } from "../../components/NotificationProvider";

const navigation = [
  { href: "/", label: "Overview", icon: "?" },
  { href: "/tasks", label: "Tasks", icon: "?" },
  { href: "/focus", label: "Focus", icon: "?" },
  { href: "/calendar", label: "Calendar", icon: "?" },
  { href: "/profile", label: "Profile", icon: "?" },
];

export function AppShell({ children, active, eyebrow, title, description, action }: { children: React.ReactNode; active: string; eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const { data: session } = useSession();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const userName = session?.user?.name || "Guest user";
  const userInitials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

  useEffect(() => {
    const updateDate = () => setDateLabel(new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(new Date()));
    updateDate();
    const timer = window.setInterval(updateDate, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="app-frame">
      <div className="mobile-header">
        <button type="button" className="mobile-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
          ?
        </button>
        <Link className="mobile-brand" href="/" onClick={() => setMobileNavOpen(false)}>
          <Image className="brand-logo" src="/tasktracker-logo.jpg" alt="TaskTrackerHQ logo" width={28} height={28} priority />
          <span>TaskTrackerHQ</span>
        </Link>
        <span className="workspace-avatar mobile-avatar">{userInitials}</span>
      </div>

      {mobileNavOpen && <div className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="mobile-sidebar-header">
          <Link className="brand" href="/" onClick={() => setMobileNavOpen(false)}><Image className="brand-logo" src="/tasktracker-logo.jpg" alt="TaskTrackerHQ logo" width={42} height={42} priority /><span>TaskTrackerHQ</span></Link>
          <button type="button" className="mobile-close-btn" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">?</button>
        </div>
        <Link className="workspace-switcher" href={session ? "/profile" : "/settings"} onClick={() => setMobileNavOpen(false)}><span className="workspace-avatar">{userInitials}</span><span className="workspace-copy"><strong>{session ? userName : "Your workspace"}</strong><small>{session ? "Personal workspace" : "Sign in to personalize"}</small></span><span className="chevron">?</span></Link>
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navigation.map((item) => <Link className={`nav-item ${active === item.label ? "active" : ""}`} href={item.href} onClick={() => setMobileNavOpen(false)} key={item.href}><span className="nav-icon">{item.icon}</span>{item.label}</Link>)}
          <span className="nav-label nav-label-spaced">Manage</span>
          <Link className={`nav-item ${active === "Settings" ? "active" : ""}`} href="/settings" onClick={() => setMobileNavOpen(false)}><span className="nav-icon">?</span>Settings</Link>
          <Link className={`nav-item ${active === "Feedback" ? "active" : ""}`} href="/admin/feedback" onClick={() => setMobileNavOpen(false)}><span className="nav-icon">?</span>Feedback</Link>
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{title}</strong></div>
          <div className="topbar-actions">
            <SearchBar />
            <div className="notification-menu">
              <button className="icon-button" aria-label={`${unreadCount} unread notifications`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>?{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
              {open && <div className="notification-panel"><div className="notification-panel-header"><strong>Notifications</strong><button type="button" onClick={markAllAsRead} disabled={!unreadCount}>Mark all read</button></div>{notifications.length ? notifications.slice().reverse().map((item) => <button className={`notification-item ${item.read ? "is-read" : ""}`} key={item.id} type="button" onClick={() => markAsRead(item.id)}><span className={`notification-dot notification-dot-${item.tone}`} /><span>{item.message}</span></button>) : <p className="notification-empty">No notifications yet.</p>}</div>}
            </div>
            <span className="topbar-date">{dateLabel}</span>
          </div>
        </header>
        <div className="page-content"><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>{children}</div>
      </main>
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className="primary-button" {...props}><span>+</span>{children}</button>; }
export function StatusPill({ status }: { status: string }) { return <span className={`status-pill status-${status.toLowerCase().replace(" ", "-")}`}><i />{status}</span>; }
