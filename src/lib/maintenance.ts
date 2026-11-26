/**
 * Planned maintenance (D10 right). The window comes from env so ops can change it without a
 * deploy of new code: `MAINTENANCE_STARTS_AT` / `MAINTENANCE_ENDS_AT` (ISO). `MAINTENANCE_MODE=on`
 * makes `proxy.ts` serve `/maintenance` with HTTP 503 for every page.
 */

export interface MaintenanceWindow {
  /** ISO date-time. */
  startsAt: string;
  /** ISO date-time. */
  endsAt: string;
}

export type MaintenancePhase = "upcoming" | "active" | "over";

/** Demo window: Sunday 29 Nov 2026, 02:00–04:00 Bangkok time. */
const DEFAULT_WINDOW: MaintenanceWindow = {
  startsAt: "2026-11-29T02:00:00+07:00",
  endsAt: "2026-11-29T04:00:00+07:00",
};

export function maintenanceWindow(env: Record<string, string | undefined> = process.env): MaintenanceWindow {
  const startsAt = env.MAINTENANCE_STARTS_AT?.trim();
  const endsAt = env.MAINTENANCE_ENDS_AT?.trim();
  const valid = (iso?: string): iso is string => Boolean(iso) && !Number.isNaN(Date.parse(iso!));
  return valid(startsAt) && valid(endsAt) ? { startsAt, endsAt } : DEFAULT_WINDOW;
}

export function isMaintenanceMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.MAINTENANCE_MODE?.trim().toLowerCase() === "on";
}

export function maintenancePhase(window: MaintenanceWindow, now: number): MaintenancePhase {
  if (now < Date.parse(window.startsAt)) return "upcoming";
  return now < Date.parse(window.endsAt) ? "active" : "over";
}

/** Whole seconds until the window ends (at least 60), for the 503 `Retry-After` header. */
export function retryAfterSeconds(window: MaintenanceWindow, now: number): number {
  return Math.max(60, Math.ceil((Date.parse(window.endsAt) - now) / 1000));
}

/** 5,040,000 ms → "1 ชม. 24 นาที"; days when over a day; "ไม่ถึง 1 นาที" at the end. Rounds minutes up. */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(Math.max(0, ms) / 60_000);
  if (totalMinutes < 1) return "ไม่ถึง 1 นาที";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return [`${days} วัน`, hours > 0 && `${hours} ชม.`].filter(Boolean).join(" ");
  return [hours > 0 && `${hours} ชม.`, minutes > 0 && `${minutes} นาที`].filter(Boolean).join(" ");
}

const day = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Bangkok",
});
const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

/** "วันอาทิตย์ที่ 29 พ.ย. 02:00 ถึง 04:00 น." (Bangkok time). */
export function formatMaintenanceWindow(window: MaintenanceWindow): string {
  const start = new Date(window.startsAt);
  const end = new Date(window.endsAt);
  const sameDay = day.format(start) === day.format(end);
  return sameDay
    ? `${day.format(start)} ${time.format(start)} ถึง ${time.format(end)} น.`
    : `${day.format(start)} ${time.format(start)} น. ถึง${day.format(end)} ${time.format(end)} น.`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The whole D10 maintenance page as one HTML document, served by `proxy.ts`. It depends on
 * nothing else (no app render, no API, no build assets), so it works during an outage and can
 * carry a real 503: Next ignores a rewrite's status once a page renders.
 * `now` fills in the countdown; a tiny script keeps it ticking.
 */
export function maintenancePageHtml(schedule: MaintenanceWindow, now: number, lineHandle: string): string {
  const phase = maintenancePhase(schedule, now);
  const target = Date.parse(phase === "active" ? schedule.endsAt : schedule.startsAt);
  const timer =
    phase === "over"
      ? `<p class="strong">ระบบกลับมาใช้งานได้แล้ว</p><a class="btn" href="/">กลับหน้าแรก</a>`
      : `<p class="small">${phase === "active" ? "กลับมาใช้งานได้ในอีกประมาณ" : "เริ่มปิดปรับปรุงในอีก"}</p>` +
        `<p class="count" data-target="${target}">${escapeHtml(formatCountdown(target - now))}</p>`;
  // Same rounding as `formatCountdown`, refreshed every 30 s; reload when the window ends.
  const script = `(()=>{const el=document.querySelector("[data-target]");if(!el)return;const t=+el.dataset.target;const f=()=>{const m=Math.ceil(Math.max(0,t-Date.now())/6e4);if(m<1){location.reload();return}const d=Math.floor(m/1440),h=Math.floor(m%1440/60),n=m%60;el.textContent=d>0?[d+" วัน",h>0&&h+" ชม."].filter(Boolean).join(" "):[h>0&&h+" ชม.",n>0&&n+" นาที"].filter(Boolean).join(" ")};setInterval(f,3e4)})()`;

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${phase === "over" ? "ปรับปรุงระบบเสร็จแล้ว" : "ปิดปรับปรุงระบบ"} | PropertyHub</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;flex-direction:column;font-family:"IBM Plex Sans Thai","DM Sans",system-ui,sans-serif;color:#1a1630;background:#f5f3f9;line-height:1.5}
header{height:68px;display:flex;align-items:center;padding:0 32px;background:#fff;border-bottom:1px solid #e4e0ec;font-size:19px;font-weight:600}
header b{color:#7047eb;font-weight:600}main{flex:1;display:flex;align-items:center;padding:64px 16px}.box{width:100%;max-width:480px;margin:0 auto}
.icon{width:56px;height:56px;border-radius:50%;background:#e6defd;color:#5530d0;display:flex;align-items:center;justify-content:center}
h1{margin:16px 0 0;font-size:28px;font-weight:600;letter-spacing:-.015em}.lead{margin:8px 0 0;color:#5e5872;font-size:16px}
.timer{margin-top:24px;padding:14px 16px;border:1px solid #e4e0ec;border-radius:8px;background:#fff}.small{margin:0;font-size:13px;color:#5e5872}
.count{margin:2px 0 0;font-size:24px;font-weight:600;font-variant-numeric:tabular-nums}.strong{margin:0;font-weight:600}
.btn{display:inline-flex;margin-top:12px;height:44px;align-items:center;padding:0 16px;border-radius:6px;background:#7047eb;color:#fff;font-weight:500;text-decoration:none}
.foot{margin:16px 0 0;font-size:13px;color:#5e5872}
</style>
</head>
<body>
<header><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style="margin-right:10px"><rect width="32" height="32" rx="6" fill="#7047EB"/><path d="M11 25V15.5a5 5 0 0 1 10 0V25" fill="none" stroke="#fff" stroke-width="3"/><rect x="7" y="24" width="18" height="3" fill="#fff"/></svg>Property<b>Hub</b></header>
<main id="main"><div class="box">
<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></span>
<h1>${phase === "over" ? "ปรับปรุงระบบเสร็จแล้ว" : "ปิดปรับปรุงระบบ"}</h1>
<p class="lead">${escapeHtml(formatMaintenanceWindow(schedule))} ระหว่างนี้ค้นหาและดูประกาศไม่ได้ ประกาศแนะนำและแพ็กเกจจะถูกชดเชยเวลาให้อัตโนมัติ</p>
<div class="timer" role="timer" aria-live="off">${timer}</div>
<p class="foot">ติดตามสถานะที่ LINE ${escapeHtml(lineHandle)}</p>
</div></main>
${phase === "over" ? "" : `<script>${script}</script>`}
</body>
</html>`;
}
