import { NextResponse } from "next/server";
import { addTask, listTasks, updateTask, deleteTask } from "../../../lib/db";

export async function GET() {
  return NextResponse.json({ tasks: await listTasks() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "A task title is required" }, { status: 400 });
  }
  const priority = body.priority === "High" || body.priority === "Low" ? body.priority : "Medium";
  return NextResponse.json({ task: await addTask({ title: body.title.trim(), completed: false, priority }) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.id || typeof body.id !== "string") return NextResponse.json({ error: "A task id is required" }, { status: 400 });
  const input: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) input.title = body.title.trim();
  if (typeof body.completed === "boolean") input.completed = body.completed;
  if (body.priority === "Low" || body.priority === "Medium" || body.priority === "High") input.priority = body.priority;
  if (!Object.keys(input).length) return NextResponse.json({ error: "No valid task changes" }, { status: 400 });
  const task = await updateTask(body.id, input);
  return task ? NextResponse.json({ task }) : NextResponse.json({ error: "Task not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A task id is required" }, { status: 400 });
  return (await deleteTask(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Task not found" }, { status: 404 });
}
