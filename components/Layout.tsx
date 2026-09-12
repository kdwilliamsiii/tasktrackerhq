"use client";

import { useState } from "react";
import FloatingSuggestButton from "./FloatingSuggestButton";
import SuggestModal from "./SuggestModal";
import { ThemeProvider } from "./ThemeProvider";
import { NotificationProvider } from "./NotificationProvider";
import TTBot from "./TTBot";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <ThemeProvider><NotificationProvider>
      <div className="app-shell">
        <main>{children}</main>
        <FloatingSuggestButton onClick={() => setSuggestionOpen(true)} />
        <SuggestModal open={suggestionOpen} onClose={() => setSuggestionOpen(false)} />
        <TTBot onOpenSuggestion={() => setSuggestionOpen(true)} />
      </div>
    </NotificationProvider></ThemeProvider>
  );
}
