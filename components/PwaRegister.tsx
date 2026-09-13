"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;

    // When the controlling service worker changes, silently reload or update state if needed
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        // Notify open tabs/PWAs that app assets updated
        window.dispatchEvent(new Event("tasktracker-app-update"));
      }
    });

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Check for updates on mount
        reg.update().catch(() => {});

        // If a new worker is waiting, activate it immediately
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New update available, activate it
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });

        // Check for updates whenever user returns to PWA (from Home Screen or another app)
        const checkForUpdates = () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
          }
        };

        document.addEventListener("visibilitychange", checkForUpdates);
        window.addEventListener("focus", checkForUpdates);
        window.addEventListener("pageshow", checkForUpdates);

        // Periodic check every 10 minutes
        const interval = window.setInterval(() => {
          reg.update().catch(() => {});
        }, 10 * 60 * 1000);

        return () => {
          document.removeEventListener("visibilitychange", checkForUpdates);
          window.removeEventListener("focus", checkForUpdates);
          window.removeEventListener("pageshow", checkForUpdates);
          window.clearInterval(interval);
        };
      })
      .catch((err) => {
        console.error("PWA ServiceWorker registration failed:", err);
      });
  }, []);

  return null;
}
