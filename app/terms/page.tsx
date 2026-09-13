"use client";

import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { FileText, Shield, ArrowLeft, CheckCircle2, Lock, Cpu, Cloud, Globe } from "lucide-react";

export default function TermsPage() {
  return (
    <AppShell
      active="Settings"
      eyebrow="Legal"
      title="Terms of Service"
      description="Terms and conditions governing your use of TaskTrackerHQ and its AI capabilities."
    >
      <div className="legal-page-container">
        <div className="legal-card">
          <h1>Terms of Service</h1>
          <div className="legal-badge-row">
            <span className="legal-badge">
              <FileText size={13} /> Effective Date: September 13, 2026
            </span>
            <span>Version 2.4</span>
            <span>TaskTrackerHQ Platform</span>
          </div>

          <div className="legal-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              Welcome to <strong>TaskTrackerHQ</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;). By creating an account, accessing our web application, installing our browser extension, downloading our Progressive Web Application (PWA), or utilizing our AI assistant features (including TT Bot, Gemini Nano on-device models, and cloud-based reasoning models), you agree to be bound by these Terms of Service.
            </p>
            <p>
              If you disagree with any part of these terms, you must discontinue use of the platform and uninstall any associated client extensions or web applications immediately.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. User Accounts &amp; Authentication</h2>
            <p>
              TaskTrackerHQ provides OAuth-based authentication via Google and Microsoft identity providers. You are responsible for safeguarding your login credentials and maintaining the confidentiality of any connected provider access tokens.
            </p>
            <ul>
              <li><strong>Account Ownership:</strong> You agree that all activities occurring under your authenticated profile are your responsibility.</li>
              <li><strong>Accuracy:</strong> You agree to provide accurate information when connecting calendar profiles, GPA classes, and workspace data.</li>
              <li><strong>Termination:</strong> We reserve the right to suspend or terminate accounts that violate these terms, exceed tier abuse thresholds, or engage in malicious API probing.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. AI Assistance &amp; Usage Tiers</h2>
            <p>
              TaskTrackerHQ provides dual-tier artificial intelligence services to assist with schedule analysis, task breakdown, GPA calculation insights, and quick task editing:
            </p>
            <div className="legal-highlight-box">
              <strong>Dual-Tier AI Architecture:</strong>
              <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                <li><strong>Fast / On-Device Path:</strong> Utilizes local browser-based Gemini Nano or low-latency cloud models for fast task formatting and suggestions.</li>
                <li><strong>Advanced Reasoning Path:</strong> Utilizes deep reasoning models (such as GPT-4.1) for schedule optimization, multi-phase project generation, and TT Bot chat.</li>
              </ul>
            </div>
            <ul>
              <li><strong>Tier Quotas:</strong> Free tier accounts receive designated monthly quotas for fast and on-device actions. Advanced reasoning features are unlocked via Pro and Enterprise tiers or approved quota grants.</li>
              <li><strong>Rate Limiting &amp; Abuse Prevention:</strong> Automated rate-limiting systems enforce usage caps per billing window. Attempting to bypass AI limits, reverse engineer API keys, or spam backend endpoints is strictly prohibited.</li>
              <li><strong>AI Output Disclaimers:</strong> AI-generated suggestions, day plans, and GPA projections are provided for informational and productivity assistance. You retain full responsibility for verifying task deadlines, calendar accuracy, and academic standing.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>4. Connected Calendar &amp; Cloud Integrations</h2>
            <p>
              When you connect Google Calendar or Microsoft Outlook to TaskTrackerHQ:
            </p>
            <ul>
              <li>You grant TaskTrackerHQ permission to read, create, synchronize, and update calendar events as directed by your explicit actions within the workspace.</li>
              <li>You may revoke calendar access at any time through your Google or Microsoft security account settings, or by selecting <strong>Disconnect</strong> in your TaskTrackerHQ Settings page.</li>
              <li>Disconnecting a provider removes associated session access tokens and local event caches from your device.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>5. Browser Extension &amp; Mobile PWA</h2>
            <p>
              The TaskTrackerHQ Browser Extension (Chrome/Edge Manifest V3) and Mobile PWA operate under these same Terms of Service:
            </p>
            <ul>
              <li>The extension only reads webpage content when you explicitly invoke right-click context menu actions (such as &ldquo;Add selection to TaskTrackerHQ&rdquo;) or interact with the quick-capture popup.</li>
              <li>The mobile application utilizes local caching and Service Workers to facilitate offline focus sessions and task management.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>6. Intellectual Property &amp; User Content</h2>
            <p>
              You retain full ownership of all tasks, notes, GPA course records, and custom workspace data you input into TaskTrackerHQ. We do not claim ownership over your personal data or user content.
            </p>
            <p>
              TaskTrackerHQ, including its logos, UI designs, algorithms, codebases, and custom themes, is protected by copyright and intellectual property laws.
            </p>
          </div>

          <div className="legal-section">
            <h2>7. Service Availability &amp; Modifications</h2>
            <p>
              While we strive for 99.9% uptime, TaskTrackerHQ is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. We reserve the right to modify, upgrade, or temporarily suspend features for maintenance, security enhancements, or platform improvements.
            </p>
          </div>

          <div className="legal-section">
            <h2>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, TaskTrackerHQ and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the platform, including data loss or schedule oversights.
            </p>
          </div>

          <div className="legal-section">
            <h2>9. Contact Information</h2>
            <p>
              If you have any questions regarding these Terms of Service or wish to contact platform administration:
            </p>
            <p>
              <strong>Email:</strong> support@tasktrackerhq.app<br />
              <strong>Feedback:</strong> Use the in-app Suggestion modal or visit <Link href="/admin/feedback" style={{ color: "var(--teal)", fontWeight: 600 }}>Feedback Center</Link>.
            </p>
          </div>

          <div className="legal-footer-nav">
            <Link href="/privacy" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Shield size={14} /> View Privacy Policy
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

