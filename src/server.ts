import { loadActivity, getStats, getColors } from "./data";
import { renderHeatmap, renderLegend, renderBadge, renderExportCard } from "./heatmap";
import { getInsights, getDaySummary, getWordCloud, getTimeline } from "./insights";
import { handleRegister, handlePush, handleGetProfile, handleUpdateProfile, handleGetActivity, handleListUsers } from "./api";
import { getAllActivity, getUserStats, getUser, listUsers, type UserProfile } from "./db";
import { join } from "path";

const PUBLIC_DIR = join(import.meta.dir, "..", "public");
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

const PORT = 3333;
const BASE_URL = "http://62.60.246.221:3333";

function buildPage(): string {
  const activity = loadActivity();
  const stats = getStats(activity);
  const heatmapSvg = renderHeatmap(activity);
  const legendSvg = renderLegend();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timo — AI Activity</title>
  <link rel="icon" type="image/png" href="/favicon.png">

  <!-- OG -->
  <meta property="og:title" content="Timo — AI Activity · ${stats.totalDays} days, ${stats.totalMessages} messages">
  <meta property="og:description" content="Personal AI companion activity. Stack: Go, TypeScript, Python. Current streak: ${stats.currentStreak} days 🔥">
  <meta property="og:image" content="${BASE_URL}/og.svg">
  <meta property="og:url" content="${BASE_URL}">
  <meta property="og:type" content="profile">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Timo — AI Activity">
  <meta name="twitter:description" content="${stats.totalDays} days, ${stats.totalMessages} messages — streak: ${stats.currentStreak} 🔥">
  <meta name="twitter:image" content="${BASE_URL}/og.svg">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-deep: #08090d;
      --bg-surface: #0f1117;
      --bg-card: rgba(17, 19, 27, 0.7);
      --border: rgba(255, 255, 255, 0.06);
      --border-hover: rgba(220, 60, 60, 0.4);
      --text-primary: #eaedf3;
      --text-secondary: #7a8299;
      --text-muted: #454d64;
      --accent: #dc3c3c;
      --accent-glow: rgba(220, 60, 60, 0.15);
      --font-display: 'Urbanist', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    body {
      background: var(--bg-deep);
      color: var(--text-primary);
      font-family: var(--font-body);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 40px 16px;
    }

    /* Dot grid */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
      background-size: 32px 32px;
      pointer-events: none;
    }

    .container {
      max-width: 720px;
      width: 100%;
      position: relative;
      z-index: 1;
    }

    /* Profile */
    .profile {
      display: flex;
      gap: 20px;
      margin-bottom: 28px;
      align-items: flex-start;
    }
    .avatar {
      width: 80px; height: 80px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      border: 3px solid rgba(220, 60, 60, 0.3);
      box-shadow: 0 0 24px var(--accent-glow);
    }
    .avatar img {
      width: 100%; height: 100%;
      object-fit: cover;
    }
    .profile-info {
      flex: 1;
      min-width: 0;
    }
    .profile-name {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }
    .profile-handle {
      color: var(--text-muted);
      font-size: 14px;
      font-family: var(--font-mono);
      margin-top: 2px;
    }
    .profile-bio {
      color: var(--text-secondary);
      font-size: 14px;
      margin-top: 8px;
      line-height: 1.6;
    }
    .profile-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 12px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .profile-meta a {
      color: var(--text-secondary);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.2s;
    }
    .profile-meta a:hover { color: var(--accent); }
    .profile-meta i { width: 14px; height: 14px; }
    .profile-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      background: var(--accent-glow);
      border: 1px solid rgba(220, 60, 60, 0.15);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: border-color 0.2s;
    }
    .tag:hover { border-color: var(--accent); }
    @media (max-width: 480px) {
      .profile { flex-direction: column; align-items: center; text-align: center; }
      .profile-meta { justify-content: center; }
      .profile-tags { justify-content: center; }
    }

    /* Section titles */
    .section-title {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
    }
    .section-title i { width: 16px; height: 16px; color: var(--accent); }
    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* Heatmap card */
    .card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .card::-webkit-scrollbar { height: 6px; }
    .card::-webkit-scrollbar-track { background: transparent; }
    .card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    @media (max-width: 480px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
    }
    .stat {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .stat:hover {
      border-color: var(--border-hover);
      box-shadow: 0 0 24px var(--accent-glow);
    }
    .stat-value {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #ff5555, #dc3c3c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label {
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .stat-label i { width: 13px; height: 13px; stroke-width: 2; }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .legend {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #8b949e;
    }

    /* Share */
    .share-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg-card);
      backdrop-filter: blur(8px);
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn:hover {
      border-color: var(--border-hover);
      box-shadow: 0 0 20px var(--accent-glow);
      transform: translateY(-1px);
    }
    .btn i { width: 15px; height: 15px; stroke-width: 2; flex-shrink: 0; }
    .btn.primary {
      background: linear-gradient(135deg, #dc3c3c, #c13030);
      border-color: transparent;
      color: white;
    }
    .btn.primary:hover {
      background: linear-gradient(135deg, #ff5555, #dc3c3c);
      box-shadow: 0 4px 24px rgba(220, 60, 60, 0.3);
    }

    /* Tooltip */
    .tooltip {
      position: fixed;
      background: #1c2128;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .tooltip .date { font-weight: 600; }
    .tooltip .count { color: #8b949e; }

    /* Insights section */
    .insights {
      margin-top: 20px;
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .insights-toggle {
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      outline: none;
      list-style: none;
      user-select: none;
    }
    .insights-toggle::-webkit-details-marker { display: none; }
    .insights-toggle .chevron {
      margin-left: auto;
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
      color: #8b949e;
    }
    details.insights[open] .insights-toggle .chevron {
      transform: rotate(90deg);
    }
    .insights-toggle i { width: 18px; height: 18px; }

    .insights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 580px) {
      .insights-grid { grid-template-columns: 1fr; }
    }

    .insight-card {
      background: rgba(8, 9, 13, 0.6);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }
    .insight-card h3 {
      font-size: 13px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .insight-card h3 i { width: 14px; height: 14px; }

    /* Chart bars */
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 60px;
    }
    .bar {
      flex: 1;
      background: #c13030;
      border-radius: 2px 2px 0 0;
      min-height: 2px;
      position: relative;
      transition: background 0.15s;
      cursor: pointer;
    }
    .bar:hover { background: #ff4444; }
    .bar-label {
      display: flex;
      gap: 2px;
      margin-top: 4px;
    }
    .bar-label span {
      flex: 1;
      text-align: center;
      font-size: 9px;
      color: #484f58;
    }

    /* Patterns */
    .pattern-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pattern-item {
      font-size: 13px;
      padding: 10px 14px;
      background: rgba(8, 9, 13, 0.5);
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Weekly insight banner */
    .weekly-banner {
      background: linear-gradient(135deg, #1a1215, #1e1012);
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 16px 20px;
      margin-top: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .weekly-banner .wb-label {
      font-size: 13px;
      color: #8b949e;
    }
    .weekly-banner .wb-value {
      font-size: 20px;
      font-weight: 700;
      color: #e6edf3;
    }
    .weekly-banner .wb-trend {
      font-size: 14px;
      font-weight: 600;
    }
    .wb-trend.up { color: #3fb950; }
    .wb-trend.down { color: #f85149; }
    .wb-trend.stable { color: #8b949e; }

    /* Day modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 100;
      padding: 16px;
    }
    .modal-overlay.show { display: flex; }
    .modal {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
      animation: fadeUp 0.25s ease;
    }
    .modal h2 {
      font-size: 18px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .modal h2 i { width: 18px; height: 18px; }
    .modal-close {
      float: right;
      background: none;
      border: none;
      color: #8b949e;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
    }
    .modal-close:hover { color: #e6edf3; }
    .modal-stat {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .modal-stat > div {
      flex: 1;
      text-align: center;
      padding: 10px;
      background: #0d1117;
      border-radius: 8px;
    }
    .modal-stat .ms-val {
      font-size: 20px;
      font-weight: 700;
      color: #ff4444;
    }
    .modal-stat .ms-lbl {
      font-size: 11px;
      color: #8b949e;
      margin-top: 2px;
    }
    .modal-topics {
      list-style: none;
      padding: 0;
    }
    .modal-topics li {
      padding: 8px 0;
      border-bottom: 1px solid #21262d;
      font-size: 13px;
      color: #c9d1d9;
    }
    .modal-topics li:last-child { border-bottom: none; }
    .modal-loading {
      text-align: center;
      padding: 30px;
      color: #8b949e;
    }

    /* Viz tabs */
    .viz-tab.active {
      border-color: #c13030;
      background: #1a1215;
      color: #ff4444;
    }
    
    /* Viz panels */
    .viz-panel canvas {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }

    /* Live indicator */
    .live-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 10px 16px;
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 13px;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3fb950;
      display: inline-block;
      margin-right: 8px;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    .live-dot.offline {
      background: #484f58;
      animation: none;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(63, 185, 80, 0.5); }
      50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(63, 185, 80, 0); }
    }
    .live-status {
      display: flex;
      align-items: center;
      color: #8b949e;
    }
    .live-status.connected { color: #3fb950; }
    .live-count {
      font-weight: 600;
      color: #e6edf3;
    }
    .live-today {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #8b949e;
    }
    .live-today .today-val {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #c13030, #ff4444);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Flash animation for updated cells */
    @keyframes cell-flash {
      0% { filter: brightness(2.5); }
      100% { filter: brightness(1); }
    }
    .cell-flash {
      animation: cell-flash 1s ease-out;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(60px);
      background: #c13030;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      opacity: 0;
      transition: all 0.3s;
      z-index: 20;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* Animate on load */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .card, .stat, .share-row { animation: fadeUp 0.4s ease both; }
    .stat:nth-child(2) { animation-delay: 0.05s; }
    .stat:nth-child(3) { animation-delay: 0.1s; }
    .stat:nth-child(4) { animation-delay: 0.15s; }
  </style>
</head>
<body>
  <div class="container">
    <div class="profile">
      <div class="avatar"><img src="/logo.jpg" alt="Timo"></div>
      <div class="profile-info">
        <div class="profile-name">Timo</div>
        <div class="profile-handle">@timonotdev</div>
        <div class="profile-bio">Developer · AI enthusiast · Building with code & companions</div>
        <div class="profile-meta">
          <a href="https://github.com/eveiljuice" target="_blank"><i data-lucide="github"></i> eveiljuice</a>
          <a href="https://t.me/promptdie" target="_blank"><i data-lucide="send"></i> @promptdie</a>
          <span><i data-lucide="map-pin"></i> Russia</span>
          <span><i data-lucide="calendar"></i> Since Feb 2026</span>
        </div>
        <div class="profile-tags">
          <span class="tag">Go</span>
          <span class="tag">TypeScript</span>
          <span class="tag">Python</span>
          <span class="tag">PHP</span>
          <span class="tag">AI Agents</span>
        </div>
      </div>
    </div>

    <h2 class="section-title"><i data-lucide="activity"></i> Activity</h2>

    <div class="live-bar">
      <div class="live-status" id="live-status">
        <span class="live-dot offline" id="live-dot"></span>
        <span id="live-text">Connecting...</span>
      </div>
      <div class="live-today">
        <i data-lucide="activity" style="width:14px;height:14px;"></i>
        <span>Today:</span>
        <span class="today-val" id="live-today-count">${activity[new Date().toISOString().slice(0, 10)]?.messages || 0}</span>
        <span>msgs</span>
      </div>
    </div>

    <div class="card">${heatmapSvg}</div>

    <div class="footer">
      <div class="legend">
        <span>Less</span>
        ${legendSvg}
        <span>More</span>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${stats.totalDays}</div>
        <div class="stat-label"><i data-lucide="calendar-days"></i> Active Days</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.totalMessages.toLocaleString()}</div>
        <div class="stat-label"><i data-lucide="message-square"></i> Messages</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.currentStreak}</div>
        <div class="stat-label"><i data-lucide="flame"></i> Current Streak</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.longestStreak}</div>
        <div class="stat-label"><i data-lucide="trophy"></i> Best Streak</div>
      </div>
    </div>

    <div class="share-row" style="margin-top: 16px;">
      <button class="btn primary" onclick="copyLink()"><i data-lucide="link"></i> Copy Link</button>
      <a class="btn" href="https://t.me/share/url?url=${encodeURIComponent(BASE_URL)}&text=${encodeURIComponent("My AI activity page — " + stats.totalDays + " days, " + stats.totalMessages + " messages! 🔥")}" target="_blank"><i data-lucide="send"></i> Telegram</a>
      <a class="btn" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(BASE_URL)}&text=${encodeURIComponent("My AI activity page — " + stats.totalDays + " days, " + stats.totalMessages + " messages! 🔥")}" target="_blank"><i data-lucide="twitter"></i> Twitter</a>
      <button class="btn" onclick="downloadSVG()"><i data-lucide="download"></i> Download SVG</button>
    </div>

    <!-- Insights Section (collapsible) -->
    <details class="insights" id="insights-section">
      <summary class="insights-toggle"><i data-lucide="brain"></i> Insights <i data-lucide="chevron-right" class="chevron"></i></summary>
      <div id="insights-content" style="color: #8b949e; font-size: 13px; margin-top: 16px;">Loading...</div>
    </details>

    <!-- Advanced Visualizations -->
    <details class="insights" id="viz-section" style="margin-top: 16px;">
      <summary class="insights-toggle"><i data-lucide="bar-chart-3"></i> Visualizations <i data-lucide="chevron-right" class="chevron"></i></summary>
      <div style="margin-top: 16px;">
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <button class="btn viz-tab active" data-tab="timeline" onclick="showVizTab('timeline')"><i data-lucide="trending-up"></i> Timeline</button>
          <button class="btn viz-tab" data-tab="wordcloud" onclick="showVizTab('wordcloud')"><i data-lucide="cloud"></i> Word Cloud</button>
        </div>
        <div id="viz-timeline" class="viz-panel">
          <canvas id="timelineCanvas" width="680" height="200"></canvas>
        </div>
        <div id="viz-wordcloud" class="viz-panel" style="display:none;">
          <canvas id="wordcloudCanvas" width="680" height="350"></canvas>
        </div>
      </div>
    </details>

    <details style="margin-top: 20px; color: #8b949e; font-size: 13px;">
      <summary style="cursor:pointer; outline:none; display: flex; align-items: center; gap: 6px;"><i data-lucide="code" style="width:14px;height:14px;"></i> Embed in GitHub README</summary>
      <pre style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-top:8px;overflow-x:auto;color:#e6edf3;font-size:12px;">[![ClawPage](${BASE_URL}/badge.svg)](${BASE_URL})</pre>
    </details>
  </div>

  <!-- Day detail modal -->
  <div class="modal-overlay" id="dayModal">
    <div class="modal">
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <h2><i data-lucide="calendar-check"></i> <span id="modal-date"></span></h2>
      <div id="modal-body"><div class="modal-loading">Загрузка...</div></div>
    </div>
  </div>

  <div class="tooltip" id="tip">
    <div class="date" id="tip-date"></div>
    <div class="count" id="tip-count"></div>
  </div>
  <div class="toast" id="toast">Link copied!</div>

  <script>
    const tip = document.getElementById('tip');
    const tipDate = document.getElementById('tip-date');
    const tipCount = document.getElementById('tip-count');

    document.querySelectorAll('rect[data-date]').forEach(r => {
      r.addEventListener('mouseenter', () => {
        tipDate.textContent = r.getAttribute('data-date');
        const c = r.getAttribute('data-count');
        tipCount.textContent = c + ' message' + (c === '1' ? '' : 's');
        tip.style.opacity = '1';
      });
      r.addEventListener('mousemove', e => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = (e.clientY - 40) + 'px';
      });
      r.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    });

    // Touch support for mobile
    document.querySelectorAll('rect[data-date]').forEach(r => {
      r.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        tipDate.textContent = r.getAttribute('data-date');
        const c = r.getAttribute('data-count');
        tipCount.textContent = c + ' message' + (c === '1' ? '' : 's');
        tip.style.opacity = '1';
        tip.style.left = (t.clientX + 14) + 'px';
        tip.style.top = (t.clientY - 50) + 'px';
        setTimeout(() => { tip.style.opacity = '0'; }, 2000);
      });
    });

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    }

    function copyLink() {
      const url = '${BASE_URL}';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showToast('Link copied!');
        } catch (e) {
          showToast('Copy failed — use Ctrl+C');
        }
        document.body.removeChild(ta);
      }
    }

    function downloadSVG() {
      const a = document.createElement('a');
      a.href = '/download.svg';
      a.download = 'clawpage-activity.svg';
      a.click();
    }

    // Initialize Lucide icons
    lucide.createIcons();

    // ===== INSIGHTS =====
    async function loadInsights() {
      try {
        const res = await fetch('/api/insights');
        const data = await res.json();
        renderInsights(data);
      } catch (e) {
        document.getElementById('insights-content').textContent = 'Failed to load insights';
      }
    }

    function renderInsights(data) {
      const el = document.getElementById('insights-content');

      // Build hourly chart
      const maxH = Math.max(...data.hourly.map(h => h.count), 1);
      const hourBars = data.hourly.map(h =>
        '<div class="bar" style="height:' + Math.max((h.count / maxH) * 100, 3) + '%" title="' + h.hour + ':00 — ' + h.count + ' messages"></div>'
      ).join('');
      const hourLabels = data.hourly.map((h, i) =>
        '<span>' + (i % 3 === 0 ? h.hour : '') + '</span>'
      ).join('');

      // Build day-of-week chart
      const maxD = Math.max(...data.dayOfWeek.map(d => d.avgMessages), 1);
      const dayBars = data.dayOfWeek.map(d =>
        '<div class="bar" style="height:' + Math.max((d.avgMessages / maxD) * 100, 3) + '%;min-width:28px" title="' + d.day + ' — avg ' + d.avgMessages + ' messages"></div>'
      ).join('');
      const dayLabels = data.dayOfWeek.map(d =>
        '<span style="min-width:28px">' + d.day + '</span>'
      ).join('');

      // Patterns
      const patternsHtml = data.patterns.map(p => {
        const parts = p.split('|');
        const text = parts[0];
        const icon = parts[1] || 'zap';
        return '<li class="pattern-item"><i data-lucide="' + icon + '" style="width:14px;height:14px;flex-shrink:0"></i> ' + text + '</li>';
      }).join('');

      // Weekly banner
      let weeklyHtml = '';
      if (data.weeklyInsight) {
        const w = data.weeklyInsight;
        const trendIcon = w.trend === 'up' ? '↑' : w.trend === 'down' ? '↓' : '→';
        const trendText = w.trendPercent > 0 ? '+' + w.trendPercent + '%' : w.trendPercent + '%';
        weeklyHtml = '<div class="weekly-banner">' +
          '<div><div class="wb-label">This Week</div><div class="wb-value">' + w.totalMessages + ' msgs</div></div>' +
          '<div><div class="wb-label">Avg / Day</div><div class="wb-value">' + w.avgPerDay + '</div></div>' +
          '<div><div class="wb-label">Most Active</div><div class="wb-value">' + w.mostActiveDay + '</div></div>' +
          '<div><div class="wb-label">Trend</div><div class="wb-trend ' + w.trend + '">' + trendIcon + ' ' + trendText + '</div></div>' +
          '</div>';
      }

      el.innerHTML =
        '<div class="insights-grid">' +
          '<div class="insight-card">' +
            '<h3><i data-lucide="clock"></i> Hourly Activity (Yekaterinburg)</h3>' +
            '<div class="bar-chart">' + hourBars + '</div>' +
            '<div class="bar-label">' + hourLabels + '</div>' +
          '</div>' +
          '<div class="insight-card">' +
            '<h3><i data-lucide="calendar-range"></i> By Day of Week (avg)</h3>' +
            '<div class="bar-chart">' + dayBars + '</div>' +
            '<div class="bar-label">' + dayLabels + '</div>' +
          '</div>' +
        '</div>' +
        (patternsHtml ? '<div style="margin-top:16px"><h3 style="font-size:13px;color:#8b949e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i data-lucide="sparkles" style="width:14px;height:14px"></i> Patterns</h3><ul class="pattern-list">' + patternsHtml + '</ul></div>' : '') +
        weeklyHtml;

      // Re-init lucide for new icons
      lucide.createIcons();
    }

    loadInsights();

    // ===== DAY MODAL =====
    // Make heatmap cells clickable
    document.querySelectorAll('rect[data-date]').forEach(r => {
      r.style.cursor = 'pointer';
      r.addEventListener('click', () => {
        const date = r.getAttribute('data-date');
        const count = r.getAttribute('data-count');
        if (parseInt(count) > 0) {
          openDayModal(date);
        }
      });
    });

    async function openDayModal(date) {
      const modal = document.getElementById('dayModal');
      document.getElementById('modal-date').textContent = date;
      document.getElementById('modal-body').innerHTML = '<div class="modal-loading">Loading...</div>';
      modal.classList.add('show');

      try {
        const res = await fetch('/api/day/' + date);
        const data = await res.json();
        renderDayModal(data);
      } catch (e) {
        document.getElementById('modal-body').innerHTML = '<div class="modal-loading">No data</div>';
      }
    }

    function renderDayModal(data) {
      const body = document.getElementById('modal-body');

      // Mini hourly chart
      const maxH = Math.max(...data.hourlyBreakdown, 1);
      const bars = data.hourlyBreakdown.map((c, i) =>
        '<div class="bar" style="height:' + Math.max((c / maxH) * 100, 2) + '%" title="' + i + ':00 — ' + c + '"></div>'
      ).join('');

      const topicsHtml = data.topics.map(t =>
        '<li>' + escapeHtml(t) + '</li>'
      ).join('');

      body.innerHTML =
        '<div class="modal-stat">' +
          '<div><div class="ms-val">' + data.messages + '</div><div class="ms-lbl">Messages</div></div>' +
          '<div><div class="ms-val">' + data.peakHour + ':00</div><div class="ms-lbl">Peak Hour</div></div>' +
        '</div>' +
        '<div style="margin-bottom:16px">' +
          '<div style="font-size:12px;color:#8b949e;margin-bottom:6px">Hourly activity</div>' +
          '<div class="bar-chart" style="height:40px">' + bars + '</div>' +
        '</div>' +
        (topicsHtml ? '<div><div style="font-size:12px;color:#8b949e;margin-bottom:8px;display:flex;align-items:center;gap:4px"><i data-lucide="message-circle" style="width:12px;height:12px"></i> What we talked about</div><ul class="modal-topics">' + topicsHtml + '</ul></div>' : '');

      lucide.createIcons();
    }

    function closeModal() {
      document.getElementById('dayModal').classList.remove('show');
    }

    // Close on overlay click
    document.getElementById('dayModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // ===== VIZ DATA =====
    const activityData = ${JSON.stringify(activity)};

    // ===== WEBSOCKET LIVE UPDATES =====
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws = null;
    let wsReconnectTimer = null;

    function connectWS() {
      ws = new WebSocket(wsProto + '//' + location.host + '/ws');
      
      ws.onopen = () => {
        document.getElementById('live-dot').classList.remove('offline');
        document.getElementById('live-status').classList.add('connected');
        document.getElementById('live-text').textContent = 'Live';
      };

      ws.onclose = () => {
        document.getElementById('live-dot').classList.add('offline');
        document.getElementById('live-status').classList.remove('connected');
        document.getElementById('live-text').textContent = 'Reconnecting...';
        wsReconnectTimer = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => { ws.close(); };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        
        if (data.type === 'online') {
          const viewers = data.count;
          document.getElementById('live-text').textContent = 'Live · ' + viewers + ' viewer' + (viewers !== 1 ? 's' : '');
        }

        if (data.type === 'activity_update') {
          // Update today's count
          document.getElementById('live-today-count').textContent = data.todayMessages;
          
          // Flash today's heatmap cell
          const todayCell = document.querySelector('rect[data-date="' + data.today + '"]');
          if (todayCell) {
            const colors = ['#2d333b', '#5c1a1a', '#8b2525', '#c13030', '#ff4444'];
            todayCell.setAttribute('fill', colors[data.todayLevel]);
            todayCell.setAttribute('data-count', data.todayMessages);
            todayCell.classList.remove('cell-flash');
            void todayCell.offsetWidth; // trigger reflow
            todayCell.classList.add('cell-flash');
            
            // Update tooltip title
            const title = todayCell.querySelector('title');
            if (title) title.textContent = data.today + ': ' + data.todayMessages + ' msgs';
          }

          // Update stat cards
          const statValues = document.querySelectorAll('.stat-value');
          if (statValues.length >= 4) {
            statValues[0].textContent = data.stats.totalDays;
            statValues[1].textContent = data.stats.totalMessages.toLocaleString();
            statValues[2].textContent = data.stats.currentStreak;
            statValues[3].textContent = data.stats.longestStreak;
          }
        }
      };
    }

    connectWS();

    // Periodic ping to keep alive
    setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 30000);

    // ===== VIZ TABS =====
    function showVizTab(tab) {
      document.querySelectorAll('.viz-tab').forEach(b => b.classList.remove('active'));
      document.querySelector('.viz-tab[data-tab="' + tab + '"]').classList.add('active');
      document.querySelectorAll('.viz-panel').forEach(p => p.style.display = 'none');
      document.getElementById('viz-' + tab).style.display = '';
      if (tab === 'timeline') loadTimeline();
      if (tab === 'wordcloud') loadWordCloud();
    }

    // ===== TIMELINE =====
    let timelineLoaded = false;
    async function loadTimeline() {
      if (timelineLoaded) return;
      try {
        const res = await fetch('/api/timeline');
        const data = await res.json();
        renderTimeline(data);
        timelineLoaded = true;
      } catch (e) {}
    }

    function renderTimeline(data) {
      const canvas = document.getElementById('timelineCanvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.parentElement.clientWidth - 40;
      const h = 200;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);

      const pad = { top: 20, right: 20, bottom: 30, left: 40 };
      const chartW = w - pad.left - pad.right;
      const chartH = h - pad.top - pad.bottom;
      const maxVal = Math.max(...data.map(d => d.messages), 1);

      // Grid lines
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = '#484f58';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), pad.left - 6, y + 4);
      }

      // Area + line
      const stepX = chartW / Math.max(data.length - 1, 1);

      // Area fill
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + chartH);
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + i * stepX;
        const y = pad.top + chartH - (data[i].messages / maxVal) * chartH;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(pad.left + (data.length - 1) * stepX, pad.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, 'rgba(193, 48, 48, 0.4)');
      grad.addColorStop(1, 'rgba(193, 48, 48, 0.02)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = '#c13030';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + i * stepX;
        const y = pad.top + chartH - (data[i].messages / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Dots
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + i * stepX;
        const y = pad.top + chartH - (data[i].messages / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = data[i].messages > 0 ? '#ff4444' : '#2d333b';
        ctx.fill();
        ctx.strokeStyle = '#0d1117';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Date labels
      ctx.fillStyle = '#8b949e';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const labelEvery = Math.max(1, Math.floor(data.length / 8));
      for (let i = 0; i < data.length; i += labelEvery) {
        const x = pad.left + i * stepX;
        const label = data[i].date.slice(5); // MM-DD
        ctx.fillText(label, x, h - 8);
      }
    }

    // Load timeline on vizualization section open
    document.getElementById('viz-section').addEventListener('toggle', function() {
      if (this.open) loadTimeline();
    });

    // ===== WORDCLOUD =====
    let wordcloudLoaded = false;
    async function loadWordCloud() {
      if (wordcloudLoaded) return;
      try {
        const res = await fetch('/api/wordcloud');
        const data = await res.json();
        renderWordCloud(data);
        wordcloudLoaded = true;
      } catch (e) {}
    }

    function renderWordCloud(words) {
      const canvas = document.getElementById('wordcloudCanvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.parentElement.clientWidth - 40;
      const h = 350;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);

      if (!words.length) return;

      const maxCount = words[0].count;
      const minSize = 11;
      const maxSize = 42;

      // Simple spiral placement
      const placed = [];
      const cx = w / 2;
      const cy = h / 2;
      const colors = ['#ff4444', '#c13030', '#e6edf3', '#8b949e', '#ff6b6b', '#c9d1d9', '#f0883e', '#a371f7', '#3fb950', '#79c0ff'];

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const size = minSize + ((word.count / maxCount) * (maxSize - minSize));
        ctx.font = 'bold ' + Math.round(size) + 'px -apple-system, BlinkMacSystemFont, sans-serif';
        const metrics = ctx.measureText(word.word);
        const tw = metrics.width;
        const th = size;

        // Spiral search for position
        let placed_ok = false;
        for (let t = 0; t < 600; t++) {
          const angle = t * 0.15;
          const radius = 3 + t * 0.6;
          const x = cx + radius * Math.cos(angle) - tw / 2;
          const y = cy + radius * Math.sin(angle) + th / 3;

          // Check bounds
          if (x < 4 || x + tw > w - 4 || y - th < 4 || y > h - 4) continue;

          // Check overlap
          const box = { x, y: y - th, w: tw + 4, h: th + 2 };
          let overlaps = false;
          for (const p of placed) {
            if (box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y) {
              overlaps = true;
              break;
            }
          }
          if (overlaps) continue;

          ctx.fillStyle = colors[i % colors.length];
          ctx.fillText(word.word, x, y);
          placed.push(box);
          placed_ok = true;
          break;
        }
      }
    }
  </script>
</body>
</html>`;
}

/** Build a user profile page with dynamic data */
function buildUserPage(
  user: UserProfile,
  activity: Record<string, { messages: number; level?: number }>,
  stats: { totalDays: number; totalMessages: number; currentStreak: number; longestStreak: number }
): string {
  // Compute levels for the activity data
  const counts = Object.values(activity).map((d) => d.messages);
  const max = Math.max(...counts, 1);
  const enriched: Record<string, { messages: number; level: number }> = {};
  for (const [date, data] of Object.entries(activity)) {
    const ratio = data.messages / max;
    let level = 0;
    if (ratio > 0) level = 1;
    if (ratio > 0.25) level = 2;
    if (ratio > 0.5) level = 3;
    if (ratio > 0.75) level = 4;
    enriched[date] = { messages: data.messages, level };
  }

  const heatmapSvg = renderHeatmap(enriched);
  const legendSvg = renderLegend();

  // Build links HTML
  const linksHtml = (user.links || [])
    .map((l) => {
      const icon = l.type === "github" ? "github" : l.type === "telegram" ? "send" : "link";
      return `<a href="${l.value}" target="_blank"><i data-lucide="${icon}"></i> ${l.type}</a>`;
    })
    .join("");

  const tagsHtml = (user.tags || [])
    .map((t) => `<span class="tag">${t}</span>`)
    .join("");

  // Reuse the same page template but with user data
  const page = buildPage();

  // Replace profile data
  return page
    .replace(/<title>.*?<\/title>/, `<title>${user.displayName} — AI Activity</title>`)
    .replace(/content="Timo — AI Activity[^"]*"/, `content="${user.displayName} — AI Activity · ${stats.totalDays} days"`)
    .replace(/>Timo</, `>${user.displayName}<`)
    .replace(/@timonotdev</, `@${user.username}<`)
    .replace(
      /Developer · AI enthusiast · Building with code &amp; companions/,
      user.bio.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "AI Activity Tracker"
    );
}

/** Build landing page */
function buildLanding(): string {
  const users = listUsers();
  const totalMessages = users.reduce((s, u) => s + getUserStats(u.username).totalMessages, 0);
  const totalDays = users.reduce((s, u) => s + getUserStats(u.username).totalDays, 0);

  const userCards = users.map((u) => {
    const stats = getUserStats(u.username);
    return `
      <a href="/u/${u.username}" class="user-card">
        <div class="uc-avatar">${u.displayName.charAt(0).toUpperCase()}</div>
        <div class="uc-body">
          <div class="uc-name">${u.displayName}</div>
          <div class="uc-handle">@${u.username}</div>
          <div class="uc-bio">${u.bio || ""}</div>
        </div>
        <div class="uc-right">
          <div class="uc-streak">${stats.currentStreak}<span>🔥</span></div>
          <div class="uc-msgs">${stats.totalMessages.toLocaleString()} messages</div>
          <div class="uc-days">${stats.totalDays} active days</div>
        </div>
      </a>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClawPage — Your AI Activity Page</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;800;900&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js"></script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-deep: #08090d;
      --bg-surface: #0f1117;
      --bg-card: rgba(17, 19, 27, 0.7);
      --border: rgba(255, 255, 255, 0.06);
      --border-hover: rgba(220, 60, 60, 0.4);
      --text-primary: #eaedf3;
      --text-secondary: #7a8299;
      --text-muted: #454d64;
      --accent: #dc3c3c;
      --accent-glow: rgba(220, 60, 60, 0.15);
      --accent-amber: #f0883e;
      --font-display: 'Urbanist', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    body {
      background: var(--bg-deep);
      color: var(--text-primary);
      font-family: var(--font-body);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Dot grid background */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
      background-size: 32px 32px;
      pointer-events: none;
      z-index: 0;
    }

    /* Radial glow */
    body::after {
      content: '';
      position: fixed;
      top: -20%;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 600px;
      background: radial-gradient(ellipse, rgba(220, 60, 60, 0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .page { position: relative; z-index: 1; }

    /* Hero */
    .hero {
      text-align: center;
      padding: 80px 24px 60px;
      max-width: 700px;
      margin: 0 auto;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--accent-glow);
      border: 1px solid rgba(220, 60, 60, 0.2);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 24px;
      font-family: var(--font-body);
    }
    .hero-badge i { width: 14px; height: 14px; }

    .hero h1 {
      font-family: var(--font-display);
      font-size: clamp(36px, 6vw, 56px);
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -1.5px;
      margin-bottom: 20px;
    }
    .hero h1 .gradient {
      background: linear-gradient(135deg, #ff5555, #dc3c3c, #f0883e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      background-size: 200% 200%;
      animation: gradient-shift 6s ease infinite;
    }
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .hero p {
      font-size: 17px;
      line-height: 1.7;
      color: var(--text-secondary);
      max-width: 500px;
      margin: 0 auto 40px;
    }

    /* Global stats */
    .global-stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 60px;
    }
    .gs-item {
      text-align: center;
    }
    .gs-val {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .gs-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    /* Content area */
    .content {
      max-width: 640px;
      margin: 0 auto;
      padding: 0 24px 80px;
    }

    /* Section */
    .section-label {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-label i { width: 14px; height: 14px; }
    .section-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* Terminal box */
    .terminal {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 0;
      margin-bottom: 40px;
      overflow: hidden;
    }
    .terminal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
    }
    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .terminal-dot.r { background: #ff5f57; }
    .terminal-dot.y { background: #febc2e; }
    .terminal-dot.g { background: #28c840; }
    .terminal-title {
      flex: 1;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .terminal-body {
      padding: 20px 22px;
    }
    .cmd-line {
      font-family: var(--font-mono);
      font-size: 13px;
      padding: 8px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cmd-line .prompt {
      color: var(--accent);
      user-select: none;
    }
    .cmd-line .text { color: var(--text-primary); }
    .cmd-line .flag { color: var(--accent-amber); }
    .cmd-line .comment {
      color: var(--text-muted);
      font-size: 12px;
    }

    /* Feature grid */
    .features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 48px;
    }
    @media (max-width: 500px) {
      .features { grid-template-columns: 1fr; }
    }
    .feature {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .feature:hover {
      border-color: var(--border-hover);
      box-shadow: 0 0 30px var(--accent-glow);
    }
    .feature-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      background: var(--accent-glow);
    }
    .feature-icon i { width: 16px; height: 16px; color: var(--accent); }
    .feature h3 {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .feature p {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* User cards */
    .user-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 14px;
      text-decoration: none;
      color: var(--text-primary);
      margin-bottom: 10px;
      transition: all 0.25s ease;
    }
    .user-card:hover {
      border-color: var(--border-hover);
      box-shadow: 0 4px 40px var(--accent-glow);
      transform: translateY(-2px);
    }
    .uc-avatar {
      width: 48px; height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #dc3c3c, #f0883e);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 20px;
      flex-shrink: 0;
      color: white;
    }
    .uc-body { flex: 1; min-width: 0; }
    .uc-name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 16px;
    }
    .uc-handle {
      color: var(--text-muted);
      font-size: 13px;
      font-family: var(--font-mono);
    }
    .uc-bio {
      color: var(--text-secondary);
      font-size: 12px;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .uc-right {
      text-align: right;
      flex-shrink: 0;
    }
    .uc-streak {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 800;
      line-height: 1;
    }
    .uc-streak span { font-size: 16px; }
    .uc-msgs {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .uc-days {
      font-size: 11px;
      color: var(--text-muted);
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 14px;
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: 14px;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 40px 24px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .footer a { color: var(--text-secondary); text-decoration: none; }
    .footer a:hover { color: var(--accent); }

    /* Fade-in animation */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade { animation: fade-up 0.5s ease both; }
    .fade-d1 { animation-delay: 0.1s; }
    .fade-d2 { animation-delay: 0.2s; }
    .fade-d3 { animation-delay: 0.3s; }
    .fade-d4 { animation-delay: 0.4s; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero fade">
      <div class="hero-badge"><i data-lucide="zap"></i> Open Source</div>
      <h1>Your Personal<br><span class="gradient">AI Activity Page</span></h1>
      <p>GitHub-style heatmap for your AI companion. Connect your agent, track every conversation, and build your streak.</p>
    </div>

    <div class="global-stats fade fade-d1">
      <div class="gs-item">
        <div class="gs-val">${users.length}</div>
        <div class="gs-label">Users</div>
      </div>
      <div class="gs-item">
        <div class="gs-val">${totalMessages.toLocaleString()}</div>
        <div class="gs-label">Messages</div>
      </div>
      <div class="gs-item">
        <div class="gs-val">${totalDays}</div>
        <div class="gs-label">Active Days</div>
      </div>
    </div>

    <div class="content">
      <div class="section-label fade fade-d1"><i data-lucide="terminal"></i> Quick Start</div>

      <div class="terminal fade fade-d2">
        <div class="terminal-header">
          <div class="terminal-dot r"></div>
          <div class="terminal-dot y"></div>
          <div class="terminal-dot g"></div>
          <div class="terminal-title">~/ clawpage</div>
        </div>
        <div class="terminal-body">
          <div class="cmd-line">
            <span class="prompt">$</span>
            <span class="text">bun run src/cli.ts register</span>
            <span class="flag">--username</span>
            <span class="text">myname</span>
          </div>
          <div class="cmd-line">
            <span class="prompt">$</span>
            <span class="text">bun run src/cli.ts sync</span>
            <span class="comment"># reads your session logs</span>
          </div>
          <div class="cmd-line">
            <span class="prompt">$</span>
            <span class="text">bun run src/cli.ts status</span>
          </div>
          <div class="cmd-line" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
            <span class="comment" style="color: var(--accent);">→</span>
            <span class="comment">🔥 12 day streak · 847 messages · clawpage.dev/u/myname</span>
          </div>
        </div>
      </div>

      <div class="section-label fade fade-d2"><i data-lucide="layers"></i> Features</div>

      <div class="features fade fade-d3">
        <div class="feature">
          <div class="feature-icon"><i data-lucide="grid-3x3"></i></div>
          <h3>Activity Heatmap</h3>
          <p>GitHub-style grid showing your daily AI conversations</p>
        </div>
        <div class="feature">
          <div class="feature-icon"><i data-lucide="radio"></i></div>
          <h3>Live Updates</h3>
          <p>WebSocket-powered real-time activity tracking</p>
        </div>
        <div class="feature">
          <div class="feature-icon"><i data-lucide="brain"></i></div>
          <h3>AI Insights</h3>
          <p>Patterns, peak hours, and weekly trends</p>
        </div>
        <div class="feature">
          <div class="feature-icon"><i data-lucide="terminal"></i></div>
          <h3>CLI First</h3>
          <p>Register, sync, and manage from your terminal</p>
        </div>
      </div>

      ${users.length > 0 ? `
      <div class="section-label fade fade-d3"><i data-lucide="users"></i> Active Users</div>
      <div class="fade fade-d4">${userCards}</div>
      ` : `
      <div class="empty-state fade fade-d3">
        No users yet. Be the first to connect your agent.
      </div>`}
    </div>

    <div class="footer">
      Powered by <a href="https://github.com/openclaw/openclaw">OpenClaw</a> · 
      <a href="https://github.com/eveiljuice/clawpage">Source</a>
    </div>
  </div>
  <script>lucide.createIcons();</script>
</body>
</html>`;
}

// Track connected WebSocket clients
const wsClients = new Set<any>();

// Watch activity.json for changes and broadcast
import { watch } from "fs";
const ACTIVITY_PATH = join(import.meta.dir, "..", "activity.json");
let lastBroadcast = 0;

watch(ACTIVITY_PATH, () => {
  const now = Date.now();
  if (now - lastBroadcast < 2000) return; // debounce 2s
  lastBroadcast = now;
  try {
    const activity = loadActivity();
    const stats = getStats(activity);
    const today = new Date().toISOString().slice(0, 10);
    const todayData = activity[today] || { messages: 0, level: 0 };
    const payload = JSON.stringify({
      type: "activity_update",
      today,
      todayMessages: todayData.messages,
      todayLevel: todayData.level,
      stats,
      timestamp: Date.now(),
    });
    for (const ws of wsClients) {
      try { ws.send(payload); } catch {}
    }
  } catch {}
});

// Broadcast online count to all clients
function broadcastOnline() {
  const payload = JSON.stringify({ type: "online", count: wsClients.size });
  for (const ws of wsClients) {
    try { ws.send(payload); } catch {}
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined as any;
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Multi-user API
    if (url.pathname === "/api/register" && req.method === "POST") {
      return handleRegister(req);
    }
    if (url.pathname === "/api/push" && req.method === "POST") {
      return handlePush(req);
    }
    if (url.pathname === "/api/profile" && req.method === "PATCH") {
      return handleUpdateProfile(req);
    }
    if (url.pathname === "/api/users") {
      return handleListUsers();
    }
    if (url.pathname.match(/^\/api\/profile\/[^/]+$/)) {
      const username = url.pathname.split("/").pop()!;
      return handleGetProfile(username);
    }
    if (url.pathname.match(/^\/api\/activity\/[^/]+$/)) {
      const username = url.pathname.split("/").pop()!;
      return handleGetActivity(username);
    }

    if (url.pathname === "/api/activity") {
      return new Response(JSON.stringify(loadActivity()), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (url.pathname === "/api/insights") {
      const insights = getInsights();
      return new Response(JSON.stringify(insights), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (url.pathname.startsWith("/api/day/")) {
      const date = url.pathname.replace("/api/day/", "");
      const summary = getDaySummary(date);
      if (!summary) {
        return new Response(JSON.stringify({ error: "No data for this date" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(summary), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (url.pathname === "/api/wordcloud") {
      const words = getWordCloud();
      return new Response(JSON.stringify(words), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (url.pathname === "/api/timeline") {
      const timeline = getTimeline();
      return new Response(JSON.stringify(timeline), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (url.pathname === "/download.svg") {
      const activity = loadActivity();
      const stats = getStats(activity);
      const svg = renderExportCard(activity, stats);
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": "attachment; filename=\"clawpage-activity.svg\"",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (url.pathname === "/og.svg") {
      const activity = loadActivity();
      const svg = renderHeatmap(activity, { standalone: true });
      return new Response(svg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
      });
    }

    if (url.pathname === "/badge.svg") {
      const activity = loadActivity();
      const stats = getStats(activity);
      const svg = renderBadge(stats.totalDays, stats.totalMessages);
      return new Response(svg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
      });
    }

    // Static files from public/
    const ext = url.pathname.match(/\.\w+$/)?.[0] || "";
    if (ext && MIME[ext]) {
      const filePath = join(PUBLIC_DIR, url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": MIME[ext], "Cache-Control": "public, max-age=86400" },
        });
      }
    }

    // User profile page: /u/:username
    const userMatch = url.pathname.match(/^\/u\/([a-zA-Z0-9_-]+)$/);
    if (userMatch) {
      const username = userMatch[1].toLowerCase();
      const user = getUser(username);
      if (!user) {
        return new Response("User not found", { status: 404 });
      }
      const userActivity = getAllActivity(username);
      const userStats = getUserStats(username);
      return new Response(buildUserPage(user, userActivity, userStats), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Landing page
    if (url.pathname === "/") {
      return new Response(buildLanding(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Legacy: default to existing single-user page
    return new Response(buildPage(), {
      headers: { "Content-Type": "text/html" },
    });
  },
  websocket: {
    open(ws: any) {
      wsClients.add(ws);
      broadcastOnline();
    },
    close(ws: any) {
      wsClients.delete(ws);
      broadcastOnline();
    },
    message(ws: any, msg: any) {
      // Client can request current state
      if (msg === "ping") {
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      }
    },
  },
});

console.log(`🐾 ClawPage running at http://localhost:${PORT}`);
