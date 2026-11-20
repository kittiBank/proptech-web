import { VIEWING_EXPIRY_HOURS, type ViewingRequestDto, type ViewingStatusDto } from "@/types/api";

/**
 * Viewing requests (B14–B18): Bangkok-time slots, how a request ages
 * (requested → expired after 24h, confirmed → completed once it has passed),
 * which appointments tab it belongs to, and the calendar file.
 */

const TZ = "Asia/Bangkok";
const HOUR = 3_600_000;

/** "2026-11-22" + "10:00" in Bangkok → ISO instant. */
export function slotIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO instant → Bangkok `{ date: "2026-11-22", time: "10:00" }`. */
export function slotParts(iso: string): { date: string; time: string } {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === "24" ? "00" : p.hour}:${p.minute}` };
}

const longDay = new Intl.DateTimeFormat("th-TH", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dayMonth = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short" });
/** ICU's Thai "short" weekday is the full word on some runtimes; the designs use these abbreviations. */
const thaiWeekdays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const weekdayOf = (iso: string) => thaiWeekdays[new Date(`${slotParts(iso).date}T00:00:00Z`).getUTCDay()];

/** "เสาร์ 21 พ.ย. 2569 10:00" (long) or "ส. 21 พ.ย. 10:00" (short). */
export function formatSlot(iso: string, style: "long" | "short" = "long"): string {
  const time = slotParts(iso).time;
  if (style === "short") return `${weekdayOf(iso)} ${dayMonth.format(new Date(iso))} ${time}`;
  // th-TH long weekday reads "วันเสาร์ที่ 21 …"; the designs drop "วัน" and "ที่".
  const day = longDay
    .format(new Date(iso))
    .replace(/^วัน/, "")
    .replace(/ที่\s*/, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${day} ${time}`;
}

/** Day box for the appointments list: "ส." / "22" / "พ.ย.". */
export function dayBox(iso: string) {
  const parts = Object.fromEntries(dayMonth.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { weekday: weekdayOf(iso), day: parts.day, month: parts.month };
}

/** "ส. 21 พ.ย." for a "2026-11-21" day (slot picker). */
export const formatDayLabel = (date: string) => {
  const iso = slotIso(date, "12:00");
  return `${weekdayOf(iso)} ${dayMonth.format(new Date(iso))}`;
};

/** Status after time has passed: unanswered requests lapse, confirmed viewings become completed an hour after they start. */
export function effectiveStatus(v: Pick<ViewingRequestDto, "status" | "expiresAt" | "slot">, now = Date.now()) {
  if (v.status === "requested" && Date.parse(v.expiresAt) <= now) return "expired" as const;
  if (v.status === "confirmed" && Date.parse(v.slot) + HOUR <= now) return "completed" as const;
  return v.status;
}

export const expiryFor = (createdAt: string) =>
  new Date(Date.parse(createdAt) + VIEWING_EXPIRY_HOURS * HOUR).toISOString();

export type AppointmentTab = "upcoming" | "pending" | "past" | "cancelled";

/** B17 tabs: confirmed and ahead · waiting on someone · over · cancelled. */
export function appointmentTab(status: ViewingStatusDto): AppointmentTab {
  switch (status) {
    case "confirmed":
      return "upcoming";
    case "requested":
    case "counter_proposed":
      return "pending";
    case "cancelled":
      return "cancelled";
    default:
      return "past";
  }
}

/** Requests that block a new one in the same thread. */
export const isOpenViewing = (status: ViewingStatusDto) =>
  status === "requested" || status === "counter_proposed" || status === "confirmed";

const icsStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** A one-event iCalendar file for "เพิ่มลงปฏิทิน" (1 hour). */
export function viewingIcs(v: { id: string; slot: string; title: string; location?: string; description?: string }) {
  const end = new Date(Date.parse(v.slot) + HOUR).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PropertyHub//Viewing//TH",
    "BEGIN:VEVENT",
    `UID:${v.id}@propertyhub`,
    `DTSTAMP:${icsStamp(new Date(0).toISOString())}`,
    `DTSTART:${icsStamp(v.slot)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(v.title)}`,
    ...(v.location ? [`LOCATION:${icsText(v.location)}`] : []),
    ...(v.description ? [`DESCRIPTION:${icsText(v.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const icsHref = (ics: string) => `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
