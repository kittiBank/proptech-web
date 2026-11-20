import { newProjects } from "@/data/projects";
import { formatListingPrice, formatPrice } from "@/lib/format";
import { effectiveStatus, expiryFor, isOpenViewing, slotIso, slotParts } from "@/lib/viewing";
import type {
  AppointmentDto,
  CreateViewingRequest,
  MessageDto,
  PropertyDto,
  ThreadCounterpartDto,
  ThreadDto,
  ThreadFilter,
  ThreadListingDto,
  UpdateViewingRequest,
  ViewingRequestDto,
  ViewingSlotsResponse,
} from "@/types/api";
import { getAgentProfile, getPropertyDetail, listingsByPoster } from "./db";
import { pushNotification } from "./notifications";

/**
 * Chats and viewing requests behind `/me/threads` and `/me/viewings`.
 *
 * Each account starts with a demo inbox dated relative to "now". In the
 * browser the other side answers by itself (a reply a few seconds after a
 * message, a confirmation after a viewing request), so the UI's polling has
 * something to pick up. Tests get the same seed without the timers.
 */

interface StoredThread {
  id: string;
  /** Recipient key used to reopen a chat: "agent:<slug>", "property:<slug>", "project:<slug>". */
  key: string;
  role: ThreadDto["role"];
  counterpart: ThreadCounterpartDto;
  listing?: ThreadListingDto;
  unreadCount: number;
}

interface Inbox {
  threads: StoredThread[];
  messages: MessageDto[];
  viewings: ViewingRequestDto[];
}

const KEY = "propertyhub:mock:inbox";
let store: Record<string, Inbox> | undefined;
const inBrowser = () => typeof window !== "undefined" && process.env.NODE_ENV !== "test";

