"use client";

import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { Shield, FileText, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <AppShell
      active="Settings"
      eyebrow="Legal"
      title="Privacy Policy"
      description="How TaskTrackerHQ collects, protects, processes, and respects your personal and AI usage data."
    >
      <div className="legal-page-container">
        <div className="legal-card">
          <h1>Privacy Policy</h1>
          <div className="legal-badge-row">
            <span className="legal-badge">
              <Shield size={13} /> Effective Date: September 13, 2026
            </span>
            <span>Version 2.4</span>
            <span>GDPR &amp; CCPA Aligned</span>
          </div>

          <div className="legal-section">
            <h2>1. Our Commitment to Privacy</h2>
            <p>
              At <strong>TaskTrackerHQ</strong>, we believe productivity tools should protect your personal information, not monetize it. We operate under a strict principle: <strong>We do not sell, rent, or trade your personal data, task entries, or calendar schedules to third-party advertisers.</strong>
            </p>
            <p>
              This Privacy Policy explains what data we collect across our Web App, Mobile PWA, and Browser Extension, how it is used, and how you maintain total control over your information.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>
              We only collect information necessary to deliver productivity, calendar synchronization, and AI assistant capabilities:
            </p>
            <ul>
              <li><strong>Account Profile Data:</strong> When signing in via Google or Microsoft OAuth, we receive your basic profile name, email address, profile avatar image, and unique provider account identifier.</li>
              <li><strong>Workspace Content:</strong> Tasks, priorities, due dates, categories, GPA course names, credit values, and grade entries created by you.</li>
              <li><strong>Calendar Sync Data:</strong> When explicitly connected, event titles, start/end timestamps, locations, and provider event IDs from Google Calendar or Microsoft Outlook.</li>
              <li><strong>AI Telemetry &amp; Request Logs:</strong> Timestamps, model identifiers (e.g., <code>gemini-nano</code>, <code>o3-mini</code>, <code>gpt-4.1</code>), and feature invocations to enforce quota tier limits and calculate cost metrics.</li>
              <li><strong>Extension &amp; PWA Context:</strong> Text explicitly highlighted for quick-task capture and local focus session history (stored locally on your device).</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. How We Process &amp; Protect AI Requests</h2>
            <p>
              TaskTrackerHQ utilizes a privacy-first hybrid AI architecture designed to minimize cloud data transmission:
            </p>
            <div className="legal-highlight-box">
              <strong>AI Privacy Safeguards:</strong>
              <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                <li><strong>On-Device Gemini Nano:</strong> Compatible Chrome and Android browsers process text rewriting and fast task suggestions directly on your device hardware without transmitting prompt data to external cloud servers.</li>
                <li><strong>Cloud AI Processing:</strong> When utilizing advanced reasoning or TT Bot, prompts are transmitted securely via TLS 1.3 to enterprise AI backend gateways. Your prompts are <strong>not</strong> used to train public foundational AI models.</li>
                <li><strong>Role-Based Telemetry Isolation:</strong> Only high-level usage counts are displayed in user quota widgets; internal token counts and system cost telemetry are restricted strictly to authenticated administrative personnel.</li>
              </ul>
            </div>
          </div>

          <div className="legal-section">
            <h2>4. Third-Party Integrations &amp; OAuth Scopes</h2>
            <p>
              TaskTrackerHQ integrates with trusted cloud providers to deliver seamless multi-device productivity:
            </p>
            <ul>
              <li><strong>Google APIs:</strong> Used for Google OAuth identity and Google Calendar event sync. We adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal)" }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
              <li><strong>Microsoft Graph:</strong> Used for Azure AD / Microsoft account login and Outlook Calendar event mapping.</li>
              <li><strong>OpenAI:</strong> Used for advanced task reasoning, TT Bot conversations, and calendar optimization prompts.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>5. Data Storage, Security &amp; Retention</h2>
            <p>
              Your data is stored securely in encrypted databases with strict access controls. Authentication sessions use secure, encrypted JWT cookies.
            </p>
            <ul>
              <li><strong>Data Retention:</strong> We retain your workspace records as long as your account remains active.</li>
              <li><strong>Local Storage:</strong> Offline calendar event caches and theme customizations reside in your browser&apos;s local storage and can be cleared instantly from your device.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>6. Your Rights &amp; Data Deletion</h2>
            <p>
              You maintain full sovereignty over your data under GDPR, CCPA, and applicable global privacy frameworks:
            </p>
            <ul>
              <li><strong>Access &amp; Export:</strong> You can view all your stored tasks, GPA records, and active events directly in the application.</li>
              <li><strong>Disconnection:</strong> You can disconnect Google or Microsoft calendar integrations with one click in Settings, instantly wiping provider tokens.</li>
              <li><strong>Full Account Deletion:</strong> You have the right to request permanent deletion of your profile, all created tasks, GPA records, and AI usage logs by contacting administration.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>7. Children&apos;s Privacy</h2>
            <p>
              TaskTrackerHQ does not knowingly collect or solicit personal information from children under the age of 13. If we learn that we have collected personal data from a child under 13, we will promptly delete that information.
            </p>
          </div>

          <div className="legal-section">
            <h2>8. Contact Our Privacy Team</h2>
            <p>
              For privacy inquiries, data deletion requests, or questions regarding our security architecture:
            </p>
            <p>
              <strong>Email:</strong> privacy@tasktrackerhq.app<br />
              <strong>Administrator:</strong> TaskTrackerHQ Platform Security Team<br />
              <strong>In-App Support:</strong> Submit inquiries via the in-app Suggestion modal.
            </p>
          </div>

          <div className="legal-footer-nav">
            <Link href="/terms" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <FileText size={14} /> View Terms of Service
            </Link>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <ArrowLeft size={14} /> Return to Workspace
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

