"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { X, Lock, CheckCircle2 } from "lucide-react";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void, reason?: string) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  requireAuth: () => false,
});

export function useAuthGate() {
  return useContext(AuthContext);
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState<string>("");

  const isAuthenticated = status === "authenticated" && !!session?.user?.id;
  const isLoading = status === "loading";

  const openAuthModal = useCallback((reason?: string) => {
    setReasonText(
      reason ||
        "Sign in or connect with your Google or Microsoft account to create tasks, sync calendars, start focus sessions, and use AI features."
    );
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const requireAuth = useCallback(
    (action: () => void, reason?: string): boolean => {
      if (status === "authenticated" && session?.user?.id) {
        action();
        return true;
      }
      openAuthModal(reason);
      return false;
    },
    [status, session, openAuthModal]
  );

  const handleLogin = (provider: "google" | "azure-ad") => {
    void signIn(provider, { callbackUrl: typeof window !== "undefined" ? window.location.pathname : "/" });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeAuthModal}>
          <div
            className="modal auth-gate-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, padding: 24 }}
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeAuthModal}
              aria-label="Close sign in dialog"
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--teal) 15%, var(--surface))",
                  color: "var(--teal)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Lock size={24} />
              </div>
              <h2 style={{ fontSize: 20, color: "var(--navy)", margin: "0 0 6px" }}>
                Account Required
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                {reasonText}
              </p>
            </div>

            <div
              style={{
                background: "var(--background)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                marginBottom: 18,
                border: "1px solid var(--line)",
                fontSize: 12,
              }}
            >
              <strong style={{ display: "block", marginBottom: 6, color: "var(--navy)" }}>
                Signing in unlocks:
              </strong>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)" }}>
                  <CheckCircle2 size={13} color="var(--teal)" />
                  <span>Cloud task management &amp; multi-device sync</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)" }}>
                  <CheckCircle2 size={13} color="var(--teal)" />
                  <span>Google &amp; Microsoft Calendar bidirectional sync</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)" }}>
                  <CheckCircle2 size={13} color="var(--teal)" />
                  <span>Pomodoro focus timer &amp; streak tracking</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--foreground)" }}>
                  <CheckCircle2 size={13} color="var(--teal)" />
                  <span>TT Bot Copilot &amp; AI reasoning tools</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => handleLogin("google")}
                style={{ justifyContent: "center", width: "100%", padding: "11px 16px", fontSize: 13 }}
              >
                Sign in with Google
              </button>

              <button
                type="button"
                className="filter-button"
                onClick={() => handleLogin("azure-ad")}
                style={{
                  justifyContent: "center",
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid var(--line)",
                }}
              >
                Sign in with Microsoft
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                type="button"
                onClick={closeAuthModal}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: 11,
                  color: "var(--muted)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Continue exploring in Preview Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
