"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInButtons({ callbackUrl = "/profile" }: { callbackUrl?: string }) {
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tasktracker-remember-device");
      if (stored !== null) return stored === "true";
    }
    return true;
  });

  const handleRememberChange = (checked: boolean) => {
    setRememberDevice(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("tasktracker-remember-device", String(checked));
    }
  };

  const login = (provider: "google" | "azure-ad") => {
    const params: Record<string, string> = { callbackUrl };
    if (!rememberDevice) {
      params.prompt = "select_account";
    }
    void signIn(provider, params);
  };

  return (
    <div className="sign-in-container">
      <label className="remember-device-checkbox">
        <input
          type="checkbox"
          checked={rememberDevice}
          onChange={(e) => handleRememberChange(e.target.checked)}
        />
        <span>
          <strong>Remember this device &amp; keep me logged in</strong>
          <small>Stay signed in on this browser across sessions</small>
        </span>
      </label>

      <div className="button-row sign-in-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => login("google")}
        >
          Sign in with Google
        </button>
        <button
          className="filter-button"
          type="button"
          onClick={() => login("azure-ad")}
        >
          Microsoft
        </button>
      </div>
    </div>
  );
}
