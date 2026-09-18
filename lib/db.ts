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
  banned?: boolean;
  extraCreditsUsd?: number;
  customFastLimit?: number;
  customAdvancedLimit?: number;
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

export async function listAllUsers() {
  return db.collection<UserProfile>("users").find({}, { projection: { _id: 0 } }).toArray();
}

export async function adminUpdateUser(
  id: string,
  updates: Partial<Pick<UserProfile, "tier" | "banned" | "extraCreditsUsd" | "customFastLimit" | "customAdvancedLimit" | "role">>
) {
  const result = await db.collection<UserProfile>("users").findOneAndUpdate(
    { id },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  return result;
}

export async function adminResetUserUsage(userId: string) {
  const result = await aiUsageCollection().deleteMany({ userId });
  return result.deletedCount;
}

export type GlobalFeatureToggles = {
  id: "global_feature_toggles";
  ttBotEnabled: boolean;
  fastModeEnabled: boolean;
  advancedModeEnabled: boolean;
  calendarAnalysisEnabled: boolean;
  projectBreakdownEnabled: boolean;
  updatedAt: string;
};

const featureTogglesCollection = () => db.collection<GlobalFeatureToggles>("feature_toggles");

export async function getGlobalFeatureToggles(): Promise<GlobalFeatureToggles> {
  const toggles = await featureTogglesCollection().findOne({ id: "global_feature_toggles" }, { projection: { _id: 0 } });
  if (toggles) return toggles;
  const initial: GlobalFeatureToggles = {
    id: "global_feature_toggles",
    ttBotEnabled: true,
    fastModeEnabled: true,
    advancedModeEnabled: true,
    calendarAnalysisEnabled: true,
    projectBreakdownEnabled: true,
    updatedAt: new Date().toISOString(),
  };
  await featureTogglesCollection().updateOne({ id: "global_feature_toggles" }, { $set: initial }, { upsert: true });
  return initial;
}

export async function updateGlobalFeatureToggles(changes: Partial<Omit<GlobalFeatureToggles, "id" | "updatedAt">>): Promise<GlobalFeatureToggles> {
  const result = await featureTogglesCollection().findOneAndUpdate(
    { id: "global_feature_toggles" },
    { $set: { ...changes, updatedAt: new Date().toISOString() } },
    { upsert: true, returnDocument: "after", projection: { _id: 0 } }
  );
  return result || getGlobalFeatureToggles();
}

export async function getAdminAiAnalytics() {
  const { startIso, endIso, monthLabel } = getCurrentMonthWindow();
  const allLogs = await aiUsageCollection().find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  const allUsers = await listAllUsers();

  const userMap = new Map<string, UserProfile>();
  allUsers.forEach((u) => userMap.set(u.id, u));

  let totalCostUsd = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let monthlyCostUsd = 0;
  let monthlyRequests = 0;
  let monthlyFastCount = 0;
  let monthlyAdvancedCount = 0;
  let monthlyNanoCount = 0;

  const costByModel: Record<string, { count: number; costUsd: number; tokensIn: number; tokensOut: number }> = {};
  const costByFeature: Record<string, { count: number; costUsd: number }> = {};
  const userUsageMap: Record<
    string,
    {
      userId: string;
      name: string;
      email: string;
      tier: string;
      banned: boolean;
      totalRequests: number;
      fastCount: number;
      advancedCount: number;
      nanoCount: number;
      tokensIn: number;
      tokensOut: number;
      totalCostUsd: number;
      lastActive: string;
      abuseFlag: boolean;
      abuseReason?: string;
    }
  > = {};

  const hourlyVolume: Record<string, number> = {};

  for (const log of allLogs) {
    const isThisMonth = log.createdAt >= startIso && log.createdAt <= endIso;
    const cost = log.costUsd || 0;
    totalCostUsd += cost;
    totalTokensIn += log.tokensIn || 0;
    totalTokensOut += log.tokensOut || 0;

    if (isThisMonth) {
      monthlyCostUsd += cost;
      monthlyRequests++;
    }

    const modelName = log.model || "unknown";
    const featName = log.feature || "general";
    const isNano = modelName.toLowerCase().includes("nano");
    const isAdvanced =
      featName.includes("advanced") ||
      featName.includes("tt-bot") ||
      modelName.includes("gpt-4.1") ||
      modelName.includes("gpt-4o") ||
      modelName.includes("gpt-4");

    if (isThisMonth) {
      if (isNano) monthlyNanoCount++;
      else if (isAdvanced) monthlyAdvancedCount++;
      else monthlyFastCount++;
    }

    if (!costByModel[modelName]) {
      costByModel[modelName] = { count: 0, costUsd: 0, tokensIn: 0, tokensOut: 0 };
    }
    costByModel[modelName].count++;
    costByModel[modelName].costUsd = Number((costByModel[modelName].costUsd + cost).toFixed(6));
    costByModel[modelName].tokensIn += log.tokensIn || 0;
    costByModel[modelName].tokensOut += log.tokensOut || 0;

    if (!costByFeature[featName]) {
      costByFeature[featName] = { count: 0, costUsd: 0 };
    }
    costByFeature[featName].count++;
    costByFeature[featName].costUsd = Number((costByFeature[featName].costUsd + cost).toFixed(6));

    const dayKey = log.createdAt.slice(0, 10);
    hourlyVolume[dayKey] = (hourlyVolume[dayKey] || 0) + 1;

    const uId = log.userId || "anonymous";
    if (!userUsageMap[uId]) {
      const uProf = userMap.get(uId);
      userUsageMap[uId] = {
        userId: uId,
        name: uProf?.name || (uId === "anonymous" ? "Anonymous / Guest" : "Unknown User"),
        email: uProf?.email || "-",
        tier: uProf?.tier || "free",
        banned: Boolean(uProf?.banned),
        totalRequests: 0,
        fastCount: 0,
        advancedCount: 0,
        nanoCount: 0,
        tokensIn: 0,
        tokensOut: 0,
        totalCostUsd: 0,
        lastActive: log.createdAt,
        abuseFlag: false,
      };
    }

    const uRecord = userUsageMap[uId];
    uRecord.totalRequests++;
    if (isNano) uRecord.nanoCount++;
    else if (isAdvanced) uRecord.advancedCount++;
    else uRecord.fastCount++;

    uRecord.tokensIn += log.tokensIn || 0;
    uRecord.tokensOut += log.tokensOut || 0;
    uRecord.totalCostUsd = Number((uRecord.totalCostUsd + cost).toFixed(6));
    if (log.createdAt > uRecord.lastActive) uRecord.lastActive = log.createdAt;
  }

  // Detect abuse signals: e.g. >150 fast calls on free, cost > $5 for non-enterprise, or >50 calls in a single day
  for (const u of Object.values(userUsageMap)) {
    if (u.tier === "free" && u.fastCount > 100) {
      u.abuseFlag = true;
      u.abuseReason = `Exceeded Free Tier fast quota (${u.fastCount}/100)`;
    } else if (u.tier === "free" && u.advancedCount > 0) {
      u.abuseFlag = true;
      u.abuseReason = `Unauthorized advanced reasoning on Free tier (${u.advancedCount} reqs)`;
    } else if (u.totalCostUsd > 10 && u.tier !== "enterprise") {
      u.abuseFlag = true;
      u.abuseReason = `Abnormal high cost spike ($${u.totalCostUsd.toFixed(2)})`;
    }
  }

  return {
    monthLabel,
    totalAllTimeCostUsd: Number(totalCostUsd.toFixed(6)),
    totalAllTimeRequests: allLogs.length,
    totalAllTimeTokensIn: totalTokensIn,
    totalAllTimeTokensOut: totalTokensOut,
    monthly: {
      requests: monthlyRequests,
      costUsd: Number(monthlyCostUsd.toFixed(6)),
      fastCount: monthlyFastCount,
      advancedCount: monthlyAdvancedCount,
      nanoCount: monthlyNanoCount,
    },
    costByModel,
    costByFeature,
    volumeByDay: hourlyVolume,
    userTable: Object.values(userUsageMap).sort((a, b) => b.totalCostUsd - a.totalCostUsd),
    recentLogs: allLogs.slice(0, 100),
  };
}


export type Task = {
  id: string;
  userId?: string;
  title: string;
  completed: boolean;
  priority: "Low" | "Medium" | "High";
  category?: string;
  dueDate?: string;
  completedAt?: string;
};

const tasks = () => db.collection<Task>("tasks");

export async function listTasks(userId?: string) {
  // Only return tasks belonging to the signed-in user. Legacy documents saved
  // before userId tracking existed (no userId field) are excluded from any
  // user's list to avoid leaking data across accounts; unauthenticated
  // requests get an empty list.
  if (!userId) return [];
  return tasks().find({ userId }, { projection: { _id: 0 } }).sort({ completed: 1, title: 1 }).toArray();
}

export async function addTask(input: Omit<Task, "id">) {
  const task = { ...input, id: crypto.randomUUID() };
  await tasks().insertOne(task);
  return task;
}

export async function updateTask(id: string, userId: string, changes: Partial<Omit<Task, "id" | "userId">>) {
  const update: UpdateFilter<Task> = { $set: changes };
  const result = await tasks().findOneAndUpdate({ id, userId }, update, { returnDocument: "after", projection: { _id: 0 } });
  return result;
}

export async function deleteTask(id: string, userId: string) {
  const result = await tasks().deleteOne({ id, userId });
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
  repeat?: "none" | "daily" | "weekly" | "monthly";
  repeatUntil?: string;
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
  isHonors?: boolean;
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

// -------------------------------------------------------------
// Resume Builder
// -------------------------------------------------------------
export type ResumeExperience = {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
};

export type ResumeEducation = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
};

export type ResumeProject = {
  id: string;
  name: string;
  description: string;
  link: string;
};

export type ResumeData = {
  userId?: string;
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  projects: ResumeProject[];
  updatedAt: string;
};

const resumeCollection = () => db.collection<{ userId: string } & ResumeData>("resumes");

export async function getUserResume(userId: string): Promise<ResumeData | null> {
  const record = await resumeCollection().findOne({ userId }, { projection: { _id: 0 } });
  return record as ResumeData | null;
}

export async function saveUserResume(
  userId: string,
  input: Omit<ResumeData, "userId" | "updatedAt">
): Promise<ResumeData> {
  const doc: ResumeData = { ...input, userId, updatedAt: new Date().toISOString() };
  await resumeCollection().updateOne({ userId }, { $set: doc }, { upsert: true });
  return doc;
}

export async function deleteUserResume(userId: string) {
  const result = await resumeCollection().deleteOne({ userId });
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

// -------------------------------------------------------------
// HQ Rewards System (XP, Badges, Streaks, Levels)
// -------------------------------------------------------------
import {
  type RewardsProfile,
  defaultRewardsProfile,
  getLevelProgress,
  evaluateBadges,
  calculateStreak,
  XP_VALUES,
} from "./rewards";

const rewardsCollection = () => db.collection<{ userId: string } & RewardsProfile>("rewards");

export async function getUserRewards(userId: string): Promise<RewardsProfile> {
  const record = await rewardsCollection().findOne({ userId }, { projection: { _id: 0, userId: 0 } });
  if (record) return record as RewardsProfile;
  return defaultRewardsProfile;
}

export async function awardUserXp(
  userId: string,
  event: {
    type: "task_completed" | "focus_session" | "ai_action" | "daily_checkin" | "custom";
    customXp?: number;
    description: string;
    focusMinutes?: number;
  }
): Promise<{ profile: RewardsProfile; xpEarned: number; newBadges: string[]; levelUp: boolean }> {
  const current = await getUserRewards(userId);

  let xpEarned = event.customXp || 0;
  let taskInc = 0;
  let focusInc = 0;
  let focusMinsInc = event.focusMinutes || 0;
  let aiInc = 0;

  if (event.type === "task_completed") {
    xpEarned = XP_VALUES.TASK_COMPLETED;
    taskInc = 1;
  } else if (event.type === "focus_session") {
    xpEarned = (event.focusMinutes && event.focusMinutes >= 50) ? XP_VALUES.FOCUS_SESSION_50MIN : XP_VALUES.FOCUS_SESSION_25MIN;
    focusInc = 1;
  } else if (event.type === "ai_action") {
    xpEarned = XP_VALUES.AI_ACTION;
    aiInc = 1;
  } else if (event.type === "daily_checkin") {
    xpEarned = XP_VALUES.DAILY_CHECKIN;
  }

  // Calculate streak update
  const streakCalc = calculateStreak(current.lastActiveDate, current.currentStreak, current.bestStreak);
  if (streakCalc.isNewDay) {
    // Add streak bonus
    xpEarned += Math.min(50, streakCalc.newStreak * XP_VALUES.STREAK_BONUS_PER_DAY);
  }

  const newTotalXp = current.xp + xpEarned;
  const progress = getLevelProgress(newTotalXp);
  const oldProgress = getLevelProgress(current.xp);
  const levelUp = progress.level > oldProgress.level;

  const candidateProfile: RewardsProfile = {
    ...current,
    xp: newTotalXp,
    level: progress.level,
    tier: progress.tier,
    currentStreak: streakCalc.newStreak,
    bestStreak: streakCalc.newBestStreak,
    lastActiveDate: streakCalc.todayIso,
    tasksCompleted: current.tasksCompleted + taskInc,
    focusSessionsCompleted: current.focusSessionsCompleted + focusInc,
    focusMinutes: current.focusMinutes + focusMinsInc,
    aiActionsUsed: current.aiActionsUsed + aiInc,
    history: [
      {
        id: crypto.randomUUID(),
        action: event.description,
        xp: xpEarned,
        timestamp: new Date().toISOString(),
      },
      ...(current.history || []).slice(0, 49),
    ],
  };

  const badgeEvaluation = evaluateBadges(candidateProfile);
  candidateProfile.unlockedBadges = badgeEvaluation.unlockedBadges;

  await rewardsCollection().updateOne(
    { userId },
    { $set: { userId, ...candidateProfile } },
    { upsert: true }
  );

  return {
    profile: candidateProfile,
    xpEarned,
    newBadges: badgeEvaluation.newBadges,
    levelUp,
  };
}

