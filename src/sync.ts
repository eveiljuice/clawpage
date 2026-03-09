/**
 * Sync activity.json from ClawPage session logs.
 * Merges with existing data (keeps manual entries for days without logs).
 * Run: bun run src/sync.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const SESSIONS_DIR = "/root/.openclaw/agents/main/sessions/";
const ACTIVITY_FILE = join(import.meta.dir, "..", "activity.json");

interface ActivityEntry {
  messages: number;
}

function countMessagesFromLogs(): Record<string, number> {
  const daily: Record<string, number> = {};

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
          if (obj.type === "message") {
            const msg = obj.message;
            if (msg?.role === "user" && obj.timestamp) {
              const day = obj.timestamp.slice(0, 10);
              daily[day] = (daily[day] || 0) + 1;
            }
          }
        } catch {}
      }
    } catch {}
  }

  return daily;
}

function sync() {
  // Load existing
  let existing: Record<string, ActivityEntry> = {};
  try {
    existing = JSON.parse(readFileSync(ACTIVITY_FILE, "utf-8"));
  } catch {}

  // Count from logs
  const fromLogs = countMessagesFromLogs();

  // Merge: logs override, manual entries kept for days without logs
  const merged: Record<string, ActivityEntry> = { ...existing };
  for (const [day, count] of Object.entries(fromLogs)) {
    merged[day] = { messages: count };
  }

  // Sort by date
  const sorted: Record<string, ActivityEntry> = {};
  for (const key of Object.keys(merged).sort()) {
    sorted[key] = merged[key];
  }

  writeFileSync(ACTIVITY_FILE, JSON.stringify(sorted, null, 2) + "\n");

  const totalDays = Object.keys(sorted).length;
  const totalMsgs = Object.values(sorted).reduce(
    (s, d) => s + d.messages,
    0
  );
  console.log(
    `✅ Synced: ${totalDays} days, ${totalMsgs} total messages`
  );
  console.log(`   From logs: ${Object.keys(fromLogs).length} days`);
  console.log(`   Manual entries kept: ${totalDays - Object.keys(fromLogs).length} days`);
}

sync();
