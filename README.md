<p align="center">
  <h1 align="center">🐾 ClawPage</h1>
  <p align="center"><strong>Your personal AI activity page</strong></p>
  <p align="center">GitHub-style heatmap for AI companion activity. Track every conversation, build your streak, share your page.</p>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#cli">CLI</a> •
  <a href="#api">API</a> •
  <a href="#self-hosting">Self-Hosting</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **📊 Activity Heatmap** — GitHub-style contribution grid for your AI conversations
- **⚡ Live Updates** — WebSocket-powered real-time tracking
- **🧠 AI Insights** — Peak hours, activity patterns, weekly trends
- **📈 Visualizations** — Timeline charts, word clouds
- **👤 Personal Profile** — Avatar, bio, links, tech stack tags
- **🔗 Sharing** — Telegram, Twitter, Copy Link, SVG export, GitHub badge
- **💻 CLI First** — Register, sync, and manage from your terminal
- **🏗️ Multi-User** — Each user gets their own public page at `/u/username`
- **📦 Zero Dependencies** — Runs on Bun with no external packages

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- An [OpenClaw](https://github.com/openclaw/openclaw) agent (for activity data)

### Install & Run

```bash
git clone https://github.com/eveiljuice/clawpage.git
cd clawpage
bun run src/server.ts
```

Server starts at `http://localhost:3333`

### Register & Sync

```bash
# Create your account
bun run src/cli.ts register --username myname --name "Display Name" --bio "Building cool stuff"

# Sync your OpenClaw activity
bun run src/cli.ts sync

# Check your stats
bun run src/cli.ts status
```

Your page is live at `http://localhost:3333/u/myname`

## CLI

```
🐾 ClawPage — Your AI Activity Page

Commands:
  register  --username <name> [--name "Display Name"] [--bio "..."]
  login     --token <token> [--server url]
  sync      [--watch]  Sync agent activity to server
  status    Show your current stats
  profile   [--bio "..."] [--name "..."] [--tag "Go"]
  open      Open your profile in browser
  help      Show this help
```

### Auto-sync

Run sync in watch mode to automatically push activity every 5 minutes:

```bash
bun run src/cli.ts sync --watch
```

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/register` | — | Create account → returns token |
| `POST` | `/api/push` | Bearer | Push activity data (single or batch) |
| `GET` | `/api/profile/:username` | — | Public profile + stats |
| `PATCH` | `/api/profile` | Bearer | Update bio, links, tags |
| `GET` | `/api/activity/:username` | — | Activity data |
| `GET` | `/api/users` | — | List all users |

### Push Activity

```bash
curl -X POST http://localhost:3333/api/push \
  -H "Authorization: Bearer hm_your_token" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-03-09", "messages": 42}'
```

### Batch Push

```bash
curl -X POST http://localhost:3333/api/push \
  -H "Authorization: Bearer hm_your_token" \
  -H "Content-Type: application/json" \
  -d '[
    {"date": "2026-03-08", "messages": 95},
    {"date": "2026-03-09", "messages": 42}
  ]'
```

## Embed in GitHub README

Add your activity badge:

```markdown
[![ClawPage](https://your-domain.com/badge.svg)](https://your-domain.com/u/username)
```

## Self-Hosting

### With systemd

```bash
# Create service file
sudo tee /etc/systemd/system/clawpage.service << EOF
[Unit]
Description=ClawPage - AI Activity Tracker
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/clawpage
ExecStart=/usr/local/bin/bun run src/server.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now clawpage
```

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3333` | Server port |
| `BASE_URL` | `http://localhost:3333` | Public URL for OG tags & sharing |

## Project Structure

```
clawpage/
├── src/
│   ├── server.ts     # HTTP + WebSocket server
│   ├── cli.ts        # CLI tool
│   ├── api.ts        # REST API endpoints
│   ├── auth.ts       # Token generation & validation
│   ├── db.ts         # JSON file storage
│   ├── data.ts       # Activity data loading
│   ├── heatmap.ts    # SVG heatmap rendering
│   ├── insights.ts   # AI-powered analytics
│   └── sync.ts       # Session log parser
├── data/
│   ├── users/        # User profiles (JSON)
│   └── activity/     # Per-user monthly activity (JSON)
├── public/           # Static assets
└── package.json
```

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript
- **Storage:** JSON files (no database needed)
- **Frontend:** Vanilla HTML/CSS/JS + [Lucide Icons](https://lucide.dev)
- **Typography:** Urbanist + Plus Jakarta Sans + JetBrains Mono
- **Real-time:** Native WebSocket (Bun.serve)

## License

[FSL-1.1-MIT](LICENSE.md) — Functional Source License

Free to use, modify, and self-host. Commercial hosting as a service requires a license. Code becomes MIT after 2 years.

---

<p align="center">Built with 🐾 by <a href="https://github.com/eveiljuice">@eveiljuice</a></p>
