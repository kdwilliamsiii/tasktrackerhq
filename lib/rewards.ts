export type BadgeId =
  | "first_task"
  | "task_machine_10"
  | "task_machine_50"
  | "task_machine_100"
  | "first_focus"
  | "focus_pro_10"
  | "focus_pro_50"
  | "ai_pioneer"
  | "ai_power_user_50"
  | "ai_power_user_200"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "consistency_king";

export type Badge = {
  id: BadgeId;
  name: string;
  description: string;
  category: "tasks" | "focus" | "ai" | "streaks";
  icon: string; // emoji or icon identifier
  unlockedAt?: string;
};

export const ALL_BADGES: Omit<Badge, "unlockedAt">[] = [
  // Task Badges
  { id: "first_task", name: "First Step", description: "Completed your first task in TaskTrackerHQ", category: "tasks", icon: "🌱" },
  { id: "task_machine_10", name: "Task Sprinter", description: "Completed 10 tasks", category: "tasks", icon: "⚡" },
  { id: "task_machine_50", name: "Task Crusher", description: "Completed 50 tasks", category: "tasks", icon: "🚀" },
  { id: "task_machine_100", name: "Task Machine", description: "Completed 100 tasks", category: "tasks", icon: "🏆" },

  // Focus Badges
  { id: "first_focus", name: "Deep In", description: "Completed your first focus session", category: "focus", icon: "⏱️" },
  { id: "focus_pro_10", name: "Flow State", description: "Completed 10 focus sessions", category: "focus", icon: "🧘" },
  { id: "focus_pro_50", name: "Focus Pro", description: "Completed 50 Pomodoro focus sessions", category: "focus", icon: "🎯" },

  // AI Badges
  { id: "ai_pioneer", name: "AI Spark", description: "Used AI assistant for task optimization", category: "ai", icon: "✨" },
  { id: "ai_power_user_50", name: "AI Collaborator", description: "Assisted 50 tasks with Fast & Advanced AI", category: "ai", icon: "🤖" },
  { id: "ai_power_user_200", name: "AI Power User", description: "Completed 200 AI-assisted actions", category: "ai", icon: "🧠" },

  // Streak Badges
  { id: "streak_3", name: "Hat Trick", description: "Maintained a 3-day active streak", category: "streaks", icon: "🔥" },
  { id: "streak_7", name: "Week Warrior", description: "Achieved a 7-day consistency streak", category: "streaks", icon: "⚡" },
  { id: "streak_30", name: "Consistency King", description: "Maintained an unbroken 30-day streak", category: "streaks", icon: "👑" },
];

export type RewardTier = "Beginner" | "Intermediate" | "Advanced" | "Productivity Master";

export type RewardsProfile = {
  xp: number;
  level: number;
  tier: RewardTier;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  tasksCompleted: number;
  focusSessionsCompleted: number;
  focusMinutes: number;
  aiActionsUsed: number;
  unlockedBadges: Record<string, string>; // badgeId -> ISO string date
  history: Array<{
    id: string;
    action: string;
    xp: number;
    timestamp: string;
  }>;
};

export const XP_VALUES = {
  TASK_COMPLETED: 15,
  FOCUS_SESSION_25MIN: 25,
  FOCUS_SESSION_50MIN: 55,
  FOCUS_MINUTE: 1,
  AI_ACTION: 10,
  DAILY_CHECKIN: 20,
  STREAK_BONUS_PER_DAY: 5,
};

export function getTierForLevel(level: number): RewardTier {
  if (level >= 51) return "Productivity Master";
  if (level >= 26) return "Advanced";
  if (level >= 11) return "Intermediate";
  return "Beginner";
}

/**
 * Level formula:
 * Level 1: 0 - 99 XP
 * Level N: 100 * (N - 1)^1.25 roughly, or tiered:
 * XP required for next level = Math.floor(100 * Math.pow(level, 1.25))
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(75 + i * 40);
  }
  return total;
}

export function getLevelProgress(xp: number): {
  level: number;
  tier: RewardTier;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  while (xp >= getXpForLevel(level + 1)) {
    level++;
  }

  const baseLevelXp = getXpForLevel(level);
  const nextLevelTotalXp = getXpForLevel(level + 1);
  const xpIntoCurrentLevel = xp - baseLevelXp;
  const xpNeededForNext = nextLevelTotalXp - baseLevelXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpIntoCurrentLevel / xpNeededForNext) * 100)));

  return {
    level,
    tier: getTierForLevel(level),
    currentLevelXp: xpIntoCurrentLevel,
    nextLevelXp: xpNeededForNext,
    progressPercent,
  };
}

export function evaluateBadges(profile: RewardsProfile): {
  newBadges: BadgeId[];
  unlockedBadges: Record<string, string>;
} {
  const currentUnlocked = { ...(profile.unlockedBadges || {}) };
  const newlyUnlocked: BadgeId[] = [];
  const nowIso = new Date().toISOString();

  const check = (id: BadgeId, condition: boolean) => {
    if (condition && !currentUnlocked[id]) {
      currentUnlocked[id] = nowIso;
      newlyUnlocked.push(id);
    }
  };

  check("first_task", profile.tasksCompleted >= 1);
  check("task_machine_10", profile.tasksCompleted >= 10);
  check("task_machine_50", profile.tasksCompleted >= 50);
  check("task_machine_100", profile.tasksCompleted >= 100);

  check("first_focus", profile.focusSessionsCompleted >= 1);
  check("focus_pro_10", profile.focusSessionsCompleted >= 10);
  check("focus_pro_50", profile.focusSessionsCompleted >= 50);

  check("ai_pioneer", profile.aiActionsUsed >= 1);
  check("ai_power_user_50", profile.aiActionsUsed >= 50);
  check("ai_power_user_200", profile.aiActionsUsed >= 200);

  check("streak_3", profile.currentStreak >= 3 || profile.bestStreak >= 3);
  check("streak_7", profile.currentStreak >= 7 || profile.bestStreak >= 7);
  check("streak_30", profile.currentStreak >= 30 || profile.bestStreak >= 30);
  check("consistency_king", profile.currentStreak >= 30 || profile.bestStreak >= 30);

  return {
    newBadges: newlyUnlocked,
    unlockedBadges: currentUnlocked,
  };
}

export function calculateStreak(lastActiveDate?: string, currentStreak = 0, bestStreak = 0): {
  newStreak: number;
  newBestStreak: number;
  todayIso: string;
  isNewDay: boolean;
} {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  if (!lastActiveDate) {
    return {
      newStreak: 1,
      newBestStreak: Math.max(1, bestStreak),
      todayIso,
      isNewDay: true,
    };
  }

  if (lastActiveDate === todayIso) {
    return {
      newStreak: currentStreak,
      newBestStreak: bestStreak,
      todayIso,
      isNewDay: false,
    };
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  if (lastActiveDate === yesterdayIso) {
    const updated = currentStreak + 1;
    return {
      newStreak: updated,
      newBestStreak: Math.max(updated, bestStreak),
      todayIso,
      isNewDay: true,
    };
  }

  // Broken streak
  return {
    newStreak: 1,
    newBestStreak: Math.max(1, bestStreak),
    todayIso,
    isNewDay: true,
  };
}

export const defaultRewardsProfile: RewardsProfile = {
  xp: 0,
  level: 1,
  tier: "Beginner",
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: "",
  tasksCompleted: 0,
  focusSessionsCompleted: 0,
  focusMinutes: 0,
  aiActionsUsed: 0,
  unlockedBadges: {},
  history: [],
};
