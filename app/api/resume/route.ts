import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import {
  getUserResume,
  saveUserResume,
  deleteUserResume,
  type ResumeExperience,
  type ResumeEducation,
  type ResumeProject,
} from "../../../lib/db";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

function sanitizeExperience(input: unknown): ResumeExperience[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      role: typeof item.role === "string" ? item.role.trim().slice(0, 120) : "",
      company: typeof item.company === "string" ? item.company.trim().slice(0, 120) : "",
      location: typeof item.location === "string" ? item.location.trim().slice(0, 120) : "",
      startDate: typeof item.startDate === "string" ? item.startDate.trim().slice(0, 20) : "",
      endDate: typeof item.endDate === "string" ? item.endDate.trim().slice(0, 20) : "",
      current: Boolean(item.current),
      bullets: Array.isArray(item.bullets)
        ? item.bullets.filter((b): b is string => typeof b === "string").map((b) => b.slice(0, 300)).slice(0, 20)
        : [],
    }));
}

function sanitizeEducation(input: unknown): ResumeEducation[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      school: typeof item.school === "string" ? item.school.trim().slice(0, 120) : "",
      degree: typeof item.degree === "string" ? item.degree.trim().slice(0, 120) : "",
      field: typeof item.field === "string" ? item.field.trim().slice(0, 120) : "",
      startDate: typeof item.startDate === "string" ? item.startDate.trim().slice(0, 20) : "",
      endDate: typeof item.endDate === "string" ? item.endDate.trim().slice(0, 20) : "",
    }));
}

function sanitizeProjects(input: unknown): ResumeProject[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      name: typeof item.name === "string" ? item.name.trim().slice(0, 120) : "",
      description: typeof item.description === "string" ? item.description.trim().slice(0, 400) : "",
      link: typeof item.link === "string" ? item.link.trim().slice(0, 200) : "",
    }));
}

export async function OPTIONS(request: Request) {
  return json(request, {});
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { resume: null, isAuthenticated: false });
  }
  const resume = await getUserResume(userId);
  return json(request, { resume, isAuthenticated: true });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required to save your resume." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json(request, { error: "Invalid resume payload" }, { status: 400 });
  }

  const resume = await saveUserResume(userId, {
    fullName: typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "",
    title: typeof body.title === "string" ? body.title.trim().slice(0, 120) : "",
    email: typeof body.email === "string" ? body.email.trim().slice(0, 120) : "",
    phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "",
    location: typeof body.location === "string" ? body.location.trim().slice(0, 120) : "",
    linkedin: typeof body.linkedin === "string" ? body.linkedin.trim().slice(0, 200) : "",
    website: typeof body.website === "string" ? body.website.trim().slice(0, 200) : "",
    summary: typeof body.summary === "string" ? body.summary.trim().slice(0, 1000) : "",
    experience: sanitizeExperience(body.experience),
    education: sanitizeEducation(body.education),
    skills: Array.isArray(body.skills)
      ? body.skills.filter((s: unknown): s is string => typeof s === "string").map((s: string) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 40)
      : [],
    projects: sanitizeProjects(body.projects),
  });

  return json(request, { resume }, { status: 200 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return json(request, { error: "Sign in required" }, { status: 401 });
  }
  return (await deleteUserResume(userId))
    ? json(request, { ok: true })
    : json(request, { error: "No resume found" }, { status: 404 });
}
