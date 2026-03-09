import { readFileSync } from "fs";
import { join } from "path";

export interface DayData {
  messages: number;
  level: number;
}

export type ActivityMap = Record<string, DayData>;

const COLORS = ["#2d333b", "#5c1a1a", "#8b2525", "#c13030", "#ff4444"];

export function getColors(): string[] {
  return COLORS;
}

export function loadActivity(): ActivityMap {
  const raw = JSON.parse(
    readFileSync(join(import.meta.dir, "..", "activity.json"), "utf-8")
  ) as Record<string, { messages: number }>;

  const counts = Object.values(raw).map((d) => d.messages);
  const max = Math.max(...counts, 1);

  const result: ActivityMap = {};
  for (const [date, data] of Object.entries(raw)) {
    const ratio = data.messages / max;
    let level = 0;
    if (ratio > 0) level = 1;
    if (ratio > 0.25) level = 2;
    if (ratio > 0.5) level = 3;
    if (ratio > 0.75) level = 4;
    result[date] = { messages: data.messages, level };
  }
  return result;
}

export function getStats(activity: ActivityMap) {
  const dates = Object.keys(activity).sort();
  const totalDays = dates.length;
  const totalMessages = Object.values(activity).reduce(
    (s, d) => s + d.messages,
    0
  );

  // streaks
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  const startDate = new Date("2026-02-20");
  const d = new Date(startDate);
  while (d <= today) {
    const key = fmt(d);
    if (activity[key]) {
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      streak = 0;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }

  // current streak: count back from today
  const c = new Date(today);
  while (true) {
    const key = fmt(c);
    if (activity[key]) {
      currentStreak++;
      c.setUTCDate(c.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return { totalDays, totalMessages, currentStreak, longestStreak };
}

export function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
