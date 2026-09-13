"use client";

import { useState } from "react";
import Link from "next/link";
import { useFloatingPosition } from "./useFloatingPosition";
import { useAuthGate } from "./AuthModalProvider";

type Message = { id: string; from: "bot" | "user"; text: string; href?: string };

export default function TTBot({ onOpenSuggestion }: { onOpenSuggestion: () => void }) {
  const { requireAuth } = useAuthGate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const floating = useFloatingPosition("tasktracker-bot-position", { right: 20, bottom: 82 });
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", from: "bot", text: "Hi! I’m TT Bot. How can I help you today?" }]);

  async function send(text = input) {
    const value = text.trim();
    if (!value || sending) return;
    if (!requireAuth(() => send(text), "Sign in or connect with Google or Microsoft to chat with TT Bot.")) {
      return;
    }
    setInput("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), from: "user", text: value }]);
    setSending(true);
    try {
      const response = await fetch("/api/tt-bot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value }) });
      const result = await response.json();
      if (result.action === "open-suggestion") onOpenSuggestion();
      setMessages((current) => [...current, { id: crypto.randomUUID(), from: "bot", text: result.reply || result.error || "I couldn’t process that request.", href: result.href }]);
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), from: "bot", text: "I’m having trouble connecting right now. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return <><button className="tt-bot-trigger" style={{ right: floating.position.right, bottom: floating.position.bottom, cursor: floating.dragging ? "grabbing" : "grab" }} onClick={() => { if (!floating.consumeDragged()) setOpen((value) => !value); }} onPointerDown={floating.onPointerDown} onPointerMove={floating.onPointerMove} onPointerUp={floating.onPointerUp} aria-label="Open TT Bot" type="button">✦<span>TT Bot</span></button>{open && <section className="tt-bot-panel" style={{ right: floating.position.right, bottom: floating.position.bottom + 52 }} aria-label="TT Bot assistant"><header><div><strong>TT Bot</strong><small>Your friendly productivity assistant</small></div><button onClick={() => setOpen(false)} aria-label="Close TT Bot">×</button></header><div className="tt-bot-messages">{messages.map((message) => <div className={`tt-bot-message ${message.from}`} key={message.id}><p>{message.text}</p>{message.href && <Link href={message.href} onClick={() => setOpen(false)}>Open this →</Link>}</div>)}</div><div className="tt-bot-quick"><button onClick={() => void send("show today's schedule")}>Today</button><button onClick={() => void send("start focus mode")}>Focus</button><button onClick={() => void send("add a task")}>Add task</button></div><form onSubmit={(event) => { event.preventDefault(); void send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask TT Bot..." aria-label="Message TT Bot" /><button type="submit" disabled={sending || !input.trim()}>↑</button></form></section>}</>;
}
