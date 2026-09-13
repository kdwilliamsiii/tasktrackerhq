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
