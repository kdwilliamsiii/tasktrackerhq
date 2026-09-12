"use client";

import type { NotificationTone } from "./NotificationProvider";

export default function Toast({ message, tone = "info", onDismiss }: { message: string; tone?: NotificationTone; onDismiss?: () => void }) {
  return (
    <div role="status" className={`toast toast-${tone}`}>
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss notification">×</button>}
    </div>
  );
}
