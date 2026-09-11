"use client";

import { useState } from "react";
import Nav from "./Nav";
import FloatingSuggestButton from "./FloatingSuggestButton";
import SuggestModal from "./SuggestModal";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  return (
    <div className="app-shell">
      <Nav />
      <main>{children}</main>
      <FloatingSuggestButton onClick={() => setSuggestionOpen(true)} />
      <SuggestModal open={suggestionOpen} onClose={() => setSuggestionOpen(false)} />
    </div>
  );
}
