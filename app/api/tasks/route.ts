import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { addTask, listTasks, updateTask, deleteTask, awardUserXp } from "../../../lib/db";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(request: Request, data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...getCorsHeaders(request), ...init?.headers },
  });
}

export async function OPTIONS(request: Request) {
  return json(request, {});
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return json(request, { tasks: await listTasks(userId) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to create tasks." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return json(request, { error: "A task title is required" }, { status: 400 });
  }
  const priority = body.priority === "High" || body.priority === "Low" ? body.priority : "Medium";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 40) : "Web Capture";
  const dueDate = typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? body.dueDate : "";
  return json(request, { task: await addTask({ userId, title: body.title.trim(), completed: false, priority, category, dueDate }) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to update tasks." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.id || typeof body.id !== "string") return json(request, { error: "A task id is required" }, { status: 400 });
  const input: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) input.title = body.title.trim();
  if (typeof body.completed === "boolean") {
    input.completed = body.completed;
    input.completedAt = body.completed ? new Date().toISOString() : "";
  }
  if (body.priority === "Low" || body.priority === "Medium" || body.priority === "High") input.priority = body.priority;
  if (typeof body.category === "string") input.category = body.category.trim().slice(0, 40);
  if (typeof body.dueDate === "string" && (!body.dueDate || /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate))) input.dueDate = body.dueDate;
  if (!Object.keys(input).length) return json(request, { error: "No valid task changes" }, { status: 400 });
  const task = await updateTask(body.id, userId, input);
  if (task && body.completed === true) {
    try {
      void awardUserXp(userId, {
        type: "task_completed",
        description: `Completed task: "${task.title.slice(0, 40)}"`,
      });
    } catch {
      // Non-blocking rewards
    }
  }
  return task ? json(request, { task }) : json(request, { error: "Task not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to delete tasks." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : new URL(request.url).searchParams.get("id");
  if (!id) return json(request, { error: "A task id is required" }, { status: 400 });
  return (await deleteTask(id, userId)) ? json(request, { ok: true }) : json(request, { error: "Task not found" }, { status: 404 });
}
