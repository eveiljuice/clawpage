/**
 * AI-powered insights from agent session logs.
 * Parses JSONL session files to extract patterns, hourly distribution,
 * and per-day activity summaries.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SESSIONS_DIR = "/root/.openclaw/agents/main/sessions/";

interface LogMessage {
  role: string;
  content: string;
  timestamp: string;
}

interface HourlyData {
  hour: number;
  count: number;
}

interface DayOfWeekData {
  day: string;
  dayIndex: number;
  count: number;
  avgMessages: number;
}

interface DaySummary {
  date: string;
  messages: number;
  topics: string[];
  hourlyBreakdown: number[];
  firstMessage: string;
  lastMessage: string;
  peakHour: number;
}

interface WeeklyInsight {
  weekStart: string;
  weekEnd: string;
  totalMessages: number;
  avgPerDay: number;
  mostActiveDay: string;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}

export interface InsightsData {
  hourly: HourlyData[];
  dayOfWeek: DayOfWeekData[];
  patterns: string[];
  weeklyInsight: WeeklyInsight | null;
  peakHour: number;
  peakDay: string;
  avgMessagesPerDay: number;
  totalAnalyzedDays: number;
}

/** Extract text from message content (handles string and array formats) */
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (typeof part === "object" && part?.type === "text" && part?.text) {
        return part.text;
      }
    }
  }
  return "";
}

