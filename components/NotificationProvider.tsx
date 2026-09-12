"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "./Toast";

export type NotificationTone = "success" | "info" | "warning" | "error";
type Notification = { id: string; message: string; tone: NotificationTone };
type NotificationContextValue = { notify: (message: string, tone?: NotificationTone) => void };

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notify = useCallback((message: string, tone: NotificationTone = "info") => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { id, message, tone }].slice(-4));
    window.setTimeout(() => setNotifications((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return <NotificationContext.Provider value={value}>{children}<div className="notification-stack" aria-live="polite" aria-atomic="false">{notifications.map((item) => <Toast key={item.id} message={item.message} tone={item.tone} onDismiss={() => setNotifications((current) => current.filter((entry) => entry.id !== item.id))} />)}</div></NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
