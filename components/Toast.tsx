"use client";

export default function Toast({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div role="status" className="toast">
      <span>{message}</span>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss notification">Dismiss</button>}
    </div>
  );
}
