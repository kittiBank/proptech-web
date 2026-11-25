import {
  completedKycSteps,
  companySchema,
  kycEditable,
  kycFileError,
  mockReviewOutcome,
  personalSchema,
} from "@/lib/kyc";
import { fieldErrors } from "@/lib/validation";
import type {
  KycDocumentDto,
  KycDto,
  KycStep,
  SellerKycStatus,
  UpdateKycRequest,
  UploadKycDocumentRequest,
} from "@/types/api";

/**
 * Agent verification behind `/me/kyc` (C16). The mock reviewer answers a few
 * seconds after submitting (checked on read, like PromptPay): approved unless a
 * file name contains "blur" (asks for a new selfie) or "reject".
 */

interface Stored extends Omit<KycDto, "completedSteps"> {
  /** When the mock reviewer answers. */
  reviewAt?: number;
}

export const KYC_REVIEW_MS = 8_000;
const KEY = "propertyhub:mock:kyc";
let store: Record<string, Stored> | undefined;

const storage = () => {
  try {
    return typeof window !== "undefined" && process.env.NODE_ENV !== "test" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

function load() {
  if (store) return store;
  try {
    store = JSON.parse(storage()?.getItem(KEY) ?? "{}") as Record<string, Stored>;
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

function record(userId: string, now = Date.now()): Stored {
  const all = load();
  all[userId] ??= { status: "not_started", documents: [], companySkipped: false };
  const k = all[userId];
  if (k.status === "submitted" && k.reviewAt !== undefined && k.reviewAt <= now) {
    const outcome = mockReviewOutcome(k);
    k.status = outcome.status;
    k.reviewedAt = new Date(k.reviewAt).toISOString();
    k.reviewNote = outcome.status === "approved" ? undefined : outcome.note;
    k.fixSteps = outcome.status === "needs_info" ? outcome.fix : undefined;
    k.reviewAt = undefined;
    persist();
  }
  return k;
}

function toDto(k: Stored): KycDto {
  const copy: Partial<Stored> = { ...k };
  delete copy.reviewAt;
  return { ...(copy as Omit<KycDto, "completedSteps">), completedSteps: completedKycSteps(k) };
}

/** First edit moves a fresh verification to in progress. */
function touch(k: Stored) {
  if (k.status === "not_started") k.status = "in_progress";
}

export type KycError = "locked" | "incomplete" | "invalid" | { fields: Record<string, string> };

export const getKyc = (userId: string, now = Date.now()) => toDto(record(userId, now));

/** Status for gates elsewhere (publishing, the seller shell). */
export const kycStatus = (userId: string): SellerKycStatus => record(userId).status;

export function updateKyc(userId: string, body: UpdateKycRequest): KycDto | KycError {
  const k = record(userId);
  if (!kycEditable(k.status)) return "locked";
  if (body.personal !== undefined) {
    const parsed = personalSchema.safeParse(body.personal);
    if (!parsed.success) return { fields: fieldErrors(parsed.error) as Record<string, string> };
    k.personal = parsed.data;
  }
  if (body.company === null) {
    k.company = undefined;
    k.documents = k.documents.filter((d) => d.slot !== "company");
  } else if (body.company !== undefined) {
    const parsed = companySchema.safeParse(body.company);
    if (!parsed.success) return { fields: fieldErrors(parsed.error) as Record<string, string> };
    k.company = parsed.data;
    k.companySkipped = false;
  }
  if (typeof body.companySkipped === "boolean") k.companySkipped = body.companySkipped;
  touch(k);
  persist();
  return toDto(k);
}

export function uploadKycDocument(userId: string, body: UploadKycDocumentRequest): KycDocumentDto | KycError {
  const k = record(userId);
  if (!kycEditable(k.status)) return "locked";
  if (!body?.slot || !body.name || !body.mimeType || typeof body.size !== "number") return "invalid";
  const error = kycFileError(body.slot, body);
  if (error) return { fields: { file: error } };
  const doc: KycDocumentDto = {
    slot: body.slot,
    name: body.name,
    mimeType: body.mimeType,
    preview: body.mimeType === "application/pdf" ? undefined : body.preview,
    uploadedAt: new Date().toISOString(),
  };
  k.documents = [...k.documents.filter((d) => d.slot !== body.slot), doc];
  if (body.slot === "company") k.companySkipped = false;
  // A fixed step no longer needs fixing.
  const step: KycStep = body.slot === "id_front" || body.slot === "id_back" ? "id_card" : body.slot;
  if (k.fixSteps) k.fixSteps = k.fixSteps.filter((s) => s !== step);
  touch(k);
  persist();
  return doc;
}

export function removeKycDocument(userId: string, slot: string): KycDto | KycError {
  const k = record(userId);
  if (!kycEditable(k.status)) return "locked";
  k.documents = k.documents.filter((d) => d.slot !== slot);
  persist();
  return toDto(k);
}

export function submitKyc(userId: string, now = Date.now()): KycDto | KycError {
  const k = record(userId, now);
  if (!kycEditable(k.status)) return "locked";
  if (!completedKycSteps(k).includes("review") || k.fixSteps?.length) return "incomplete";
  Object.assign(k, {
    status: "submitted",
    submittedAt: new Date(now).toISOString(),
    reviewAt: now + KYC_REVIEW_MS,
    reviewNote: undefined,
    fixSteps: undefined,
  });
  persist();
  return toDto(k);
}

/** After a rejection: start again with the personal details kept, files removed. */
export function restartKyc(userId: string): KycDto | KycError {
  const k = record(userId);
  if (k.status !== "rejected") return "locked";
  Object.assign(k, {
    status: "in_progress",
    documents: [],
    company: undefined,
    companySkipped: false,
    submittedAt: undefined,
    reviewedAt: undefined,
    reviewNote: undefined,
  });
  persist();
  return toDto(k);
}

/** Tests and e2e: let the reviewer answer now. */
export function finishKycReview(userId: string) {
  const k = record(userId);
  if (k.status === "submitted") k.reviewAt = Date.now();
}

/** Tests: an agent who is already verified. */
export function approveKycForTests(userId: string) {
  const k = record(userId);
  k.status = "approved";
  k.reviewedAt = new Date().toISOString();
}

export function resetMockKyc() {
  store = {};
}
