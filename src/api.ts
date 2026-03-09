/**
 * REST API endpoints for multi-user heatmap.
 */
import { generateToken, extractBearer } from "./auth";
import {
  userExists, getUser, getUserByToken, saveUser, listUsers,
  pushActivity, getAllActivity, getUserStats,
  type UserProfile,
} from "./db";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

/** POST /api/register */
export async function handleRegister(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { username, displayName, bio, links, tags, avatarUrl } = body;

    if (!username || typeof username !== "string") {
      return error("username is required");
    }

    // Validate username
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return error("Username must be 3-30 chars, alphanumeric with _ or -");
    }

    if (userExists(username)) {
      return error("Username already taken", 409);
    }

    const token = generateToken();
    const user: UserProfile = {
      username: username.toLowerCase(),
      displayName: displayName || username,
      bio: bio || "",
      links: links || [],
      tags: tags || [],
      apiToken: token,
      avatarUrl: avatarUrl || "",
      createdAt: new Date().toISOString(),
    };

    saveUser(user);

    return json({ token, username: user.username, profileUrl: `/u/${user.username}` }, 201);
  } catch {
    return error("Invalid request body");
  }
}

/** POST /api/push — push activity data */
export async function handlePush(req: Request): Promise<Response> {
  const token = extractBearer(req);
  if (!token) return error("Authorization required", 401);

  const user = getUserByToken(token);
  if (!user) return error("Invalid token", 401);

  try {
    const body = await req.json();
    
    // Support single day or batch
    const entries: { date: string; messages: number; hourly?: number[]; topics?: string[] }[] =
      Array.isArray(body) ? body : [body];

    let pushed = 0;
    for (const entry of entries) {
      if (!entry.date || typeof entry.messages !== "number") continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
      
      pushActivity(user.username, entry.date, {
        messages: entry.messages,
        hourly: entry.hourly,
        topics: entry.topics,
      });
      pushed++;
    }

    return json({ ok: true, pushed, username: user.username });
  } catch {
    return error("Invalid request body");
  }
}

/** GET /api/profile/:username */
export function handleGetProfile(username: string): Response {
  const user = getUser(username);
  if (!user) return error("User not found", 404);

  const stats = getUserStats(username);

  // Public profile (no token)
  return json({
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    links: user.links,
    tags: user.tags,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    stats,
  });
}

/** PATCH /api/profile */
export async function handleUpdateProfile(req: Request): Promise<Response> {
  const token = extractBearer(req);
  if (!token) return error("Authorization required", 401);

  const user = getUserByToken(token);
  if (!user) return error("Invalid token", 401);

  try {
    const body = await req.json();
    
    if (body.displayName !== undefined) user.displayName = String(body.displayName);
    if (body.bio !== undefined) user.bio = String(body.bio);
    if (body.links !== undefined) user.links = body.links;
    if (body.tags !== undefined) user.tags = body.tags;
    if (body.avatarUrl !== undefined) user.avatarUrl = String(body.avatarUrl);

    saveUser(user);

    return json({ ok: true, username: user.username });
  } catch {
    return error("Invalid request body");
  }
}

/** GET /api/activity/:username */
export function handleGetActivity(username: string): Response {
  if (!userExists(username)) return error("User not found", 404);
  const activity = getAllActivity(username);
  return json(activity);
}

/** GET /api/users — list public profiles */
export function handleListUsers(): Response {
  const users = listUsers();
  const publicUsers = users.map((u) => ({
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    tags: u.tags,
    avatarUrl: u.avatarUrl,
    stats: getUserStats(u.username),
  }));
  
  // Sort by total messages descending
  publicUsers.sort((a, b) => b.stats.totalMessages - a.stats.totalMessages);
  
  return json(publicUsers);
}
