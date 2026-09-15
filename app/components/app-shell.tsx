"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Timer,
  CalendarDays,
  GraduationCap,
  User,
  Settings,
  Lightbulb,
  RotateCw,
  Menu,
  X,
  ChevronDown,
  Bell,
  Cpu,
  Lock,
  LogIn,
  Trophy,
} from "lucide-react";
import SearchBar from "../../components/SearchBar";
import { useNotifications } from "../../components/NotificationProvider";
import { useAuthGate } from "../../components/AuthModalProvider";
import { broadcastDataChanged } from "../../lib/sync";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/gpa", label: "GPA Tracker", icon: GraduationCap },
  { href: "/rewards", label: "HQ Rewards", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children, active, eyebrow, title, description, action }: { children: React.ReactNode; active: string; eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const [dateLabel, setDateLabel] = useState("");
  const { data: session, status } = useSession();
  const { notifications, unreadCount, markAsRead, markAllAsRead, notify } = useNotifications();
  const { openAuthModal } = useAuthGate();
  const userName = session?.user?.name || "Guest user";
  const userInitials = session?.user?.name
    ? session.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TT"
    : "GP";

  useEffect(() => {
    const updateDate = () => setDateLabel(new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(new Date()));
    updateDate();
    const timer = window.setInterval(updateDate, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    notify("Refreshing TaskTrackerHQ...", "info");

    broadcastDataChanged("manual-refresh");

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      } catch {
        // Ignore
      }
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 250);
  };

  // Pull to refresh touch handlers for mobile PWA
  const handleTouchStart = (e: React.TouchEvent) => {
    if (typeof window !== "undefined" && window.scrollY === 0 && e.touches[0]) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current !== null && window.scrollY === 0 && e.touches[0]) {
      const currentY = e.touches[0].clientY;
      const dist = currentY - touchStartY.current;
      if (dist > 0) {
        setPullDistance(Math.min(100, Math.floor(dist * 0.5)));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 60) {
      void handleRefresh();
    }
    setPullDistance(0);
    touchStartY.current = null;
  };

  const userEmail = (session?.user?.email || "").toLowerCase();
  const isAdminUser = session?.user?.role === "admin" || userEmail === "kdwilliamsiii@gmail.com" || userEmail === "kdwilliamsiii@tasktrackerhq.app";

  return (
    <div
      className="app-frame"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Pull To Refresh Banner */}
      {pullDistance > 0 && (
        <div className="pull-refresh-indicator" style={{ height: pullDistance + "px" }}>
          <span>{pullDistance >= 60 ? "Release to refresh ?" : "Pull down to refresh..."}</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button type="button" className="mobile-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Link className="mobile-brand" href="/" onClick={() => setMobileNavOpen(false)}>
          <Image className="brand-logo" src="/tasktracker-logo.jpg" alt="TaskTrackerHQ logo" width={28} height={28} priority />
          <span>TaskTrackerHQ</span>
        </Link>

        <div className="mobile-header-actions">
          {!session && status !== "loading" && (
            <button
              type="button"
              className="primary-button"
              onClick={() => openAuthModal("Sign in to save tasks and sync calendars.")}
              style={{ padding: "4px 8px", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <LogIn size={11} /> Sign In
            </button>
          )}
          <button
            type="button"
            className={"mobile-refresh-btn" + (refreshing ? " spinning" : "")}
            onClick={() => void handleRefresh()}
            aria-label="Refresh app"
            title="Refresh TaskTrackerHQ"
          >
            <RotateCw size={16} className={refreshing ? "spinning" : ""} />
          </button>
          <span className="workspace-avatar mobile-avatar">{userInitials}</span>
        </div>
      </div>

      {mobileNavOpen && <div className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside className={"sidebar" + (mobileNavOpen ? " mobile-open" : "")}>
        <div className="mobile-sidebar-header">
          <Link className="brand" href="/" onClick={() => setMobileNavOpen(false)}>
            <Image className="brand-logo" src="/tasktracker-logo.jpg" alt="TaskTrackerHQ logo" width={42} height={42} priority />
            <span>TaskTrackerHQ</span>
          </Link>
          <button type="button" className="mobile-close-btn" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        {session ? (
          <Link className="workspace-switcher" href="/profile" onClick={() => setMobileNavOpen(false)}>
            <span className="workspace-avatar">{userInitials}</span>
            <span className="workspace-copy">
              <strong>{userName}</strong>
              <small>Personal workspace</small>
            </span>
            <ChevronDown size={14} className="chevron" />
          </Link>
        ) : (
          <button
            type="button"
            className="workspace-switcher"
            onClick={() => {
              setMobileNavOpen(false);
              openAuthModal("Sign in to personalize your workspace.");
            }}
            style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }}
          >
            <span className="workspace-avatar" style={{ background: "var(--orange)" }}>G</span>
            <span className="workspace-copy">
              <strong>Guest (Preview)</strong>
              <small style={{ color: "var(--teal)" }}>Sign in to unlock</small>
            </span>
            <Lock size={12} style={{ color: "var(--muted)" }} />
          </button>
        )}
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={"nav-item" + (active === item.label ? " active" : "")} href={item.href} onClick={() => setMobileNavOpen(false)} key={item.href}>
                <Icon className="nav-icon" size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <span className="nav-label nav-label-spaced">Manage</span>
          <Link className={"nav-item" + (active === "Settings" ? " active" : "")} href="/settings" onClick={() => setMobileNavOpen(false)}>
            <Settings className="nav-icon" size={18} />
            <span>Settings</span>
          </Link>
          <Link className={"nav-item" + (active === "Feedback" ? " active" : "")} href="/admin/feedback" onClick={() => setMobileNavOpen(false)}>
            <Lightbulb className="nav-icon" size={18} />
            <span>Feedback</span>
          </Link>
          {isAdminUser && (
            <Link className={"nav-item" + (active === "AI Intelligence" ? " active" : "")} href="/admin/ai-usage" onClick={() => setMobileNavOpen(false)}>
              <Cpu className="nav-icon" size={18} />
              <span>AI Intelligence</span>
            </Link>
          )}

          <button
            type="button"
            className="nav-item mobile-nav-refresh-item"
            onClick={() => {
              setMobileNavOpen(false);
              void handleRefresh();
            }}
          >
            <RotateCw className={"nav-icon" + (refreshing ? " spinning" : "")} size={18} />
            <span>Refresh App</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{title}</strong></div>
          <div className="topbar-actions">
            {!session && status !== "loading" && (
              <button
                type="button"
                className="primary-button"
                onClick={() => openAuthModal("Sign in to save tasks and sync calendars.")}
                style={{ padding: "6px 14px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <LogIn size={13} /> Sign In
              </button>
            )}
            <SearchBar />
            <div className="notification-menu">
              <button className="icon-button" aria-label={unreadCount + " unread notifications"} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </button>
              {open && <div className="notification-panel"><div className="notification-panel-header"><strong>Notifications</strong><button type="button" onClick={markAllAsRead} disabled={!unreadCount}>Mark all read</button></div>{notifications.length ? notifications.slice().reverse().map((item) => <button className={"notification-item" + (item.read ? " is-read" : "")} key={item.id} type="button" onClick={() => markAsRead(item.id)}><span className={"notification-dot notification-dot-" + item.tone} /><span>{item.message}</span></button>) : <p className="notification-empty">No notifications yet.</p>}</div>}
            </div>
            <span className="topbar-date">{dateLabel}</span>
          </div>
        </header>
        <div className="page-content">
          {!session && status !== "loading" && (
            <div className="guest-preview-banner">
              <div className="guest-preview-banner-content">
                <span className="guest-preview-pill">Preview Mode</span>
                <span className="guest-preview-text">
                  You are previewing TaskTrackerHQ. <strong>Sign in with Google or Microsoft</strong> to create tasks, sync your calendar, run focus sessions, and use AI features.
                </span>
              </div>
              <button
                type="button"
                className="primary-button guest-preview-action-btn"
                onClick={() => openAuthModal("Sign in to unlock all workspace features.")}
              >
                <Lock size={12} /> Sign In to Unlock
              </button>
            </div>
          )}

          <div className="page-heading">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p className="page-description">{description}</p>
            </div>
            {action && <div className="heading-action">{action}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className="primary-button" {...props}><span>+</span>{children}</button>; }
export function StatusPill({ status }: { status: string }) { return <span className={"status-pill status-" + status.toLowerCase().replace(" ", "-")}><i />{status}</span>; }
