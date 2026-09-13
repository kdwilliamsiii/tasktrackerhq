import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../lib/auth";
import { addTask, listTasks, listCalendarEvents, listGpaClasses, addCalendarEvent, recordAiUsage } from "../../../lib/db";
import { db } from "../../../lib/db";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(request: Request, data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...getCorsHeaders(request), ...init?.headers },
  });
}

export async function OPTIONS(request: Request) {
  return jsonResponse(request, {});
}


function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function askOpenAI(message: string, context: string, userId?: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const chosenModel = process.env.OPENAI_MODEL || "gpt-4.1";
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: chosenModel === "gpt-4.1" ? "gpt-4o" : chosenModel,
      temperature: 0.4,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: [
            "You are TT Bot, TaskTrackerHQ's advanced reasoning assistant and copilot.",
            "You analyze calendars, projects, tasks, focus periods, and coursework to generate structured, optimal schedules, day planning, and execution roadmaps.",
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

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;

  await recordAiUsage({
    userId: userId || "anonymous",
    model: chosenModel,
    feature: "tt-bot",
    tokensIn,
    tokensOut,
  });

  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return jsonResponse(request, { error: "A message is required" }, { status: 400 });

  const normalized = message.toLowerCase();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const admin = isAdmin(session);
  const tasks = await listTasks();
  const calendarEvents = await listCalendarEvents(userId);
  const gpaClasses = await listGpaClasses(userId);
  const today = todayKey();

  if (normalized.includes("add a task") || normalized.startsWith("add task")) {
    const title = message.replace(/^add\s+(a\s+)?task\s*:?\s*/i, "").trim();
    if (!title) return jsonResponse(request, { reply: "Sure — what should I add to your task list?", action: "add-task" });
    const task = await addTask({ title, completed: false, priority: "Medium", category: "TT Bot", dueDate: "" });
    return jsonResponse(request, { reply: `Done — I added “${task.title}” to your tasks.`, action: "task-created", task });
  }

  if (normalized.startsWith("add event") || normalized.startsWith("add calendar event") || normalized.startsWith("schedule event")) {
    const details = message.replace(/^(add\s+event|add\s+calendar\s+event|schedule\s+event)\s*:?\s*/i, "").trim();
    if (!details) return jsonResponse(request, { reply: "Sure — what event would you like to schedule? (e.g. 'Team Sync')", action: "open-calendar" });

    const event = await addCalendarEvent({
      id: crypto.randomUUID(),
      userId,
      title: details,
      date: today,
      time: "",
      provider: "Local",
      reminderMinutes: 30
    });
    return jsonResponse(request, { reply: `Done — I scheduled “${event.title}” on your calendar for today (${today}).`, action: "event-created", event });
  }

  if (normalized.includes("new suggestions") || normalized.includes("highest priority")) {
    if (!admin) return jsonResponse(request, { reply: "That information is restricted to administrators. I can still help you with your tasks, schedule, focus sessions, and planning." });
    const suggestions = await db.collection("suggestions").find({ status: "new" }, { projection: { _id: 0 } }).sort({ priority: -1, createdAt: -1 }).limit(5).toArray();
    if (!suggestions.length) return jsonResponse(request, { reply: "There are no new suggestions right now.", action: "open-admin", href: "/admin/feedback" });
    const top = suggestions[0] as { featureName?: string; priority?: string };
    return jsonResponse(request, { reply: `I found ${suggestions.length} new suggestion${suggestions.length === 1 ? "" : "s"}. Highest priority: ${top.featureName || "Untitled"} (${top.priority || "unknown"}).`, action: "open-admin", href: "/admin/feedback" });
  }

  if (normalized.includes("start focus") || normalized.includes("focus mode") || normalized.includes("pomodoro")) {
    return jsonResponse(request, { reply: "Let’s focus. A Pomodoro session with ambient audio is ready for you.", action: "open-focus", href: "/focus" });
  }

  if (normalized.includes("gpa") || normalized.includes("grade") || normalized.includes("class")) {
    if (gpaClasses.length > 0) {
      const avg = (gpaClasses.reduce((acc, c) => acc + (c.pointsEarned / (c.currentPossible || 1)) * 100, 0) / gpaClasses.length).toFixed(1);
      return jsonResponse(request, { reply: `You have ${gpaClasses.length} registered course${gpaClasses.length === 1 ? "" : "s"} with an average grade of ${avg}%. Open GPA Tracker to view your grade projections.`, action: "open-gpa", href: "/gpa" });
    }
    return jsonResponse(request, { reply: "I can help you check your GPA or class scores. Open the GPA Tracker page to see your overall course average and letter grades.", action: "open-gpa", href: "/gpa" });
  }

  if (normalized.includes("suggestion") || normalized.includes("feedback")) {
    return jsonResponse(request, { reply: "Thanks for the feedback. Use the suggestion form and an admin can review it.", action: "open-suggestion" });
  }

  const open = tasks.filter((task) => !task.completed);
  const overdue = open.filter((task) => task.dueDate && task.dueDate < today).length;
  const dueToday = open.filter((task) => task.dueDate === today).length;
  const context = JSON.stringify({
    signedIn: Boolean(session),
    admin,
    taskSummary: { open: open.length, overdue, dueToday, total: tasks.length },
    tasks: tasks.slice(0, 30).map(({ id, title, completed, priority, category, dueDate }) => ({ id, title, completed, priority, category, dueDate })),
    calendarEvents: calendarEvents.slice(0, 15).map(({ id, title, date, time, provider }) => ({ id, title, date, time, provider })),
    courses: gpaClasses.map(c => ({ name: c.name, code: c.code, credits: c.credits }))
  });

  try {
    const reply = await askOpenAI(message, context, userId);
    if (reply) return jsonResponse(request, { reply });
  } catch (error) {
    console.error("TT Bot AI request failed", error);
  }

  if (normalized.includes("schedule") || normalized.includes("calendar") || normalized.includes("meeting")) {
    return jsonResponse(request, { reply: dueToday ? `You have ${dueToday} task${dueToday === 1 ? "" : "s"} due today. Check Calendar for your synced events.` : "Your task schedule is clear today. Check Calendar for synced events.", action: "open-calendar", href: "/calendar" });
  }
  if (overdue) return jsonResponse(request, { reply: `You have ${overdue} overdue task${overdue === 1 ? "" : "s"}. Pick one small next step, or ask me to prioritize your tasks.` });
  if (open.length) return jsonResponse(request, { reply: `You have ${open.length} open task${open.length === 1 ? "" : "s"}. I can help you prioritize, start focus mode, or show today’s schedule.` });
  return jsonResponse(request, { reply: "Hi! I’m TT Bot. Ask me anything about planning, productivity, tasks, focus, or your schedule." });
}
