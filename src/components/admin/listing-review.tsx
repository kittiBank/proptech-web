"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { FormAlert, inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { adminRoutes } from "@/lib/admin";
import { formatWait, returnReasonLabels, returnReasonTemplates } from "@/lib/admin-queues";
import { adminApi, adminKeys, moderationItemQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { GetModerationItemResponse, ModerationItemDto, ModerationReturnReason } from "@/types/api";
import { AdminCard } from "./admin-dashboard";
import { AdminPageHeader } from "./admin-shell";
import { useAfterDecision } from "./admin-ui";

const reasons = Object.keys(returnReasonLabels) as ModerationReturnReason[];
const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const marketPill = {
  below: { label: "ต่ำกว่าตลาด", tone: "warning" },
  market: { label: "กลางตลาด", tone: "success" },
  above: { label: "สูงกว่าตลาด", tone: "warning" },
} as const;

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${m} ม.`;
}

function Photos({ item }: { item: ModerationItemDto }) {
  const photos = (item.listing.gallery?.length ? item.listing.gallery : [item.listing.image]).slice(0, 8);
  const photoFlags = item.flags.filter((f) => f.photoIndex !== undefined);
  return (
    <AdminCard title={`รูปภาพ ${photos.length} รูป`}>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.map((image, i) => {
          const flag = photoFlags.find((f) => f.photoIndex === i);
          return (
            <li
              key={`${image.src}-${i}`}
              className={cn("relative rounded", flag && "outline-2 outline-offset-1 outline-danger")}
            >
              <a
                href={image.src}
                target="_blank"
                rel="noreferrer"
                aria-label={`เปิดรูปที่ ${i + 1} เต็มขนาด${flag ? ` (${flag.label})` : ""}`}
              >
                <PropertyPhoto image={image} sizes="200px" className="aspect-[4/3] rounded" />
              </a>
              {flag && (
                <StatusPill
                  tone="danger"
                  className="pointer-events-none absolute top-1.5 left-1.5 h-5 px-2 text-[11px]"
                >
                  {flag.code === "phone_in_photo" ? "OCR: เบอร์โทร" : flag.label}
                </StatusPill>
              )}
            </li>
          );
        })}
      </ul>
      {item.flags
        .filter((f) => f.detail)
        .map((f) => (
          <p key={f.code} className={cn("mt-2.5 text-[13px]", f.tone === "danger" ? "text-danger" : "text-warning")}>
            {f.detail}
          </p>
        ))}
    </AdminCard>
  );
}

function Details({ item }: { item: ModerationItemDto }) {
  const p = item.listing;
  const perSqm = p.area ? Math.round(p.price / p.area) : undefined;
  const rooms = p.type === "land" || p.type === "commercial" ? "" : ` ${p.bedrooms} นอน ${p.bathrooms} น้ำ`;
  return (
    <AdminCard title={p.title}>
      <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1.5 text-[13px] sm:grid-cols-[140px_1fr]">
        <dt className="text-slate">ราคา</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <b className="font-semibold">฿{formatNumber(p.price)}</b>
          {perSqm && p.mode === "buy" && <span>฿{formatNumber(perSqm)}/ตร.ม.</span>}
          <StatusPill tone={marketPill[item.marketBand].tone} className="h-5 px-2 text-[11px]">
            {marketPill[item.marketBand].label}
          </StatusPill>
        </dd>
        <dt className="text-slate">ประเภท</dt>
        <dd>
          {propertyTypeLabels[p.type]} {p.mode === "buy" ? "ขาย" : "เช่า"}
          {rooms} {p.area} ตร.ม.{p.floor ? ` ชั้น ${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ""}` : ""}
        </dd>
        <dt className="text-slate">โครงการ</dt>
        <dd>
          {p.projectName ?? "-"} · {p.district}
        </dd>
        <dt className="text-slate">สถานี</dt>
        <dd>
          {p.location.stations.length
            ? p.location.stations
                .slice(0, 2)
                .map((s) => `${s.station.code} ${s.station.name} ${formatDistance(s.distance)}`)
                .join(" · ")
            : "-"}
        </dd>
        <dt className="text-slate">หัวข้อ/รายละเอียด</dt>
        <dd>
          <details>
            <summary className="cursor-pointer text-brand-strong">ดูข้อความเต็ม</summary>
            <p className="mt-1.5 whitespace-pre-line text-ink">{p.description}</p>
          </details>
        </dd>
      </dl>
      <a
        href={routes.property(p.slug)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-strong hover:underline"
      >
        ดูหน้าประกาศ
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </AdminCard>
  );
}

function Poster({ item }: { item: ModerationItemDto }) {
  const u = item.poster;
  const years = u.accountAgeDays >= 365 ? `${Math.floor(u.accountAgeDays / 365)} ปี` : `${u.accountAgeDays} วัน`;
  return (
    <AdminCard title="ผู้ลงประกาศ">
      <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1.5 text-[13px] sm:grid-cols-[140px_1fr]">
        <dt className="text-slate">ชื่อ</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <Link
            href={`${adminRoutes.users}?${new URLSearchParams({ q: u.userId })}`}
            className="text-brand-strong underline underline-offset-2"
          >
            {u.name}
          </Link>
          <StatusPill tone={u.kycApproved ? "success" : "neutral"} className="h-5 px-2 text-[11px]">
            {u.kycApproved ? "KYC ผ่าน" : "ยังไม่ยืนยันตัวตน"}
          </StatusPill>
        </dd>
        <dt className="text-slate">ประวัติ</dt>
        <dd>
          {u.listings} ประกาศ · ถูกตีกลับ {u.returnedLast90d} ครั้งใน 90 วัน ·{" "}
          {u.reportsCount ? `ถูกรายงาน ${u.reportsCount} ครั้ง` : "ไม่เคยถูกรายงาน"}
        </dd>
        <dt className="text-slate">บัญชี</dt>
        <dd>
          สมัคร {years} · {u.badge}
        </dd>
      </dl>
    </AdminCard>
  );
}

function Decided({ item }: { item: ModerationItemDto }) {
  const d = item.decision;
  if (!d) return null;
  return (
    <AdminCard title="ผลการตรวจ">
      <p className="mt-2 flex items-center gap-2">
        <StatusPill tone={d.outcome === "approved" ? "success" : "danger"}>
          {d.outcome === "approved" ? "ผ่าน" : "ตีกลับ"}
        </StatusPill>
        <span className="text-[13px] text-slate">
          {d.by} · {time.format(new Date(d.at))}
        </span>
      </p>
      {d.reasons.length > 0 && (
        <p className="mt-2 text-[13px]">{d.reasons.map((r) => returnReasonLabels[r]).join(", ")}</p>
      )}
      {d.message && <p className="mt-1.5 rounded-md bg-mist px-3 py-2 text-[13px]">{d.message}</p>}
    </AdminCard>
  );
}

function Decision({ result, onDone }: { result: GetModerationItemResponse; onDone: (nextId?: string) => void }) {
  const id = useId();
  const item = result.data;
  const [checked, setChecked] = useState(() => item.checks.filter((c) => c.passed).map((c) => c.id));
  const [picked, setPicked] = useState<ModerationReturnReason[]>(() =>
    item.flags.some((f) => f.code === "phone_in_photo") ? ["contact_in_photo"] : [],
  );
  const [message, setMessage] = useState(() => picked.map((r) => returnReasonTemplates[r]).join(" "));
  const [edited, setEdited] = useState(false);
  const [errors, setErrors] = useState<{ reasons?: string; message?: string }>({});
  const firstReason = useRef<HTMLInputElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const refresh = useAfterDecision(adminKeys.moderation);

  const onSuccess = (verb: string) => (res: { nextId?: string }) => {
    toast(`${verb} ${item.id} แล้ว`);
    refresh();
    onDone(res.nextId);
  };
  const approve = useMutation({ mutationFn: () => adminApi.approveListing(item.id), onSuccess: onSuccess("อนุมัติ") });
  const reject = useMutation({
    mutationFn: () => adminApi.returnListing(item.id, { reasons: picked, message: message.trim() }),
    onSuccess: onSuccess("ตีกลับ"),
  });
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;
  const missing = item.checks.length - checked.length;

  const toggleReason = (r: ModerationReturnReason) => {
    const next = picked.includes(r) ? picked.filter((x) => x !== r) : [...picked, r];
    setPicked(next);
    // Suggested wording follows the reasons until the reviewer writes their own.
    if (!edited) setMessage(next.map((x) => returnReasonTemplates[x]).join(" "));
  };

  const submitReturn = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      reasons: picked.length ? undefined : "เลือกเหตุผลอย่างน้อย 1 ข้อ",
      message: message.trim() ? undefined : "เขียนข้อความถึงผู้ลงประกาศ",
    };
    setErrors(next);
    if (!next.reasons && !next.message) reject.mutate();
  };

  // A approves, R jumps to the return reasons (J/K live on the page).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "a" && missing === 0 && !busy) approveRef.current?.click();
      if (e.key === "r") {
        e.preventDefault();
        firstReason.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [missing, busy]);

  const approveLabel = item.status === "spot_check" ? "ยืนยันผ่าน" : item.promotion ? "ผ่าน และเริ่มโปรโมต" : "ผ่าน";

  return (
    <>
      <AdminCard title="เช็กลิสต์">
        <fieldset className="mt-1.5">
          <legend className="sr-only">เช็กลิสต์ก่อนอนุมัติ</legend>
          {item.checks.map((c) => {
            const on = checked.includes(c.id);
            return (
              <label key={c.id} className="flex items-center gap-2.5 py-1.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setChecked(on ? checked.filter((x) => x !== c.id) : [...checked, c.id])}
                  className="size-4 accent-brand"
                />
                <span className={cn(!c.passed && !on ? "text-danger" : "text-ink")}>
                  {c.label}
                  {!c.passed && <span className="sr-only"> (ระบบตรวจไม่ผ่าน)</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
      </AdminCard>

      <AdminCard title="ผลการตรวจ">
        <Button
          ref={approveRef}
          variant="success"
          className="mt-3 w-full"
          disabled={busy || missing > 0}
          onClick={() => approve.mutate()}
        >
          {approveLabel}
        </Button>
        {missing > 0 && <p className="mt-1.5 text-xs text-slate">ติ๊กเช็กลิสต์ให้ครบก่อนผ่าน (เหลือ {missing} ข้อ)</p>}

        <form onSubmit={submitReturn} noValidate className="mt-4">
          <fieldset aria-describedby={errors.reasons ? `${id}-reasons-error` : undefined}>
            <legend className="mb-1.5 text-[13px] font-semibold">หรือตีกลับเพราะ</legend>
            <div className="flex flex-col gap-1.5">
              {reasons.map((r, i) => (
                <label key={r} className="flex items-center gap-2">
                  <input
                    ref={i === 0 ? firstReason : undefined}
                    type="checkbox"
                    checked={picked.includes(r)}
                    onChange={() => toggleReason(r)}
                    className="size-4 accent-brand"
                  />
                  {returnReasonLabels[r]}
                </label>
              ))}
            </div>
            {errors.reasons && (
              <p id={`${id}-reasons-error`} className="mt-1 text-xs text-danger">
                {errors.reasons}
              </p>
            )}
          </fieldset>
          <label htmlFor={`${id}-message`} className="mt-3 block text-[13px] font-medium">
            ข้อความถึงผู้ลงประกาศ
          </label>
          <textarea
            id={`${id}-message`}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setEdited(true);
            }}
            rows={3}
            maxLength={500}
            aria-invalid={Boolean(errors.message) || undefined}
            aria-describedby={`${id}-message-hint${errors.message ? ` ${id}-message-error` : ""}`}
            className={cn(inputClass, "mt-1 resize-y py-2 text-[13px]")}
          />
          {errors.message && (
            <p id={`${id}-message-error`} className="mt-1 text-xs text-danger">
              {errors.message}
            </p>
          )}
          <p id={`${id}-message-hint`} className="mt-1 text-xs text-slate">
            ข้อความนี้ส่งถึงผู้ลงประกาศ{item.promotion ? " ค่าโปรโมตจะยังไม่ถูกเรียกเก็บจนกว่าผ่าน" : ""}
          </p>
          <Button type="submit" variant="danger" className="mt-2.5 w-full" disabled={busy}>
            ตีกลับให้แก้ไข
          </Button>
        </form>
        {error && (
          <FormAlert className="mt-3">
            {error instanceof ApiError && error.status === 409
              ? "มีผู้ตรวจคนอื่นตัดสินประกาศนี้แล้ว"
              : "บันทึกผลไม่สำเร็จ ลองอีกครั้ง"}
          </FormAlert>
        )}
      </AdminCard>
    </>
  );
}

/** E3: one listing with its flags, details, poster history, checklist and the decision. */
export function ListingReview() {
  const { listingId } = useParams<{ listingId: string }>();
  const router = useRouter();
  const now = useNow(60_000);
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(moderationItemQuery(listingId));

  const queue = data?.queue;
  const go = (target?: string) => router.push(target ? adminRoutes.listingReview(target) : adminRoutes.moderation);

  // J / K move through the queue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "j" && queue?.nextId) router.push(adminRoutes.listingReview(queue.nextId));
      if (e.key === "k" && queue?.prevId) router.push(adminRoutes.listingReview(queue.prevId));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue, router]);

  if (isPending) {
    return (
      <div role="status" aria-label="กำลังโหลดประกาศ" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="py-16 text-center">
          <h1 className="text-[22px] font-semibold">ไม่พบประกาศ {listingId} ในคิวตรวจ</h1>
          <Link
            href={adminRoutes.moderation}
            className="mt-3 inline-block font-medium text-brand-strong hover:underline"
          >
            กลับคิวตรวจประกาศ
          </Link>
        </div>
      );
    }
    return <QueryError what="ประกาศ" onRetry={() => refetch()} retrying={isFetching} />;
  }

  const item = data.data;
  const reviewable = item.status === "pending" || item.status === "spot_check";
  const submitted = new Date(item.submittedAt);

  return (
    <>
      <AdminPageHeader
        title={`ตรวจประกาศ ${item.id}`}
        description={`ส่งเมื่อ ${time.format(submitted)}${now !== null && reviewable ? ` · รอมาแล้ว ${formatWait(now - submitted.getTime())}` : ""}`}
      />
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate">
        <nav aria-label="เส้นทางหน้า">
          <Link href={adminRoutes.moderation} className="text-brand-strong underline underline-offset-2">
            ตรวจประกาศ
          </Link>{" "}
          / {item.id}
        </nav>
        {item.promotion && (
          <StatusPill tone="violet" className="h-5 px-2 text-[11px]">
            จ่าย{item.promotion.label} ฿{item.promotion.amount}
          </StatusPill>
        )}
        {reviewable && queue && queue.position > 0 && (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="tabular-nums">
              ข้อที่ {queue.position} จาก {queue.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="size-8 px-0"
              aria-label="ประกาศก่อนหน้า (K)"
              disabled={!queue.prevId}
              onClick={() => go(queue.prevId)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="size-8 px-0"
              aria-label="ประกาศถัดไป (J)"
              disabled={!queue.nextId}
              onClick={() => go(queue.nextId)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Photos item={item} />
          <Details item={item} />
          <Poster item={item} />
        </div>
        <aside aria-label="ผลการตรวจ" className="flex flex-col gap-3 xl:sticky xl:top-4">
          {reviewable ? <Decision key={item.id} result={data} onDone={go} /> : <Decided item={item} />}
          <p className="text-xs text-slate">
            ทุกการตัดสินใจถูกบันทึกใน{" "}
            <Link href={adminRoutes.roles} className="text-brand-strong underline underline-offset-2">
              บันทึกการใช้งาน
            </Link>
          </p>
        </aside>
      </div>
    </>
  );
}
