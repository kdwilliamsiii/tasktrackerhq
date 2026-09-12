"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "./Toast";

export type NotificationTone = "success" | "info" | "warning" | "error";
export type AppNotification = { id: string; message: string; tone: NotificationTone; read: boolean };
type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  notify: (message: string, tone?: NotificationTone) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const notify = useCallback((message: string, tone: NotificationTone = "info") => {
    const id = crypto.randomUUID();
    setNotifications((current) => [...current, { id, message, tone, read: false }].slice(-30));
    setVisibleIds((current) => [...current, id].slice(-4));
    window.setTimeout(() => setVisibleIds((current) => current.filter((item) => item !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setVisibleIds((current) => current.filter((item) => item !== id));
  }, []);
  const markAsRead = useCallback((id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }, []);
  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const value = useMemo(() => ({ notifications, unreadCount, notify, markAsRead, markAllAsRead }), [markAllAsRead, markAsRead, notifications, notify, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}<div className="notification-stack" aria-live="polite" aria-atomic="false">{notifications.filter((item) => visibleIds.includes(item.id)).map((item) => <Toast key={item.id} message={item.message} tone={item.tone} onDismiss={() => dismissToast(item.id)} />)}</div></NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
