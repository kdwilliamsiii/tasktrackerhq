import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../lib/auth";
import { addTask, listTasks } from "../../../lib/db";
import { db } from "../../../lib/db";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function askOpenAI(message: string, context: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: [
            "You are TT Bot, a capable productivity copilot inside TaskTrackerHQ.",
            "Be practical, concise, friendly, and proactive. Help with planning, prioritizing, time management, writing, brainstorming, explanations, and using TaskTrackerHQ.",
            "You may explain how to do things, but do not claim an action was completed unless the application confirms it.",
            "Never reveal private data from another user. Never help bypass authentication or authorization.",
            "Administrative data and actions are restricted to confirmed admins. If the user is not an admin, politely explain that admin access is required.",
            "The application, not the model, is responsible for enforcing permissions and changing data.",
            `Current application context:\n${context}`,
          ].join("\n\n"),
        },
        { role: "user", content: message },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "A message is required" }, { status: 400 });

  const normalized = message.toLowerCase();
  const session = await getServerSession(authOptions);
  const admin = isAdmin(session);
  const tasks = await listTasks();
  const today = todayKey();

  if (normalized.includes("add a task") || normalized.startsWith("add task")) {
    const title = message.replace(/^add\s+(a\s+)?task\s*:?\s*/i, "").trim();
    if (!title) return NextResponse.json({ reply: "Sure — what should I add to your task list?", action: "add-task" });
    const task = await addTask({ title, completed: false, priority: "Medium", category: "TT Bot", dueDate: "" });
    return NextResponse.json({ reply: `Done — I added “${task.title}” to your tasks.`, action: "task-created", task });
  }

  if (normalized.includes("new suggestions") || normalized.includes("highest priority")) {
    if (!admin) return NextResponse.json({ reply: "That information is restricted to administrators. I can still help you with your tasks, schedule, focus sessions, and planning." });
    const suggestions = await db.collection("suggestions").find({ status: "new" }, { projection: { _id: 0 } }).sort({ priority: -1, createdAt: -1 }).limit(5).toArray();
    if (!suggestions.length) return NextResponse.json({ reply: "There are no new suggestions right now.", action: "open-admin", href: "/admin/feedback" });
    const top = suggestions[0] as { featureName?: string; priority?: string };
    return NextResponse.json({ reply: `I found ${suggestions.length} new suggestion${suggestions.length === 1 ? "" : "s"}. Highest priority: ${top.featureName || "Untitled"} (${top.priority || "unknown"}).`, action: "open-admin", href: "/admin/feedback" });
  }

  if (normalized.includes("start focus") || normalized.includes("focus mode")) {
    return NextResponse.json({ reply: "Let’s focus. A 25-minute session is ready when you are.", action: "open-focus", href: "/focus" });
  }

  if (normalized.includes("suggestion") || normalized.includes("feedback")) {
    return NextResponse.json({ reply: "Thanks for the feedback. Use the suggestion form and an admin can review it.", action: "open-suggestion" });
  }

  const open = tasks.filter((task) => !task.completed);
  const overdue = open.filter((task) => task.dueDate && task.dueDate < today).length;
  const dueToday = open.filter((task) => task.dueDate === today).length;
  const context = JSON.stringify({
    signedIn: Boolean(session),
    admin,
    taskSummary: { open: open.length, overdue, dueToday, total: tasks.length },
    tasks: tasks.slice(0, 40).map(({ id, title, completed, priority, category, dueDate }) => ({ id, title, completed, priority, category, dueDate })),
  });

  try {
    const reply = await askOpenAI(message, context);
    if (reply) return NextResponse.json({ reply });
  } catch (error) {
    console.error("TT Bot AI request failed", error);
  }

  if (normalized.includes("schedule") || normalized.includes("calendar") || normalized.includes("meeting")) {
    return NextResponse.json({ reply: dueToday ? `You have ${dueToday} task${dueToday === 1 ? "" : "s"} due today. Check Calendar for your synced events.` : "Your task schedule is clear today. Check Calendar for synced events.", action: "open-calendar", href: "/calendar" });
  }
  if (overdue) return NextResponse.json({ reply: `You have ${overdue} overdue task${overdue === 1 ? "" : "s"}. Pick one small next step, or ask me to prioritize your tasks.` });
  if (open.length) return NextResponse.json({ reply: `You have ${open.length} open task${open.length === 1 ? "" : "s"}. I can help you prioritize, start focus mode, or show today’s schedule.` });
  return NextResponse.json({ reply: "Hi! I’m TT Bot. Ask me anything about planning, productivity, tasks, focus, or your schedule." });
}