const storage = () => {
  try {
    return inBrowser() ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load() {
  if (store) return store;
  try {
    store = JSON.parse(storage()?.getItem(KEY) ?? "{}") as Record<string, Inbox>;
  } catch {
    store = {};
  }
  return store;
}

function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(store));
  } catch {
    // Memory only.
  }
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`;

// --- Listing and counterpart snapshots -------------------------------------

export function propertyListing(p: PropertyDto): ThreadListingDto {
  return {
    kind: "property",
    id: p.id,
    title: p.title,
    href: `/property/${p.slug}`,
    price: p.price,
    mode: p.mode,
    priceLabel: formatListingPrice(p.price, p.mode),
    image: p.image,
    station: p.station,
    stationDistance: p.stationDistance,
    viewingHours: "09:00–19:00",
  };
}

function posterOf(p: PropertyDto): ThreadCounterpartDto {
  const poster = getPropertyDetail(p.slug)!.poster;
  return {
    name: poster.name,
    kind: poster.kind,
    profileSlug: poster.profileSlug,
    phone: poster.phone,
    idVerified: poster.idVerified,
    responseMinutes: poster.responseMinutes,
  };
}

function projectThread(slug: string): Pick<StoredThread, "counterpart" | "listing"> | undefined {
  const project = newProjects.find((p) => p.slug === slug);
  if (!project) return undefined;
  return {
    counterpart: {
      name: `ฝ่ายขาย ${project.name}`,
      kind: "developer",
      phone: "02-000-3000",
      idVerified: true,
      responseMinutes: 60,
    },
    listing: {
      kind: "project",
      id: project.id,
      title: `โครงการ ${project.name}`,
      href: `/projects/${project.slug}`,
      price: project.startingPrice,
      priceLabel: `เริ่ม ${formatPrice(project.startingPrice)}`,
      image: project.image,
      station: project.station,
      stationDistance: project.stationDistance,
      viewingHours: "10:00–18:00",
    },
  };
}

// --- Demo inbox -------------------------------------------------------------

/** "2026-11-21" for the next Saturday after `now` (Bangkok), at least one day ahead. */
function nextWeekday(now: number, weekday: number) {
  for (let i = 1; i <= 8; i++) {
    const { date } = slotParts(new Date(now + i * DAY).toISOString());
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === weekday) return date;
  }
  return slotParts(new Date(now + DAY).toISOString()).date;
}

function seed(now = Date.now()): Inbox {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();
  const saturday = nextWeekday(now, 6);
  const sunday = nextWeekday(Date.parse(slotIso(saturday, "12:00")), 0);
  const inbox: Inbox = { threads: [], messages: [], viewings: [] };

  const thread = (key: string, base: Pick<StoredThread, "counterpart" | "listing">, unreadCount = 0) => {
    const t: StoredThread = { id: `t-${inbox.threads.length + 1}`, key, role: "buyer", unreadCount, ...base };
    inbox.threads.push(t);
    return t;
  };
  const say = (t: StoredThread, from: MessageDto["from"], text: string, hoursAgo: number, read = true) =>
    inbox.messages.push({
      id: `m-${inbox.messages.length + 1}`,
      threadId: t.id,
      from,
      kind: "text",
      text,
      createdAt: at(hoursAgo),
      readAt: from === "me" && read ? at(hoursAgo - 0.1) : undefined,
    });
  const view = (t: StoredThread, v: Omit<ViewingRequestDto, "id" | "threadId" | "expiresAt">) => {
    const viewing = { ...v, id: `v-${inbox.viewings.length + 1}`, threadId: t.id, expiresAt: expiryFor(v.createdAt) };
    inbox.viewings.push(viewing);
    inbox.messages.push({
      id: `m-${inbox.messages.length + 1}`,
      threadId: t.id,
      from: "me",
      kind: "viewing",
      text: "ขอนัดดูทรัพย์",
      viewingId: viewing.id,
      createdAt: v.createdAt,
    });
  };

  const kittipat = listingsByPoster("กิตติพัฒน์ ศรีสุข")[0];
  if (kittipat) {
    const t = thread(
      `property:${kittipat.slug}`,
      { counterpart: posterOf(kittipat), listing: propertyListing(kittipat) },
      1,
    );
    say(t, "me", "สวัสดีค่ะ สนใจประกาศนี้ ห้องยังว่างอยู่ไหมคะ", 4);
    say(t, "them", "สวัสดีครับ ยังว่างครับ ห้องตกแต่งครบ เจ้าของเพิ่งปรับราคาลงมาครับ", 3.6);
    say(t, "me", "อยากดูห้องจริงค่ะ วันเสาร์นี้ได้ไหมคะ", 3.5);
    say(t, "them", "ได้ครับ กดขอนัดในแชตได้เลย ผมจะยืนยันให้ครับ", 3.3);
    view(t, {
      slot: slotIso(saturday, "10:00"),
      backupSlot: slotIso(sunday, "14:00"),
      partySize: 2,
      status: "confirmed",
      createdAt: at(3.2),
      respondedAt: at(1),
    });
    say(t, "them", "ยืนยันนัดแล้วครับ เจอกันที่ล็อบบี้นะครับ", 1);
  }

  const thanapol =
    listingsByPoster("ธนพล เจริญรัตน์").find((p) => p.mode === "rent") ?? listingsByPoster("ธนพล เจริญรัตน์")[0];
  if (thanapol) {
    const t = thread(
      `property:${thanapol.slug}`,
      { counterpart: posterOf(thanapol), listing: propertyListing(thanapol) },
      1,
    );
    say(t, "me", "สวัสดีค่ะ ห้องนี้ย้ายเข้าได้เมื่อไหร่คะ", 2.5);
    view(t, { slot: slotIso(sunday, "15:00"), partySize: 1, status: "requested", createdAt: at(2) });
    say(t, "them", "ห้องยังว่างครับ ย้ายเข้าได้ต้นเดือนหน้า เดี๋ยวผมเช็กเวลาแล้วตอบนัดนะครับ", 1.5);
  }

  const natcha = listingsByPoster("ณัฐชา ประเสริฐวงศ์")[0];
  if (natcha) {
    const t = thread(`property:${natcha.slug}`, { counterpart: posterOf(natcha), listing: propertyListing(natcha) });
    view(t, { slot: at(24 * 10), partySize: 2, status: "confirmed", createdAt: at(24 * 12), respondedAt: at(24 * 11) });
    say(t, "them", "ขอบคุณที่มาดูห้องนะคะ สนใจตรงไหนเพิ่มเติมถามได้เลยค่ะ", 30);
    say(t, "me", "ขอบคุณค่ะ ขอคิดดูก่อนนะคะ", 26);
  }

  const aster = projectThread("aster-sathorn");
  if (aster) {
    const t = thread("project:aster-sathorn", aster);
    say(t, "me", "สนใจชมห้องตัวอย่างค่ะ", 50);
    view(t, {
      slot: slotIso(saturday, "14:00"),
      partySize: 2,
      status: "confirmed",
      createdAt: at(49),
      respondedAt: at(48),
    });
    say(t, "them", "ยืนยันนัดชมห้องตัวอย่างเรียบร้อยค่ะ จอดรถได้ที่สำนักงานขาย", 48);
  }

  const paweena = listingsByPoster("ปวีณา อินทรสุวรรณ")[0];
  if (paweena) {
    const t = thread(`property:${paweena.slug}`, { counterpart: posterOf(paweena), listing: propertyListing(paweena) });
    say(t, "me", "ต่อรองราคาได้ไหมคะ", 24 * 4);
    view(t, { slot: at(24 * 2), partySize: 1, status: "requested", createdAt: at(24 * 4 - 0.1) });
  }

  return inbox;
}

function inboxFor(userId: string): Inbox {
  const all = load();
  all[userId] ??= seed();
  const inbox = all[userId];
  // Time moves on: unanswered requests lapse, past viewings complete.
  for (const v of inbox.viewings) {
    const status = effectiveStatus(v);
    if (status !== v.status) v.status = status;
  }
  return inbox;
}

// --- Reads ------------------------------------------------------------------

function latestViewing(inbox: Inbox, threadId: string) {
  return inbox.viewings
    .filter((v) => v.threadId === threadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function toDto(inbox: Inbox, t: StoredThread): ThreadDto {
  const messages = inbox.messages.filter((m) => m.threadId === t.id);
  const last = messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  return {
    id: t.id,
    role: t.role,
    counterpart: t.counterpart,
    listing: t.listing,
    unreadCount: t.unreadCount,
    viewing: latestViewing(inbox, t.id),
    lastMessage: last
      ? { text: last.kind === "viewing" ? "ส่งคำขอนัดดูทรัพย์" : last.text, from: last.from, createdAt: last.createdAt }
      : { text: "", from: "me", createdAt: new Date(0).toISOString() },
  };
}

export function listThreads(userId: string, filter: ThreadFilter = "all"): ThreadDto[] {
  const inbox = inboxFor(userId);
  return inbox.threads
    .map((t) => toDto(inbox, t))
    .filter((t) => (filter === "unread" ? t.unreadCount > 0 : filter === "viewing" ? Boolean(t.viewing) : true))
    .sort((a, b) => b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt));
}

export function getThread(userId: string, threadId: string) {
  const inbox = inboxFor(userId);
  const t = inbox.threads.find((x) => x.id === threadId);
  if (!t) return undefined;
  return {
    thread: toDto(inbox, t),
    messages: inbox.messages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    viewings: inbox.viewings.filter((v) => v.threadId === threadId),
  };
}

export function unreadMessageCount(userId: string) {
  return inboxFor(userId).threads.reduce((sum, t) => sum + t.unreadCount, 0);
}

export function markThreadRead(userId: string, threadId: string): boolean {
  const t = inboxFor(userId).threads.find((x) => x.id === threadId);
  if (!t) return false;
  t.unreadCount = 0;
  persist();
  return true;
}

export function listAppointments(userId: string): AppointmentDto[] {
  const inbox = inboxFor(userId);
  return inbox.viewings
    .map((v) => {
      const t = inbox.threads.find((x) => x.id === v.threadId)!;
      return { ...v, listing: t.listing, counterpart: t.counterpart, role: t.role };
    })
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

/** The next 7 days from tomorrow, hourly within viewing hours; some hours are already booked. */
export function viewingSlots(
  userId: string,
  threadId: string,
  now = Date.now(),
): ViewingSlotsResponse["data"] | undefined {
  const inbox = inboxFor(userId);
  const t = inbox.threads.find((x) => x.id === threadId);
  if (!t?.listing) return undefined;
  const [open, close] = t.listing.viewingHours.split("–").map((h) => Number(h.slice(0, 2)));
  const ours = new Set(
    inbox.viewings.filter((v) => v.threadId === threadId && isOpenViewing(v.status)).map((v) => v.slot),
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const { date } = slotParts(new Date(now + (i + 1) * DAY).toISOString());
    const slots = [];
    for (let h = open; h < close; h++) {
      if (h === 12) continue; // lunch
      const time = `${String(h).padStart(2, "0")}:00`;
      const iso = slotIso(date, time);
      // Deterministic "booked by others" pattern so the grid has struck-through hours.
      const taken = (Number(date.slice(-2)) * 7 + h * 3 + threadId.length) % 5 === 0;
      slots.push({ time, available: !taken && !ours.has(iso) });
    }
    return { date, slots };
  });
  return { days, viewingHours: t.listing.viewingHours };
}

// --- Writes -----------------------------------------------------------------

const replies = [
  "ได้ครับ เดี๋ยวผมเช็กให้นะครับ",
  "ขอบคุณที่สนใจครับ สะดวกให้โทรกลับช่วงไหนครับ",
  "ส่งรายละเอียดเพิ่มเติมให้ในแชตนี้ได้เลยครับ",
];

/** Browser only: the counterpart reads the message and answers a few seconds later. */
function scheduleReply(userId: string, threadId: string) {
  if (!inBrowser()) return;
  window.setTimeout(() => {
    const inbox = inboxFor(userId);
    const t = inbox.threads.find((x) => x.id === threadId);
    if (!t) return;
    const now = new Date().toISOString();
    inbox.messages.forEach((m) => {
      if (m.threadId === threadId && m.from === "me" && !m.readAt) m.readAt = now;
    });
    const count = inbox.messages.filter((m) => m.threadId === threadId).length;
    inbox.messages.push({
      id: newId("m"),
      threadId,
      from: "them",
      kind: "text",
      text: replies[count % replies.length],
      createdAt: now,
    });
    t.unreadCount++;
    persist();
  }, 4000);
}

export function sendMessage(userId: string, threadId: string, text: string): MessageDto | undefined {
  const inbox = inboxFor(userId);
  if (!inbox.threads.some((t) => t.id === threadId)) return undefined;
  const message: MessageDto = {
    id: newId("m"),
    threadId,
    from: "me",
    kind: "text",
    text,
    createdAt: new Date().toISOString(),
  };
  inbox.messages.push(message);
  persist();
  scheduleReply(userId, threadId);
  return message;
}

/** Opens the chat with a recipient, starting one if needed. `undefined` for an unknown recipient. */
export function startThread(userId: string, to: string): ThreadDto | undefined {
  const inbox = inboxFor(userId);
  const existing = inbox.threads.find((t) => t.key === to);
  if (existing) return toDto(inbox, existing);

  const [kind, slug] = to.split(":");
  let base: Pick<StoredThread, "counterpart" | "listing"> | undefined;
  if (kind === "agent") {
    const agent = getAgentProfile(slug);
    if (agent) {
      base = {
        counterpart: {
          name: agent.name,
          kind: "agent",
          profileSlug: agent.slug,
          phone: agent.phone,
          idVerified: agent.idVerified,
          responseMinutes: agent.responseMinutes,
        },
      };
    }
  } else if (kind === "property") {
    const detail = getPropertyDetail(slug);
    if (detail) base = { counterpart: posterOf(detail), listing: propertyListing(detail) };
  } else if (kind === "project") {
    base = projectThread(slug);
  }
  if (!base) return undefined;

  const t: StoredThread = { id: newId("t"), key: to, role: "buyer", unreadCount: 0, ...base };
  inbox.threads.push(t);
  persist();
  return toDto(inbox, t);
}

export type ViewingError = "not_found" | "forbidden" | "conflict" | "invalid";

export function createViewing(
  userId: string,
  threadId: string,
  body: CreateViewingRequest,
  now = Date.now(),
): ViewingRequestDto | ViewingError {
  const inbox = inboxFor(userId);
  const t = inbox.threads.find((x) => x.id === threadId);
  if (!t) return "not_found";
  if (t.role !== "buyer" || !t.listing) return "forbidden";
  if (
    inbox.viewings.some((v) => v.threadId === threadId && (v.status === "requested" || v.status === "counter_proposed"))
  )
    return "conflict";
  const slot = Date.parse(body.slot);
  const backup = body.backupSlot ? Date.parse(body.backupSlot) : undefined;
  if (
    !Number.isFinite(slot) ||
    slot <= now ||
    (backup !== undefined && (!Number.isFinite(backup) || backup <= now || backup === slot)) ||
    !Number.isInteger(body.partySize) ||
    body.partySize < 1 ||
    body.partySize > 10
  )
    return "invalid";

  const createdAt = new Date(now).toISOString();
  const viewing: ViewingRequestDto = {
    id: newId("v"),
    threadId,
    slot: new Date(slot).toISOString(),
    backupSlot: backup !== undefined ? new Date(backup).toISOString() : undefined,
    partySize: body.partySize,
    note: body.note?.trim() || undefined,
    status: "requested",
    createdAt,
    expiresAt: expiryFor(createdAt),
  };
  inbox.viewings.push(viewing);
  inbox.messages.push({
    id: newId("m"),
    threadId,
    from: "me",
    kind: "viewing",
    text: "ขอนัดดูทรัพย์",
    viewingId: viewing.id,
    createdAt,
  });
  persist();
  scheduleConfirmation(userId, viewing.id);
  return viewing;
}

/** Browser only: the lister confirms a new request after a short wait. */
function scheduleConfirmation(userId: string, viewingId: string) {
  if (!inBrowser()) return;
  window.setTimeout(() => {
    const inbox = inboxFor(userId);
    const v = inbox.viewings.find((x) => x.id === viewingId);
    const t = v && inbox.threads.find((x) => x.id === v.threadId);
    if (!v || !t || v.status !== "requested") return;
    v.status = "confirmed";
    v.respondedAt = new Date().toISOString();
    inbox.messages.push({
      id: newId("m"),
      threadId: t.id,
      from: "them",
      kind: "text",
      text: "ยืนยันนัดแล้วครับ แล้วเจอกันครับ",
      createdAt: v.respondedAt,
    });
    t.unreadCount++;
    pushNotification(userId, {
      kind: "viewing",
      title: "ยืนยันนัดดูห้องแล้ว",
      detail: t.listing?.title ?? t.counterpart.name,
      href: "/account/appointments",
    });
    persist();
  }, 8000);
}

/** Who may take each action, and from which statuses. */
const allowed: Record<
  UpdateViewingRequest["action"],
  { role: ThreadDto["role"]; from: ViewingRequestDto["status"][] }
> = {
  cancel: { role: "buyer", from: ["requested", "counter_proposed", "confirmed"] },
  accept: { role: "buyer", from: ["counter_proposed"] },
  confirm: { role: "lister", from: ["requested"] },
  decline: { role: "lister", from: ["requested", "counter_proposed"] },
  propose: { role: "lister", from: ["requested"] },
};

export function updateViewing(
  userId: string,
  viewingId: string,
  body: UpdateViewingRequest,
  now = Date.now(),
): ViewingRequestDto | ViewingError {
  const inbox = inboxFor(userId);
  const v = inbox.viewings.find((x) => x.id === viewingId);
  const t = v && inbox.threads.find((x) => x.id === v.threadId);
  if (!v || !t) return "not_found";
  const rule = allowed[body.action];
  if (!rule) return "invalid";
  if (rule.role !== t.role) return "forbidden";
  if (!rule.from.includes(v.status)) return "conflict";

  const at = new Date(now).toISOString();
  switch (body.action) {
    case "cancel":
      v.status = "cancelled";
      break;
    case "accept":
      v.slot = v.proposedSlot!;
      v.proposedSlot = undefined;
      v.status = "confirmed";
      break;
    case "confirm":
      v.status = "confirmed";
      break;
    case "decline":
      v.status = "declined";
      break;
    case "propose":
      if (!body.slot || !(Date.parse(body.slot) > now)) return "invalid";
      v.proposedSlot = new Date(body.slot).toISOString();
      v.status = "counter_proposed";
      break;
  }
  v.respondedAt = at;
  persist();
  return v;
}

/** Tests and other mocks: add a thread directly (e.g. the seller dashboard's lister threads). */
export function addThread(
  userId: string,
  thread: Omit<StoredThread, "id">,
  messages: Omit<MessageDto, "id" | "threadId">[] = [],
) {
  const inbox = inboxFor(userId);
  const t = { ...thread, id: newId("t") };
  inbox.threads.push(t);
  for (const m of messages) inbox.messages.push({ ...m, id: newId("m"), threadId: t.id });
  persist();
  return t.id;
}

export function resetMockInbox() {
  store = {};
}
