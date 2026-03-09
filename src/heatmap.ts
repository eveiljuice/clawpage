import { type ActivityMap, getColors, fmt } from "./data";

const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const DAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const LABEL_W = 32;
const HEADER_H = 20;

interface HeatmapOptions {
  standalone?: boolean; // for OG image — includes background
}

export function renderHeatmap(
  activity: ActivityMap,
  opts: HeatmapOptions = {}
): string {
  const colors = getColors();
  const startDate = new Date("2026-02-20");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const dayOfWeek = start.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setUTCDate(start.getUTCDate() + mondayOffset);

  const weeks: { date: Date; day: number }[][] = [];
  const d = new Date(start);
  let currentWeek: { date: Date; day: number }[] = [];

  while (d <= today) {
    const dow = d.getUTCDay();
    const row = dow === 0 ? 6 : dow - 1;
    currentWeek.push({ date: new Date(d), day: row });
    if (row === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (currentWeek.length) weeks.push(currentWeek);

  const totalWeeks = weeks.length;
  const contentW = LABEL_W + totalWeeks * STEP;
  const contentH = HEADER_H + 7 * STEP;
  const pad = opts.standalone ? 40 : 0;
  const svgW = contentW + pad * 2;
  const svgH = contentH + pad * 2 + (opts.standalone ? 50 : 0);

  let bg = "";
  let title = "";
  if (opts.standalone) {
    bg = `<rect width="${svgW}" height="${svgH}" fill="#0d1117" rx="12"/>`;
    title = `<text x="${pad}" y="${pad - 10}" fill="#e6edf3" font-size="18" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">🐾 ClawPage</text>`;
  }

  let cells = "";
  let monthLabels = "";
  let lastMonth = -1;

  for (let w = 0; w < weeks.length; w++) {
    for (const cell of weeks[w]) {
      const key = fmt(cell.date);
      const data = activity[key];
      const level = data ? data.level : 0;
      const msgs = data ? data.messages : 0;
      const color = colors[level];
      const x = pad + LABEL_W + w * STEP;
      const y = pad + HEADER_H + cell.day * STEP;

      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${color}" data-date="${key}" data-count="${msgs}"><title>${key}: ${msgs} msgs</title></rect>\n`;

      const month = cell.date.getUTCMonth();
      if (month !== lastMonth && cell.day === 0) {
        monthLabels += `<text x="${x}" y="${pad + 12}" class="label">${MONTHS[month]}</text>\n`;
        lastMonth = month;
      }
    }
  }

  let dayLabels = "";
  for (let i = 0; i < 7; i++) {
    if (DAYS[i]) {
      dayLabels += `<text x="${pad}" y="${pad + HEADER_H + i * STEP + CELL - 2}" class="label">${DAYS[i]}</text>\n`;
    }
  }

  return `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .label { fill: #8b949e; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    rect[data-date] { shape-rendering: geometricPrecision; }
    rect[data-date]:hover { stroke: #fff; stroke-width: 1.5; }
  </style>
  ${bg}
  ${title}
  ${monthLabels}
  ${dayLabels}
  ${cells}
</svg>`;
}

export function renderLegend(): string {
  const colors = getColors();
  let rects = "";
  for (let i = 0; i < 5; i++) {
    rects += `<rect x="${i * STEP}" y="0" width="${CELL}" height="${CELL}" rx="2" fill="${colors[i]}"/>`;
  }
  return `<svg width="${5 * STEP}" height="${CELL}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

/**
 * Full export card — heatmap + stats + legend + branding.
 * Used for "Download SVG" button.
 */
export function renderExportCard(
  activity: ActivityMap,
  stats: { totalDays: number; totalMessages: number; currentStreak: number; longestStreak: number }
): string {
  const colors = getColors();
  const startDate = new Date("2026-02-20");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const dayOfWeek = start.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setUTCDate(start.getUTCDate() + mondayOffset);

  const weeks: { date: Date; day: number }[][] = [];
  const d = new Date(start);
  let currentWeek: { date: Date; day: number }[] = [];

  while (d <= today) {
    const dow = d.getUTCDay();
    const row = dow === 0 ? 6 : dow - 1;
    currentWeek.push({ date: new Date(d), day: row });
    if (row === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (currentWeek.length) weeks.push(currentWeek);

  const CELL = 13;
  const GAP = 3;
  const STEP = CELL + GAP;
  const LABEL_W = 32;
  const HEADER_H = 20;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["Mon","","Wed","","Fri","","Sun"];

  const totalWeeks = weeks.length;
  const heatmapW = LABEL_W + totalWeeks * STEP;
  const heatmapH = HEADER_H + 7 * STEP;

  const pad = 32;
  const titleH = 60;
  const statsH = 70;
  const legendH = 30;
  const footerH = 30;
  const svgW = Math.max(heatmapW + pad * 2, 520);
  const svgH = titleH + heatmapH + statsH + legendH + footerH + pad * 2;

  const heatmapX = pad;
  const heatmapY = titleH + pad;

  // Heatmap cells
  let cells = "";
  let monthLabels = "";
  let lastMonth = -1;

  for (let w = 0; w < weeks.length; w++) {
    for (const cell of weeks[w]) {
      const key = cell.date.toISOString().slice(0, 10);
      const data = activity[key];
      const level = data ? data.level : 0;
      const msgs = data ? data.messages : 0;
      const color = colors[level];
      const x = heatmapX + LABEL_W + w * STEP;
      const y = heatmapY + HEADER_H + cell.day * STEP;
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${color}"/>`;

      const month = cell.date.getUTCMonth();
      if (month !== lastMonth && cell.day === 0) {
        monthLabels += `<text x="${x}" y="${heatmapY + 12}" class="label">${MONTHS[month]}</text>`;
        lastMonth = month;
      }
    }
  }

  let dayLabels = "";
  for (let i = 0; i < 7; i++) {
    if (DAYS[i]) {
      dayLabels += `<text x="${heatmapX}" y="${heatmapY + HEADER_H + i * STEP + CELL - 2}" class="label">${DAYS[i]}</text>`;
    }
  }

  // Stats
  const statsY = heatmapY + heatmapH + 20;
  const statItems = [
    { label: "Active Days", value: String(stats.totalDays) },
    { label: "Messages", value: stats.totalMessages.toLocaleString() },
    { label: "Current Streak", value: String(stats.currentStreak) },
    { label: "Best Streak", value: String(stats.longestStreak) },
  ];
  const statW = (svgW - pad * 2) / 4;
  let statsGroup = "";
  for (let i = 0; i < statItems.length; i++) {
    const sx = pad + i * statW;
    statsGroup += `
      <rect x="${sx}" y="${statsY}" width="${statW - 8}" height="50" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1"/>
      <text x="${sx + (statW - 8) / 2}" y="${statsY + 22}" text-anchor="middle" fill="#ff4444" font-size="18" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${statItems[i].value}</text>
      <text x="${sx + (statW - 8) / 2}" y="${statsY + 40}" text-anchor="middle" fill="#8b949e" font-size="9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" text-transform="uppercase" letter-spacing="0.5">${statItems[i].label}</text>`;
  }

  // Legend
  const legendY = statsY + 60;
  let legendRects = "";
  for (let i = 0; i < 5; i++) {
    legendRects += `<rect x="${pad + 30 + i * STEP}" y="${legendY}" width="${CELL}" height="${CELL}" rx="2" fill="${colors[i]}"/>`;
  }

  // Footer
  const footerY = svgH - pad;

  return `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .label { fill: #8b949e; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  </style>
  <rect width="${svgW}" height="${svgH}" fill="#0d1117" rx="12"/>
  
  <!-- Title -->
  <text x="${pad}" y="${pad + 24}" fill="#e6edf3" font-size="20" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">🐾 ClawPage</text>
  <text x="${pad}" y="${pad + 44}" fill="#8b949e" font-size="12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">Since Feb 20, 2026 · AI companion heatmap</text>
  
  <!-- Heatmap -->
  ${monthLabels}
  ${dayLabels}
  ${cells}
  
  <!-- Stats -->
  ${statsGroup}
  
  <!-- Legend -->
  <text x="${pad}" y="${legendY + 11}" class="label">Less</text>
  ${legendRects}
  <text x="${pad + 30 + 5 * STEP + 4}" y="${legendY + 11}" class="label">More</text>
  
  <!-- Footer -->
  <text x="${svgW / 2}" y="${footerY}" text-anchor="middle" fill="#484f58" font-size="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${new Date().toISOString().slice(0, 10)} · clawpage.dev</text>
</svg>`;
}

export function renderBadge(totalDays: number, totalMessages: number): string {
  const leftW = 90;
  const rightW = 120;
  const w = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20">
  <linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="a"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h${leftW}v20H0z"/>
    <path fill="#c13030" d="M${leftW} 0h${rightW}v20H${leftW}z"/>
    <path fill="url(#b)" d="M0 0h${w}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftW / 2}" y="15" fill="#010101" fill-opacity=".3">🐾 ClawPage</text>
    <text x="${leftW / 2}" y="14">🐾 ClawPage</text>
    <text x="${leftW + rightW / 2}" y="15" fill="#010101" fill-opacity=".3">${totalDays} days · ${totalMessages} msgs</text>
    <text x="${leftW + rightW / 2}" y="14">${totalDays} days · ${totalMessages} msgs</text>
  </g>
</svg>`;
}
