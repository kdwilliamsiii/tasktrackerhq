import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db } from "../../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../lib/auth";

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => null);
	const { featureName, description, category, priority } = body || {};
	const priorities = ["Low", "Medium", "High"];
	if (typeof featureName !== "string" || !featureName.trim() || typeof description !== "string" || !description.trim() || typeof category !== "string" || !category.trim() || !priorities.includes(priority)) {
		return NextResponse.json({ error: "Feature name, description, category, and a valid priority are required" }, { status: 400 });
	}

	const suggestion = {
		id: crypto.randomUUID(),
		featureName: featureName.trim().slice(0, 100),
		description: description.trim().slice(0, 1000),
		category: category.trim().slice(0, 40),
		priority,
		status: "new",
		createdAt: new Date().toISOString(),
	};

	await db.collection("suggestions").insertOne(suggestion);
	return NextResponse.json({ success: true });
}

export async function GET() {
	const session = await getServerSession(authOptions);
	if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	const suggestions = await db.collection("suggestions").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
	return NextResponse.json(suggestions);
}
