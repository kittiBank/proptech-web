import {
  postSteps,
  defaultDraftValues,
  FREE_LISTING_LIMIT,
  MAX_PHOTO_BYTES,
  MIN_PHOTO_WIDTH,
  promotionCatalog,
  stepErrors,
} from "@/lib/post-wizard";
import { kycStatus } from "./kyc";
import type {
  DraftDto,
  DraftPhoto,
  PostStep,
  PromotionOption,
  PublishDraftResponse,
  SubmittedListingDto,
  UpdateDraftRequest,
  UploadPhotoRequest,
} from "@/types/api";

/**
 * Listing drafts and submitted listings for the signed-in user, behind
 * `/me/drafts`. Kept in localStorage in the browser so a draft survives a
 * reload ("ออกและทำต่อทีหลัง"); in memory under tests.
 */

interface Submission extends SubmittedListingDto {
  userId: string;
}

interface Store {
  drafts: (DraftDto & { userId: string })[];
  submissions: Submission[];
}

const KEY = "propertyhub:mock:drafts";
let store: Store | undefined;

const storage = () => {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load(): Store {
  if (store) return store;
  try {
    const raw = storage()?.getItem(KEY);
    store = raw ? (JSON.parse(raw) as Store) : { drafts: [], submissions: [] };
  } catch {
    store = { drafts: [], submissions: [] };
  }
  return store;
}

function save() {
  try {
    storage()?.setItem(KEY, JSON.stringify(store));
  } catch {
    // Quota or private mode: keep going in memory.
  }
}

function strip(draft: DraftDto & { userId: string }): DraftDto {
  const copy: Partial<DraftDto & { userId: string }> = { ...draft };
  delete copy.userId;
  return copy as DraftDto;
}
const now = () => new Date().toISOString();

export function listDrafts(userId: string): DraftDto[] {
  return load()
    .drafts.filter((d) => d.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(strip);
}

export function getDraft(userId: string, id: string): DraftDto | undefined {
  const draft = load().drafts.find((d) => d.id === id && d.userId === userId);
  return draft && strip(draft);
}

export function createDraft(userId: string, posterKind: DraftDto["values"]["posterKind"] = "owner"): DraftDto {
  const draft = {
    id: `d-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    userId,
    createdAt: now(),
    updatedAt: now(),
    completedSteps: [] as PostStep[],
    values: { ...defaultDraftValues, posterKind },
  };
  load().drafts.push(draft);
  save();
  return strip(draft);
}

export function updateDraft(userId: string, id: string, patch: UpdateDraftRequest): DraftDto | undefined {
  const draft = load().drafts.find((d) => d.id === id && d.userId === userId);
  if (!draft) return undefined;
  if (patch.values) draft.values = { ...draft.values, ...patch.values };
  if (patch.completedSteps)
    draft.completedSteps = postSteps.map((s) => s.id).filter((s) => patch.completedSteps!.includes(s));
  draft.updatedAt = now();
  save();
  return strip(draft);
}

export function deleteDraft(userId: string, id: string) {
  const s = load();
  s.drafts = s.drafts.filter((d) => !(d.id === id && d.userId === userId));
  save();
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];

/** Checks a photo like the media service would: type, size, width, and a mock OCR for phone numbers. */
export function checkPhoto(body: UploadPhotoRequest): DraftPhoto {
  const id = `ph-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const reason = !ACCEPTED_TYPES.includes(body.mimeType)
    ? "รองรับเฉพาะ JPG, PNG และ HEIC"
    : body.size > MAX_PHOTO_BYTES
      ? "ไฟล์ใหญ่เกิน 15 MB"
      : body.width < MIN_PHOTO_WIDTH
        ? `รูปเล็กเกินไป ต้องกว้าง ${MIN_PHOTO_WIDTH.toLocaleString("th-TH")} px ขึ้นไป`
        : /tel|phone|เบอร์|line/i.test(body.name)
          ? "พบเบอร์โทรในรูป ลบเบอร์หรือใช้รูปอื่น"
          : undefined;
  return { id, url: body.preview, name: body.name, status: reason ? "rejected" : "ready", reason };
}

export function quota(userId: string) {
  return { used: load().submissions.filter((s) => s.userId === userId).length, limit: FREE_LISTING_LIMIT };
}

/** Homepage pins left today: 24 a day, 4 held for partners, most already booked. */
export function promotionOptions(): PromotionOption[] {
  return promotionCatalog.map((p) => (p.id === "homepage_pin" ? { ...p, slotsLeft: 5 } : p));
}

export type PublishResult =
  { ok: true; body: PublishDraftResponse } | { ok: false; status: 404 | 409 | 422 | 403; message: string | string[] };

export function publishDraft(userId: string, id: string): PublishResult {
  const s = load();
  const draft = s.drafts.find((d) => d.id === id && d.userId === userId);
  if (!draft) return { ok: false, status: 404, message: "Draft not found" };
  const failing = postSteps
    .filter((step) => Object.keys(stepErrors(step.id, draft.values)).length > 0)
    .map((st) => st.id);
  if (failing.length) return { ok: false, status: 422, message: failing.map((st) => `step ${st} is incomplete`) };
  // Agents publish only once their verification is approved (C16).
  if (draft.values.posterKind === "agent" && kycStatus(userId) !== "approved") {
    return { ok: false, status: 403, message: "kyc_required" };
  }
  if (
    draft.values.posterKind === "owner" &&
    quota(userId).used >= FREE_LISTING_LIMIT &&
    draft.values.promotion === "none"
  ) {
    return { ok: false, status: 409, message: "free_quota_exceeded" };
  }

  const n = 2290 + s.submissions.length + 1;
  const submission: Submission = {
    id: `l-${n}`,
    code: `PH-${n}`,
    slug: `listing-${n}`,
    status: "pending_review",
    draftId: draft.id,
    userId,
    submittedAt: now(),
    values: draft.values,
  };
  s.submissions.push(submission);
  s.drafts = s.drafts.filter((d) => d.id !== id);
  save();

  const promotion = promotionCatalog.find((p) => p.id === draft.values.promotion);
  return {
    ok: true,
    body: {
      data: {
        listing: {
          id: submission.id,
          code: submission.code,
          slug: submission.slug,
          status: "pending_review",
          submittedAt: submission.submittedAt,
        },
        order:
          promotion && promotion.price > 0
            ? { id: `o-${n}`, amount: promotion.price, promotion: promotion.id }
            : undefined,
      },
    },
  };
}

/** The listing a published draft became, for the success page. */
export function getSubmissionForDraft(userId: string, draftId: string): SubmittedListingDto | undefined {
  const found = load().submissions.find((s) => s.draftId === draftId && s.userId === userId);
  if (!found) return undefined;
  const copy: Partial<Submission> = { ...found };
  delete copy.userId;
  return copy as SubmittedListingDto;
}

/** Listings this user sent for review, newest first (seller dashboard). */
export function listSubmissions(userId: string): SubmittedListingDto[] {
  return load()
    .submissions.filter((s) => s.userId === userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((found) => {
      const copy: Partial<Submission> = { ...found };
      delete copy.userId;
      return copy as SubmittedListingDto;
    });
}

/** Tests: start empty. */
export function resetMockDrafts() {
  store = { drafts: [], submissions: [] };
}
