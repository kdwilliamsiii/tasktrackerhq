import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db } from "../../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions, isAdmin } from "../../../lib/auth";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const { featureName, description, category, priority } = body;

	if (!featureName || !description || !category || !priority) {
		return NextResponse.json({ error: "Missing fields" }, { status: 400 });
	}

	const suggestion = {
		id: crypto.randomUUID(),
		featureName,
		description,
		category,
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
	const suggestions = await db.collection("suggestions").find().toArray();
	return NextResponse.json(suggestions);
}
