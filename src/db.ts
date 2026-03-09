/**
 * JSON file-based storage for users and activity data.
 * 
 * Structure:
 *   data/users/<username>.json        — profile + token
 *   data/activity/<username>/YYYY-MM.json — monthly activity
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "..", "data");
const USERS_DIR = join(DATA_DIR, "users");
const ACTIVITY_DIR = join(DATA_DIR, "activity");

// Ensure dirs exist
for (const dir of [DATA_DIR, USERS_DIR, ACTIVITY_DIR]) {
  mkdirSync(dir, { recursive: true });
}

// ===== User types =====

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  links: { type: string; value: string }[];
  tags: string[];
  apiToken: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface DayActivity {
  messages: number;
  hourly?: number[];
  topics?: string[];
}

export type MonthActivity = Record<string, DayActivity>;

// ===== User CRUD =====

export function userExists(username: string): boolean {
  return existsSync(join(USERS_DIR, `${username}.json`));
}

export function getUser(username: string): UserProfile | null {
  const path = join(USERS_DIR, `${username}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function getUserByToken(token: string): UserProfile | null {
  const files = readdirSync(USERS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const user: UserProfile = JSON.parse(
        readFileSync(join(USERS_DIR, file), "utf-8")
      );
      if (user.apiToken === token) return user;
    } catch {}
  }
  return null;
}

export function saveUser(user: UserProfile): void {
  writeFileSync(
    join(USERS_DIR, `${user.username}.json`),
    JSON.stringify(user, null, 2) + "\n"
  );
}

export function listUsers(): UserProfile[] {
  const files = readdirSync(USERS_DIR).filter((f) => f.endsWith(".json"));
  const users: UserProfile[] = [];
  for (const file of files) {
    try {
      users.push(JSON.parse(readFileSync(join(USERS_DIR, file), "utf-8")));
    } catch {}
  }
  return users;
}

// ===== Activity CRUD =====

function activityDir(username: string): string {
  const dir = join(ACTIVITY_DIR, username);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getMonthActivity(username: string, yearMonth: string): MonthActivity {
  const path = join(activityDir(username), `${yearMonth}.json`);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

export function saveMonthActivity(username: string, yearMonth: string, data: MonthActivity): void {
  writeFileSync(
    join(activityDir(username), `${yearMonth}.json`),
    JSON.stringify(data, null, 2) + "\n"
  );
}

export function pushActivity(
  username: string,
  date: string,
  day: DayActivity
): void {
  const yearMonth = date.slice(0, 7); // YYYY-MM
  const month = getMonthActivity(username, yearMonth);
  
  // Merge: add messages, update hourly/topics
  const existing = month[date] || { messages: 0 };
  month[date] = {
    messages: day.messages,
    hourly: day.hourly || existing.hourly,
    topics: day.topics || existing.topics,
  };
  
  saveMonthActivity(username, yearMonth, month);
}

/** Load ALL activity for a user (across all months) */
export function getAllActivity(username: string): Record<string, DayActivity> {
  const dir = activityDir(username);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const all: Record<string, DayActivity> = {};

  for (const file of files) {
    try {
      const month: MonthActivity = JSON.parse(
        readFileSync(join(dir, file), "utf-8")
      );
      for (const [date, data] of Object.entries(month)) {
        all[date] = data;
      }
    } catch {}
  }

  return all;
}

/** Get stats for a user */
export function getUserStats(username: string) {
  const activity = getAllActivity(username);
  const dates = Object.keys(activity).sort();
  const totalDays = dates.length;
  const totalMessages = Object.values(activity).reduce((s, d) => s + d.messages, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Longest streak
  let longestStreak = 0;
  let streak = 0;
  if (dates.length > 0) {
    const start = new Date(dates[0]);
    const d = new Date(start);
    while (d <= today) {
      const key = d.toISOString().slice(0, 10);
      if (activity[key]) {
        streak++;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  // Current streak
  let currentStreak = 0;
  const c = new Date(today);
  while (true) {
    const key = c.toISOString().slice(0, 10);
    if (activity[key]) {
      currentStreak++;
      c.setUTCDate(c.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return { totalDays, totalMessages, currentStreak, longestStreak };
}