/** Check if text is a system/metadata message */
function isSystemMessage(text: string): boolean {
  const systemPatterns = [
    /^\[cron:/,
    /^\[.*UTC\]\s*\[Queued/,
    /^A new session was started/,
    /^To send an image back/,
    /^System:\s*\[/,
    /^Read HEARTBEAT\.md/,
    /^HEARTBEAT_OK/,
    /^NO_REPLY/,
    /^Current time:/,
    /^Execute your Session Startup/,
    /^\[media attached/,
    /^\[Queued/,
    /^\[.*UTC\]/,
  ];
  return systemPatterns.some((p) => p.test(text.trim()));
}

/** Truncate text to first meaningful line, max N chars */
function summarize(text: string, maxLen = 120): string {
  // Remove system metadata blocks
  let clean = text
    .replace(/Conversation info \(untrusted[\s\S]*?```/gm, "")
    .replace(/Sender \(untrusted[\s\S]*?```/gm, "")
    .replace(/Replied message \(untrusted[\s\S]*?```/gm, "")
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/\[.*?attached.*?\]/g, "")
    .replace(/\[image data removed.*?\]/g, "")
    .replace(/\[media attached.*?\]/g, "")
    .replace(/^System:.*$/gm, "")
    .replace(/^To send an image back.*$/gm, "")
    .replace(/^Return your summary.*$/gm, "")
    .replace(/^Your previous response.*$/gm, "")
    .replace(/^A completed cron.*$/gm, "")
    .trim();

  if (isSystemMessage(clean)) return "";

  // Take last meaningful non-empty line (actual user text is usually at the end)
  const lines = clean.split("\n").filter((l) => {
    const t = l.trim();
    return t.length > 2 && !t.startsWith("{") && !t.startsWith('"') && !t.startsWith("```");
  });

  // Pick the last real line (user text comes after metadata)
  const line = lines.length > 0 ? lines[lines.length - 1].trim() : "";
  if (!line) return "";
  return line.length > maxLen ? line.slice(0, maxLen) + "…" : line;
}

/** Parse all session logs and extract user messages with timestamps */
function parseAllLogs(): LogMessage[] {
  const messages: LogMessage[] = [];

  const files = readdirSync(SESSIONS_DIR).filter(
    (f) => f.endsWith(".jsonl") || f.includes(".jsonl.")
  );

  for (const file of files) {
    const path = join(SESSIONS_DIR, file);
    try {
      const content = readFileSync(path, "utf-8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === "message" && obj.message?.role === "user" && obj.timestamp) {
            const text = extractText(obj.message.content);
            if (text.trim()) {
              messages.push({
                role: "user",
                content: text,
                timestamp: obj.timestamp,
              });
            }
          }
        } catch {}
      }
    } catch {}
  }

  return messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Get hour (UTC+5 Yekaterinburg) from ISO timestamp */
function getLocalHour(ts: string): number {
  const d = new Date(ts);
  return (d.getUTCHours() + 5) % 24;
}

/** Get day of week name */
function getDayName(ts: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(ts);
  // Adjust to Yekaterinburg
  const utcHour = d.getUTCHours();
  const localDate = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return days[localDate.getUTCDay()];
}

/** Build hourly distribution (24 hours, Yekaterinburg time) */
function buildHourly(messages: LogMessage[]): HourlyData[] {
  const counts = new Array(24).fill(0);
  for (const m of messages) {
    counts[getLocalHour(m.timestamp)]++;
  }
  return counts.map((count, hour) => ({ hour, count }));
}

/** Build day-of-week distribution */
function buildDayOfWeek(messages: LogMessage[]): DayOfWeekData[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts: Record<string, number> = {};
  const dayCounts: Record<string, Set<string>> = {};

  for (const d of days) {
    counts[d] = 0;
    dayCounts[d] = new Set();
  }

  for (const m of messages) {
    const localDate = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    const jsDay = localDate.getUTCDay(); // 0=Sun
    const dayName = days[jsDay === 0 ? 6 : jsDay - 1]; // remap to Mon-based
    counts[dayName]++;
    dayCounts[dayName].add(localDate.toISOString().slice(0, 10));
  }

  return days.map((day, i) => ({
    day,
    dayIndex: i,
    count: counts[day],
    avgMessages: dayCounts[day].size > 0
      ? Math.round(counts[day] / dayCounts[day].size)
      : 0,
  }));
}

/** Detect patterns from data */
function detectPatterns(
  hourly: HourlyData[],
  dayOfWeek: DayOfWeekData[],
  messages: LogMessage[]
): string[] {
  const patterns: string[] = [];

  // Peak hour
  const peakHour = hourly.reduce((a, b) => (a.count > b.count ? a : b));
  if (peakHour.count > 0) {
    const hourStr = `${peakHour.hour}:00`;
    patterns.push(`Peak activity at ${hourStr} (Yekaterinburg)|clock`);
  }

  // Night owl detection (22:00 - 04:00)
  const nightMessages = hourly
    .filter((h) => h.hour >= 22 || h.hour < 4)
    .reduce((s, h) => s + h.count, 0);
  const totalMessages = hourly.reduce((s, h) => s + h.count, 0);
  if (totalMessages > 0 && nightMessages / totalMessages > 0.3) {
    patterns.push(`Night Owl — ${Math.round((nightMessages / totalMessages) * 100)}% of messages at night|moon`);
  }

  // Morning person (6:00 - 10:00)
  const morningMessages = hourly
    .filter((h) => h.hour >= 6 && h.hour < 10)
    .reduce((s, h) => s + h.count, 0);
  if (totalMessages > 0 && morningMessages / totalMessages > 0.25) {
    patterns.push(`Early Bird — ${Math.round((morningMessages / totalMessages) * 100)}% of messages in the morning|sunrise`);
  }

  // Most active day of week
  const peakDay = dayOfWeek.reduce((a, b) => (a.avgMessages > b.avgMessages ? a : b));
  if (peakDay.avgMessages > 0) {
    patterns.push(`Most active day — ${peakDay.day} (avg ${peakDay.avgMessages} msgs)|calendar-check`);
  }

  // Least active day
  const activeDays = dayOfWeek.filter((d) => d.count > 0);
  if (activeDays.length > 0) {
    const quietDay = activeDays.reduce((a, b) =>
      a.avgMessages < b.avgMessages ? a : b
    );
    if (quietDay.day !== peakDay.day) {
      patterns.push(`Quietest day — ${quietDay.day}|bed`);
    }
  }

  // Inactive days of week
  const inactiveDays = dayOfWeek.filter((d) => d.count === 0);
  if (inactiveDays.length > 0) {
    const names = inactiveDays.map((d) => d.day).join(", ");
    patterns.push(`No activity on: ${names}|phone-off`);
  }

  // Weekend vs weekday
  const weekdayMsgs = dayOfWeek
    .filter((d) => d.dayIndex < 5)
    .reduce((s, d) => s + d.count, 0);
  const weekendMsgs = dayOfWeek
    .filter((d) => d.dayIndex >= 5)
    .reduce((s, d) => s + d.count, 0);
  if (weekdayMsgs > 0 && weekendMsgs > 0) {
    const ratio = weekendMsgs / weekdayMsgs;
    if (ratio > 0.6) {
      patterns.push("Weekend activity is close to weekdays|gamepad-2");
    } else if (ratio < 0.2) {
      patterns.push("Almost all activity on workdays|briefcase");
    }
  }

  return patterns;
}

/** Build weekly insight (current week vs previous) */
function buildWeeklyInsight(messages: LogMessage[]): WeeklyInsight | null {
  const now = new Date();
  const localNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  // Current week start (Monday)
  const dayOfWeek = localNow.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(localNow);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - mondayOffset);
  thisMonday.setUTCHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);

  const thisWeekMsgs = messages.filter((m) => {
    const d = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    return d >= thisMonday;
  });

  const lastWeekMsgs = messages.filter((m) => {
    const d = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    return d >= lastMonday && d < thisMonday;
  });

  if (thisWeekMsgs.length === 0 && lastWeekMsgs.length === 0) return null;

  // Days elapsed this week
  const daysThisWeek = Math.min(
    mondayOffset + 1,
    Math.ceil((localNow.getTime() - thisMonday.getTime()) / 86400000) + 1
  );

  // Most active day this week
  const dailyCounts: Record<string, number> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const m of thisWeekMsgs) {
    const d = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    const dayName = dayNames[d.getUTCDay()];
    dailyCounts[dayName] = (dailyCounts[dayName] || 0) + 1;
  }
  const mostActiveDay = Object.entries(dailyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // Trend
  const lastWeekDailyAvg = lastWeekMsgs.length / 7;
  const thisWeekDailyAvg = thisWeekMsgs.length / Math.max(daysThisWeek, 1);

  let trend: "up" | "down" | "stable" = "stable";
  let trendPercent = 0;
  if (lastWeekDailyAvg > 0) {
    trendPercent = Math.round(
      ((thisWeekDailyAvg - lastWeekDailyAvg) / lastWeekDailyAvg) * 100
    );
    if (trendPercent > 10) trend = "up";
    else if (trendPercent < -10) trend = "down";
  } else if (thisWeekMsgs.length > 0) {
    trend = "up";
    trendPercent = 100;
  }

  return {
    weekStart: thisMonday.toISOString().slice(0, 10),
    weekEnd: localNow.toISOString().slice(0, 10),
    totalMessages: thisWeekMsgs.length,
    avgPerDay: Math.round(thisWeekDailyAvg),
    mostActiveDay,
    trend,
    trendPercent,
  };
}

/** Get summary for a specific day */
export function getDaySummary(date: string): DaySummary | null {
  const messages = parseAllLogs().filter((m) => {
    const d = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10) === date;
  });

  if (messages.length === 0) return null;

  // Hourly breakdown
  const hourly = new Array(24).fill(0);
  for (const m of messages) {
    hourly[getLocalHour(m.timestamp)]++;
  }

  // Extract topics (unique summarized messages, deduped)
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const m of messages) {
    const summary = summarize(m.content);
    if (summary && !seen.has(summary) && summary.length > 5) {
      seen.add(summary);
      topics.push(summary);
    }
  }

  const peakHour = hourly.indexOf(Math.max(...hourly));

  return {
    date,
    messages: messages.length,
    topics: topics.slice(0, 15), // Top 15 topics
    hourlyBreakdown: hourly,
    firstMessage: summarize(messages[0].content),
    lastMessage: summarize(messages[messages.length - 1].content),
    peakHour,
  };
}

/** Get word frequency for wordcloud */
export function getWordCloud(): { word: string; count: number }[] {
  const messages = parseAllLogs();
  const freq: Record<string, number> = {};
  const stopWords = new Set([
    "и", "в", "на", "с", "по", "к", "у", "а", "о", "не", "что", "это", "я", "он",
    "она", "мы", "вы", "они", "но", "да", "ну", "же", "бы", "ли", "из", "за", "от",
    "до", "для", "как", "или", "ещё", "еще", "уже", "так", "то", "мне", "мой", "мою",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "about", "it", "its", "this", "that", "if", "or", "and", "but", "not",
    "you", "i", "me", "my", "we", "our", "your", "he", "she", "they", "them", "their",
    "all", "no", "yes", "just", "also", "more", "here", "there", "when", "how", "what",
    "which", "who", "where", "why", "some", "any", "each", "than", "then", "very",
    "too", "so", "up", "out", "now", "get", "got", "go", "see", "use", "new", "one",
    "two", "http", "https", "www", "com", "org", "net", "io",
    "untrusted", "metadata", "conversation", "info", "sender", "replied",
    "context", "message", "body", "label", "timestamp", "media", "attached",
    "reply", "current", "session", "started", "json", "schema", "type",
    "text", "image", "file", "utc", "mon", "tue", "wed", "thu", "fri", "sat", "sun",
    "data", "removed", "send", "bot", "inline", "openсlaw", "openclaw",
    "cron", "heartbeat", "read", "execute", "startup", "sequence",
    "username", "timonotdev", "timo", "telegram", "channel",
    "при", "тоже", "нужно", "чтобы", "также", "если", "может", "есть",
    "можно", "давай", "еще", "все", "ещё", "вот", "уже", "мне",
    "тебя", "тебе", "его", "ее", "них", "нас", "вас", "этот", "эта", "эти",
    "этого", "которые", "которая", "который", "которое",
    "only", "when", "after", "before", "over", "under", "between",
    "true", "false", "null", "undefined", "string", "number", "object",
    "group", "topic", "chat", "forum", "subject", "private", "direct",
    "request", "response", "error", "output", "input", "config", "option",
    "require", "mention", "allow", "policy", "account", "default",
    "sender_label", "sender_id", "message_id", "reply_to_id", "chat_id",
    "has_reply_context", "chat_type", "inbound", "path", "mime",
    "через", "без", "про", "как", "свой", "этим", "этих", "тоже", "только",
    "просто", "нет", "очень", "надо", "хочу", "хочет", "будет", "было",
    "были", "буду", "потом", "сейчас", "тут", "там", "ладно", "вообще",
    "короче", "ваше", "ваш", "наш", "наше", "свои", "своей", "своим",
  ]);

  for (const m of messages) {
    // Strip metadata envelopes before extracting words
    let text = m.content
      .replace(/Conversation info \(untrusted[\s\S]*?```/gm, "")
      .replace(/Sender \(untrusted[\s\S]*?```/gm, "")
      .replace(/Replied message \(untrusted[\s\S]*?```/gm, "")
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\[media attached.*?\]/g, "")
      .replace(/\[image data removed.*?\]/g, "")
      .replace(/To send an image back.*$/gm, "")
      .replace(/^System:.*$/gm, "")
      .replace(/^Current time:.*$/gm, "")
      .replace(/^A (new session|completed cron).*$/gm, "")
      .replace(/^Return your summary.*$/gm, "")
      .replace(/^Your previous response.*$/gm, "")
      .replace(/^Read HEARTBEAT.*$/gm, "")
      .replace(/^Execute your Session.*$/gm, "")
      .replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, " ");

    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([word, count]) => ({ word, count }));
}

/** Get daily timeline data */
export function getTimeline(): { date: string; messages: number; dayOfWeek: string }[] {
  const messages = parseAllLogs();
  const daily: Record<string, number> = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const m of messages) {
    const d = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    daily[key] = (daily[key] || 0) + 1;
  }

  // Fill gaps
  const dates = Object.keys(daily).sort();
  if (dates.length === 0) return [];

  const result: { date: string; messages: number; dayOfWeek: string }[] = [];
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  const d = new Date(start);

  while (d <= end) {
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      messages: daily[key] || 0,
      dayOfWeek: days[d.getUTCDay()],
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return result;
}

/** Get full insights */
export function getInsights(): InsightsData {
  const messages = parseAllLogs();
  const hourly = buildHourly(messages);
  const dayOfWeek = buildDayOfWeek(messages);
  const patterns = detectPatterns(hourly, dayOfWeek, messages);
  const weeklyInsight = buildWeeklyInsight(messages);

  const peakHour = hourly.reduce((a, b) => (a.count > b.count ? a : b)).hour;
  const peakDay = dayOfWeek.reduce((a, b) =>
    a.avgMessages > b.avgMessages ? a : b
  ).day;

  // Unique active days
  const activeDays = new Set<string>();
  for (const m of messages) {
    const d = new Date(new Date(m.timestamp).getTime() + 5 * 60 * 60 * 1000);
    activeDays.add(d.toISOString().slice(0, 10));
  }

  const avgMessagesPerDay =
    activeDays.size > 0 ? Math.round(messages.length / activeDays.size) : 0;

  return {
    hourly,
    dayOfWeek,
    patterns,
    weeklyInsight,
    peakHour,
    peakDay,
    avgMessagesPerDay,
    totalAnalyzedDays: activeDays.size,
  };
}
