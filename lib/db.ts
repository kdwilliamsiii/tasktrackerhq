import { MongoClient, type UpdateFilter } from "mongodb";

const uri = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";

const client = new MongoClient(uri);

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise = global.mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  global.mongoClientPromise = clientPromise;
}

export const db = client.db("tasktrackerhq");
export { clientPromise };

export type UserProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "admin" | "user";
  tier?: "free" | "pro" | "enterprise";
  provider: string;
  providerAccountId: string;
  createdAt: string;
  updatedAt: string;
};

export async function saveUserProfile(profile: UserProfile) {
  await db.collection<UserProfile>("users").updateOne(
    { id: profile.id },
    { $set: profile },
    { upsert: true },
  );
}


export async function getUserProfile(id: string) {
  return db.collection<UserProfile>("users").findOne({ id }, { projection: { _id: 0 } });
}

export async function updateUserProfileTheme(id: string, theme: Record<string, unknown>) {
  const result = await db.collection<UserProfile>("users").findOneAndUpdate(
    { id },
    { $set: { theme, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  return result;
}

export async function updateUserProfileTier(id: string, tier: "free" | "pro" | "enterprise") {
  const result = await db.collection<UserProfile>("users").findOneAndUpdate(
    { id },
    { $set: { tier, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  return result;
}

export async function deleteUserProfile(id: string) {
  const result = await db.collection<UserProfile>("users").deleteOne({ id });
  return result.deletedCount > 0;
}

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: "Low" | "Medium" | "High";
  category?: string;
  dueDate?: string;
  completedAt?: string;
};

const tasks = () => db.collection<Task>("tasks");

export async function listTasks() {
  return tasks().find({}, { projection: { _id: 0 } }).sort({ completed: 1, title: 1 }).toArray();
}

export async function addTask(input: Omit<Task, "id">) {
  const task = { ...input, id: crypto.randomUUID() };
  await tasks().insertOne(task);
  return task;
}

export async function updateTask(id: string, changes: Partial<Omit<Task, "id">>) {
  const update: UpdateFilter<Task> = { $set: changes };
  const result = await tasks().findOneAndUpdate({ id }, update, { returnDocument: "after", projection: { _id: 0 } });
  return result;
}

export async function deleteTask(id: string) {
  const result = await tasks().deleteOne({ id });
  return result.deletedCount > 0;
}

export type CalendarEvent = {
  id: string;
  userId?: string;
  title: string;
  date: string;
  time?: string;
  provider?: string;
  location?: string;
  reminderMinutes?: number;
};

const eventsCollection = () => db.collection<CalendarEvent>("events");

export async function listCalendarEvents(userId?: string) {
  try {
    await eventsCollection().deleteMany({ provider: { $in: ["Google", "Microsoft"] } });
  } catch {
    // Ignore
  }

  const userFilter = userId ? { $or: [{ userId }, { userId: { $exists: false } }] } : {};
  const providerFilter = { $or: [{ provider: "Local" }, { provider: { $exists: false } }] };
  const query = { $and: [userFilter, providerFilter] };

  return eventsCollection().find(query, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
}

export async function addCalendarEvent(input: CalendarEvent) {
  const event = { ...input, id: input.id || crypto.randomUUID() };
  await eventsCollection().updateOne({ id: event.id }, { $set: event }, { upsert: true });
  return event;
}

export async function addCalendarEventNew(input: Omit<CalendarEvent, "id">) {
  const event = { ...input, id: crypto.randomUUID() };
  await eventsCollection().insertOne(event);
  return event;
}

export async function updateCalendarEventDb(id: string, changes: Partial<Omit<CalendarEvent, "id">>) {
  const update: UpdateFilter<CalendarEvent> = { $set: changes };
  const result = await eventsCollection().findOneAndUpdate({ id }, update, { returnDocument: "after", projection: { _id: 0 } });
  return result;
}

export async function deleteCalendarEventDb(id: string) {
  const result = await eventsCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export type GpaClass = {
  id: string;
  userId?: string;
  name: string;
  code: string;
  credits: number;
  pointsEarned: number;
  currentPossible: number;
  totalPossible: number;
};

const gpaClassesCollection = () => db.collection<GpaClass>("gpa_classes");

export async function listGpaClasses(userId?: string) {
  const query = userId ? { $or: [{ userId }, { userId: { $exists: false } }] } : {};
  return gpaClassesCollection().find(query, { projection: { _id: 0 } }).toArray();
}

export async function saveGpaClassDb(input: GpaClass) {
  const item = { ...input, id: input.id || crypto.randomUUID() };
  await gpaClassesCollection().updateOne({ id: item.id }, { $set: item }, { upsert: true });
  return item;
}

export async function deleteGpaClassDb(id: string) {
  const result = await gpaClassesCollection().deleteOne({ id });
  return result.deletedCount > 0;
}

export type AiUsageLog = {
  id: string;
  userId: string;
  model: string; // e.g. "gemini-nano", "o3-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"
  feature: string; // e.g. "fast", "advanced", "tt-bot", "extension", "task-rewrite"
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: string;
};

const aiUsageCollection = () => db.collection<AiUsageLog>("ai_usage");

export function calculateAiCost(model: string, tokensIn: number, tokensOut: number): number {
  const m = model.toLowerCase();
  if (m.includes("nano")) {
    // Gemini Nano on-device has zero token cost
    return 0;
  }
  if (m.includes("o3-mini")) {
    // $1.10 / 1M prompt tokens, $4.40 / 1M completion tokens
    return Number(((tokensIn * 1.10 + tokensOut * 4.40) / 1_000_000).toFixed(6));
  }
  if (m.includes("gpt-4.1") || m.includes("gpt-4o") || m.includes("gpt-4")) {
    if (m.includes("mini")) {
      // $0.15 / 1M prompt tokens, $0.60 / 1M completion tokens
      return Number(((tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000).toFixed(6));
    }
    // $2.50 / 1M prompt tokens, $10.00 / 1M completion tokens
    return Number(((tokensIn * 2.50 + tokensOut * 10.00) / 1_000_000).toFixed(6));
  }
  // Default estimate ($0.50 / $1.50 per 1M tokens)
  return Number(((tokensIn * 0.50 + tokensOut * 1.50) / 1_000_000).toFixed(6));
}

export async function recordAiUsage(entry: {
  userId?: string | null;
  model: string;
  feature: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  createdAt?: string;
}): Promise<AiUsageLog> {
  const tokensIn = entry.tokensIn || 0;
  const tokensOut = entry.tokensOut || 0;
  const costUsd = typeof entry.costUsd === "number" ? entry.costUsd : calculateAiCost(entry.model, tokensIn, tokensOut);

  const log: AiUsageLog = {
    id: crypto.randomUUID(),
    userId: entry.userId || "anonymous",
    model: entry.model,
    feature: entry.feature,
    tokensIn,
    tokensOut,
    costUsd,
    createdAt: entry.createdAt || new Date().toISOString(),
  };

  try {
    await aiUsageCollection().insertOne(log);
  } catch (err) {
    console.error("Failed to insert AI usage log:", err);
  }

  return log;
}

export async function listAiUsage(userId?: string, limit = 100): Promise<AiUsageLog[]> {
  const query = userId && userId !== "anonymous" ? { userId } : {};
  return aiUsageCollection().find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function getAiUsageSummary(userId?: string) {
  const query = userId && userId !== "anonymous" ? { userId } : {};
  const logs = await aiUsageCollection().find(query, { projection: { _id: 0 } }).toArray();

  const summary = {
    totalRequests: logs.length,
    totalTokensIn: logs.reduce((sum, l) => sum + (l.tokensIn || 0), 0),
    totalTokensOut: logs.reduce((sum, l) => sum + (l.tokensOut || 0), 0),
    totalCostUsd: Number(logs.reduce((sum, l) => sum + (l.costUsd || 0), 0).toFixed(6)),
    byModel: {} as Record<string, { count: number; costUsd: number; tokensIn: number; tokensOut: number }>,
    byFeature: {} as Record<string, { count: number; costUsd: number }>,
  };

  for (const log of logs) {
    if (!summary.byModel[log.model]) {
      summary.byModel[log.model] = { count: 0, costUsd: 0, tokensIn: 0, tokensOut: 0 };
    }
    summary.byModel[log.model].count += 1;
    summary.byModel[log.model].costUsd = Number((summary.byModel[log.model].costUsd + (log.costUsd || 0)).toFixed(6));
    summary.byModel[log.model].tokensIn += log.tokensIn || 0;
    summary.byModel[log.model].tokensOut += log.tokensOut || 0;

    if (!summary.byFeature[log.feature]) {
      summary.byFeature[log.feature] = { count: 0, costUsd: 0 };
    }
    summary.byFeature[log.feature].count += 1;
    summary.byFeature[log.feature].costUsd = Number((summary.byFeature[log.feature].costUsd + (log.costUsd || 0)).toFixed(6));
  }

  return summary;
}

export function getCurrentMonthWindow(): { startIso: string; endIso: string; monthLabel: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    monthLabel: startDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

export async function getMonthlyAiUsageForUser(userId: string) {
  const { startIso, endIso, monthLabel } = getCurrentMonthWindow();
  const query = {
    userId,
    createdAt: { $gte: startIso, $lte: endIso },
  };

  const logs = await aiUsageCollection().find(query, { projection: { _id: 0 } }).toArray();

  let fastCount = 0;
  let advancedCount = 0;
  let nanoCount = 0;
  let totalCostUsd = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (const log of logs) {
    totalTokensIn += log.tokensIn || 0;
    totalTokensOut += log.tokensOut || 0;
    totalCostUsd += log.costUsd || 0;

    const modelName = (log.model || "").toLowerCase();
    const featName = (log.feature || "").toLowerCase();

    if (modelName.includes("nano")) {
      nanoCount++;
    } else if (
      featName.includes("advanced") ||
      featName.includes("tt-bot") ||
      modelName.includes("gpt-4.1") ||
      modelName.includes("gpt-4o") ||
      modelName.includes("gpt-4")
    ) {
      advancedCount++;
    } else {
      fastCount++;
    }
  }

  return {
    monthLabel,
    totalRequests: logs.length,
    fastCount,
    advancedCount,
    nanoCount,
    totalTokensIn,
    totalTokensOut,
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
  };
}


