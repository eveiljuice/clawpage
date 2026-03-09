#!/usr/bin/env bun
/**
 * CLI for clawpage.
 * Usage: bun run src/cli.ts <command> [options]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const CONFIG_DIR = join(homedir(), ".clawpage");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface Config {
  server: string;
  token: string;
  username: string;
}

function loadConfig(): Config | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

function logo() {
  console.log(`
${c.red}${c.bold}  🐾 ClawPage${c.reset}
${c.dim}  Your AI Activity Page${c.reset}
`);
}

async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const config = loadConfig();
  const server = config?.server || "http://localhost:3333";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config?.token) headers["Authorization"] = `Bearer ${config.token}`;
  
  const res = await fetch(`${server}${path}`, { ...opts, headers: { ...headers, ...opts.headers as any } });
  const data = await res.json();
  
  if (!res.ok) {
    console.error(`${c.red}✗ Error:${c.reset} ${data.error || res.statusText}`);
    process.exit(1);
  }
  
  return data;
}

// ===== Commands =====

async function cmdRegister() {
  logo();
  
  const args = parseArgs();
  const username = args["username"] || args._[0];
  
  if (!username) {
    console.error(`${c.red}✗${c.reset} Usage: clawpage register --username <name>`);
    process.exit(1);
  }

  const displayName = args["name"] || username;
  const bio = args["bio"] || "";
  const server = args["server"] || "http://localhost:3333";

  console.log(`${c.cyan}→${c.reset} Registering ${c.bold}@${username}${c.reset} on ${server}...`);

  const data = await api("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, displayName, bio }),
  });

  const config: Config = {
    server,
    token: data.token,
    username: data.username,
  };
  saveConfig(config);

  console.log(`${c.green}✓${c.reset} Registered! Your profile: ${c.cyan}${server}/u/${data.username}${c.reset}`);
  console.log(`${c.green}✓${c.reset} Token saved to ${c.dim}${CONFIG_PATH}${c.reset}`);
  console.log(`\n${c.yellow}⚠${c.reset} Keep your token safe: ${c.dim}${data.token}${c.reset}`);
}

async function cmdLogin() {
  logo();
  
  const args = parseArgs();
  const token = args["token"] || args._[0];
  const server = args["server"] || "http://localhost:3333";

  if (!token) {
    console.error(`${c.red}✗${c.reset} Usage: clawpage login --token <token>`);
    process.exit(1);
  }

  // Verify token by fetching profile
  const config: Config = { server, token, username: "" };
  saveConfig(config);
  
  // Try to get user info
  try {
    const res = await fetch(`${server}/api/users`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (res.ok) {
      console.log(`${c.green}✓${c.reset} Token saved to ${c.dim}${CONFIG_PATH}${c.reset}`);
      console.log(`${c.dim}  Update username with: clawpage profile --username <name>${c.reset}`);
    }
  } catch {
    console.log(`${c.yellow}⚠${c.reset} Saved token but couldn't reach server at ${server}`);
  }
}

async function cmdSync() {
  const config = loadConfig();
  if (!config?.token) {
    console.error(`${c.red}✗${c.reset} Not logged in. Run: clawpage register --username <name>`);
    process.exit(1);
  }

  const args = parseArgs();
  const watch = args["watch"] || false;

  async function doSync() {
    const sessionsDir = join(homedir(), ".openclaw", "agents", "main", "sessions");
    
    if (!existsSync(sessionsDir)) {
      console.error(`${c.red}✗${c.reset} No agent sessions found at ${sessionsDir}`);
      return;
    }

    const daily: Record<string, { messages: number; hourly: number[] }> = {};
    const files = readdirSync(sessionsDir).filter(
      (f) => f.endsWith(".jsonl") || f.includes(".jsonl.")
    );

    for (const file of files) {
      const path = join(sessionsDir, file);
      try {
        const content = readFileSync(path, "utf-8");
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.type === "message" && obj.message?.role === "user" && obj.timestamp) {
              const ts = new Date(obj.timestamp);
              const day = ts.toISOString().slice(0, 10);
              const hour = ts.getUTCHours();
              
              if (!daily[day]) {
                daily[day] = { messages: 0, hourly: new Array(24).fill(0) };
              }
              daily[day].messages++;
              daily[day].hourly[hour]++;
            }
          } catch {}
        }
      } catch {}
    }

    const entries = Object.entries(daily).map(([date, data]) => ({
      date,
      messages: data.messages,
      hourly: data.hourly,
    }));

    if (entries.length === 0) {
      console.log(`${c.yellow}→${c.reset} No activity found`);
      return;
    }

    const totalMsgs = entries.reduce((s, e) => s + e.messages, 0);
    console.log(`${c.cyan}→${c.reset} Found ${c.bold}${totalMsgs}${c.reset} messages across ${c.bold}${entries.length}${c.reset} days`);

    const data = await api("/api/push", {
      method: "POST",
      body: JSON.stringify(entries),
    });

    console.log(`${c.green}✓${c.reset} Pushed ${data.pushed} days to server`);
  }

  if (watch) {
    console.log(`${c.cyan}🔄${c.reset} Watching for changes (sync every 5 min)...\n`);
    await doSync();
    setInterval(doSync, 5 * 60 * 1000);
  } else {
    await doSync();
  }
}

async function cmdStatus() {
  const config = loadConfig();
  if (!config?.username) {
    console.error(`${c.red}✗${c.reset} Not logged in.`);
    process.exit(1);
  }

  const data = await api(`/api/profile/${config.username}`);
  const s = data.stats;

  logo();
  console.log(`  ${c.bold}@${data.username}${c.reset} ${c.dim}${data.bio}${c.reset}`);
  console.log();
  console.log(`  ${c.red}${c.bold}${s.currentStreak}${c.reset} day streak 🔥`);
  console.log(`  ${c.bold}${s.totalMessages.toLocaleString()}${c.reset} total messages`);
  console.log(`  ${c.bold}${s.totalDays}${c.reset} active days`);
  console.log(`  ${c.bold}${s.longestStreak}${c.reset} best streak`);
  console.log();
  console.log(`  ${c.dim}${config.server}/u/${data.username}${c.reset}`);
}

async function cmdProfile() {
  const config = loadConfig();
  if (!config?.token) {
    console.error(`${c.red}✗${c.reset} Not logged in.`);
    process.exit(1);
  }

  const args = parseArgs();
  const updates: Record<string, any> = {};
  
  if (args["bio"]) updates.bio = args["bio"];
  if (args["name"]) updates.displayName = args["name"];
  if (args["avatar"]) updates.avatarUrl = args["avatar"];
  if (args["tag"]) {
    const existing = await api(`/api/profile/${config.username}`);
    updates.tags = [...(existing.tags || []), args["tag"]];
  }

  if (Object.keys(updates).length === 0) {
    // Show current profile
    const data = await api(`/api/profile/${config.username}`);
    logo();
    console.log(`  ${c.bold}${data.displayName}${c.reset} ${c.dim}@${data.username}${c.reset}`);
    console.log(`  ${data.bio || c.dim + "(no bio)" + c.reset}`);
    if (data.tags?.length) console.log(`  ${data.tags.map((t: string) => c.cyan + t + c.reset).join(" · ")}`);
    if (data.links?.length) console.log(`  ${data.links.map((l: any) => `${l.type}: ${l.value}`).join(" · ")}`);
    return;
  }

  await api("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  console.log(`${c.green}✓${c.reset} Profile updated`);
}

async function cmdOpen() {
  const config = loadConfig();
  if (!config?.username) {
    console.error(`${c.red}✗${c.reset} Not logged in.`);
    process.exit(1);
  }
  
  const url = `${config.server}/u/${config.username}`;
  console.log(`${c.cyan}→${c.reset} Opening ${url}`);
  
  // Try to open browser
  const proc = Bun.spawn(["xdg-open", url], { stdout: "ignore", stderr: "ignore" });
  await proc.exited;
}

// ===== Arg parsing =====

function parseArgs(): Record<string, any> & { _: string[] } {
  const args: Record<string, any> & { _: string[] } = { _: [] };
  const argv = process.argv.slice(3); // skip bun, script, command
  
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(argv[i]);
    }
  }
  
  return args;
}

function printHelp() {
  logo();
  console.log(`${c.bold}Commands:${c.reset}`);
  console.log(`  ${c.cyan}register${c.reset}  --username <name> [--name "Display Name"] [--bio "..."] [--server url]`);
  console.log(`  ${c.cyan}login${c.reset}     --token <token> [--server url]`);
  console.log(`  ${c.cyan}sync${c.reset}      [--watch]  Sync agent activity to server`);
  console.log(`  ${c.cyan}status${c.reset}    Show your current stats`);
  console.log(`  ${c.cyan}profile${c.reset}   [--bio "..."] [--name "..."] [--tag "Go"]  View/update profile`);
  console.log(`  ${c.cyan}open${c.reset}      Open your profile in browser`);
  console.log(`  ${c.cyan}help${c.reset}      Show this help`);
  console.log();
}

// ===== Main =====

const command = process.argv[2];

switch (command) {
  case "register": await cmdRegister(); break;
  case "login": await cmdLogin(); break;
  case "sync": await cmdSync(); break;
  case "status": await cmdStatus(); break;
  case "profile": await cmdProfile(); break;
  case "open": await cmdOpen(); break;
  case "help": case "--help": case "-h": case undefined: printHelp(); break;
  default:
    console.error(`${c.red}✗${c.reset} Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
