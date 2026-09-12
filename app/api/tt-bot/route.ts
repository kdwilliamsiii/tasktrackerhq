import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../lib/auth";
import { addTask, listTasks } from "../../../lib/db";
import { db } from "../../../lib/db";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "A message is required" }, { status: 400 });

  const normalized = message.toLowerCase();
  const session = await getServerSession(authOptions);
  const tasks = await listTasks();

  if (normalized.includes("add a task") || normalized.startsWith("add task")) {
    const title = message.replace(/^add\s+(a\s+)?task\s*:?\s*/i, "").trim();
    if (!title) return NextResponse.json({ reply: "Sure — what should I add to your task list?", action: "add-task" });
    const task = await addTask({ title, completed: false, priority: "Medium", category: "TT Bot", dueDate: "" });
    return NextResponse.json({ reply: `Done — I added “${task.title}” to your tasks.`, action: "task-created", task });
  }

  if (normalized.includes("start focus") || normalized.includes("focus mode")) {
    return NextResponse.json({ reply: "Let’s focus. A 25-minute session is ready when you are.", action: "open-focus", href: "/focus" });
  }

  if (normalized.includes("suggestion") || normalized.includes("feedback")) {
    return NextResponse.json({ reply: "Thanks! I’ll send this to the admin. Your idea has been logged.", action: "open-suggestion" });
  }

  if (normalized.includes("schedule") || normalized.includes("calendar") || normalized.includes("meeting")) {
    const dueToday = tasks.filter((task) => !task.completed && task.dueDate === todayKey()).length;
    return NextResponse.json({ reply: dueToday ? `You have ${dueToday} task${dueToday === 1 ? "" : "s"} due today. Check Calendar for your synced events.` : "Your task schedule is clear today. Check Calendar for synced events.", action: "open-calendar", href: "/calendar" });
  }

  if (session && isAdmin(session) && (normalized.includes("new suggestions") || normalized.includes("highest priority"))) {
    const suggestions = await db.collection("suggestions").find({ status: "new" }, { projection: { _id: 0 } }).sort({ priority: -1, createdAt: -1 }).limit(5).toArray();
    if (!suggestions.length) return NextResponse.json({ reply: "There are no new suggestions right now.", action: "open-admin", href: "/admin/feedback" });
    const top = suggestions[0] as { featureName?: string; priority?: string };
    return NextResponse.json({ reply: `I found ${suggestions.length} new suggestion${suggestions.length === 1 ? "" : "s"}. Highest priority: ${top.featureName || "Untitled"} (${top.priority || "unknown"}).`, action: "open-admin", href: "/admin/feedback" });
  }

  const open = tasks.filter((task) => !task.completed);
  const overdue = open.filter((task) => task.dueDate && task.dueDate < todayKey()).length;
  if (overdue) return NextResponse.json({ reply: `You have ${overdue} overdue task${overdue === 1 ? "" : "s"}. Pick one small next step, or ask me to add a task.` });
  if (open.length) return NextResponse.json({ reply: `You have ${open.length} open task${open.length === 1 ? "" : "s"}. I can help you prioritize, start focus mode, or show today’s schedule.` });
  return NextResponse.json({ reply: "Hi! I’m TT Bot. Ask me to add a task, start focus mode, show today’s schedule, or share feedback." });
}
