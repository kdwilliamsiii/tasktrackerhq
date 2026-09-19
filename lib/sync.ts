/**
 * Cross-tab, cross-window, and PWA live sync utility for TaskTrackerHQ.
 * Ensures tasks, events, and metrics stay synchronized across tabs,
 * browser extension, and mobile PWA without needing manual app restarts.
 */

const SYNC_CHANNEL_NAME = "tasktracker-sync";
const STORAGE_SYNC_KEY = "tasktracker-last-sync";

// Keys that hold cached copies of a signed-in user's personal data. These must
// be wiped on sign-out/disconnect/account-deletion so the next person to use
// this browser (e.g. a shared device) doesn't see the previous user's cached
// events, grades, resume draft, notes, etc. in the guest/preview experience.
const LOCAL_USER_DATA_KEYS = [
  "tasktracker-events",
  "tasktracker-gpa-classes",
  "tasktracker-resume-draft",
  "tasktracker-focus-stats",
  "tasktracker-notes",
  "tasktracker-reminders",
];

/**
 * Remove all locally cached personal data from this browser. Call this
 * whenever a user signs out, disconnects a provider, or deletes their
 * account, so no residual personal data is visible to the next guest.
 */
export function clearLocalUserData() {
  if (typeof window === "undefined") return;
  for (const key of LOCAL_USER_DATA_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage access errors (e.g. private browsing restrictions)
    }
  }
}

let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Notify all open tabs, windows, and PWA instances that data has changed.
 */
export function broadcastDataChanged(reason = "data-changed") {
  if (typeof window === "undefined") return;

  // 1. Dispatch in-memory DOM event
  try {
    window.dispatchEvent(new CustomEvent("tasktracker-data-changed", { detail: { reason, timestamp: Date.now() } }));
  } catch {
    // Fallback for older DOMs
    window.dispatchEvent(new Event("tasktracker-data-changed"));
  }

  // 2. Broadcast via BroadcastChannel API (cross-tab / worker)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "DATA_CHANGED", reason, timestamp: Date.now() });
    } catch {
      // BroadcastChannel error ignored
    }
  }

  // 3. Fallback: Write to localStorage to trigger cross-tab storage event
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify({ reason, timestamp: Date.now() }));
  } catch {
    // LocalStorage quota or privacy mode ignored
  }
}

/**
 * Subscribe to data changes from any tab, window, PWA foregrounding, or local actions.
 * Automatically handles debouncing and returns an unsubscribe function.
 */
export function subscribeToDataSync(onSync: () => void | Promise<void>, debounceMs = 250): () => void {
  if (typeof window === "undefined") return () => {};

  let timer: number | null = null;
  let lastTrigger = 0;

  const trigger = () => {
    const now = Date.now();
    if (now - lastTrigger < 50) return; // Prevent tight loops
    lastTrigger = now;

    if (timer !== null) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      timer = null;
      try {
        void onSync();
      } catch (err) {
        console.error("Data sync callback error:", err);
      }
    }, debounceMs);
  };

  // 1. DOM Events
  window.addEventListener("tasktracker-data-changed", trigger);
  window.addEventListener("tasktracker-quick-add", trigger);

  // 2. BroadcastChannel
  let handleBcMessage: ((e: MessageEvent) => void) | null = null;
  if (broadcastChannel) {
    handleBcMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "DATA_CHANGED") {
        trigger();
      }
    };
    broadcastChannel.addEventListener("message", handleBcMessage);
  }

  // 3. Cross-tab Storage Event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_SYNC_KEY) {
      trigger();
    }
  };
  window.addEventListener("storage", handleStorage);

  // 4. Foreground / PWA resume events (Mobile Home Screen & Tab Switching)
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      trigger();
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", trigger);
  window.addEventListener("pageshow", trigger);

  // Return unsubscribe
  return () => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    window.removeEventListener("tasktracker-data-changed", trigger);
    window.removeEventListener("tasktracker-quick-add", trigger);
    if (broadcastChannel && handleBcMessage) {
      broadcastChannel.removeEventListener("message", handleBcMessage);
    }
    window.removeEventListener("storage", handleStorage);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", trigger);
    window.removeEventListener("pageshow", trigger);
  };
}
