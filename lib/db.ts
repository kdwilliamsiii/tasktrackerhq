import { MongoClient, type UpdateFilter } from "mongodb";

const uri = process.env.MONGO_URL;

if (!uri) {
  throw new Error("MONGO_URL is required to use the database.");
}

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

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: "Low" | "Medium" | "High";
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
