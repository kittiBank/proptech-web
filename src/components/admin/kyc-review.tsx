"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, IdCard, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert, NativeSelect, inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { adminRoutes } from "@/lib/admin";
import { faceMatchLabel, formatWait, kycStatusInfo } from "@/lib/admin-queues";
import { adminApi, kycApplicationsQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { KycApplicationDto, KycApplicationStatus, KycCheckDto, KycDecision } from "@/types/api";
import { AdminPageHeader } from "./admin-shell";
import { AdminTabs, useAfterDecision } from "./admin-ui";

const tabs: KycApplicationStatus[] = ["pending", "needs_info", "approved", "rejected"];
const viewReasons = ["ตรวจตามคิว", "ตรวจซ้ำตามคำขอผู้ใช้", "สอบสวนจากรายงาน"];
const checkTone: Record<KycCheckDto["result"], "success" | "danger" | "neutral"> = {
  match: "success",
  pass: "success",
  mismatch: "danger",
  fail: "danger",
  optional: "neutral",
};
const decisionToast: Record<KycDecision, string> = {
  approve: "อนุมัติ",
  reject: "ปฏิเสธ",
  request_info: "ขอเอกสารเพิ่มจาก",
};

const appHref = (tab: KycApplicationStatus, id?: string) => {
  const q = new URLSearchParams();
  if (tab !== "pending") q.set("tab", tab);
  if (id) q.set("app", id);
  const qs = q.toString();
  return `${adminRoutes.kyc}${qs ? `?${qs}` : ""}`;
};

/** Stand-in for the document image: real files stay in the KYC store and are never cached here. */
function DocumentPanel({
  title,
  icon: Icon,
  revealed,
  children,
}: {
  title: string;
  icon: typeof IdCard;
  revealed: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0">
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-md border border-line bg-violet-50 text-violet-700",
          !revealed && "bg-mist text-slate",
        )}
      >
        <span className="flex flex-col items-center gap-1 text-xs">
          <Icon className="size-8" aria-hidden="true" />
          {revealed ? `${title} (ภาพจำลอง)` : "ซ่อนอยู่"}
        </span>
      </div>
      <figcaption className="mt-1.5 text-[13px]">
        <span className="font-medium">{title}</span>
        {revealed && <span className="block text-slate">{children}</span>}
      </figcaption>
    </figure>
  );
}

function Application({ app }: { app: KycApplicationDto }) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const [reason, setReason] = useState(viewReasons[0]);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string>();
  const refresh = useAfterDecision(["admin", "kyc"]);
  const view = useMutation({ mutationFn: () => adminApi.viewKyc(app.id, reason), onSuccess: () => setRevealed(true) });
  const decide = useMutation({
    mutationFn: (decision: KycDecision) => adminApi.decideKyc(app.id, { decision, note: note.trim() || undefined }),
    onSuccess: (_res, decision) => {
      toast(`${decisionToast[decision]} ${app.name} แล้ว`);
      refresh();
    },
  });
  const pending = app.status === "pending";
  const face = faceMatchLabel(app.faceMatch);

  const submit = (decision: KycDecision) => {
    if (decision !== "approve" && !note.trim()) {
      setNoteError("เขียนเหตุผลถึงผู้สมัครก่อนปฏิเสธหรือขอเอกสารเพิ่ม");
      return;
    }
    setNoteError(undefined);
    decide.mutate(decision);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section aria-labelledby={`${id}-name`} className="rounded-lg border border-line bg-white p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`${id}-name`} className="text-[17px] font-semibold">
            {app.name}
          </h2>
          <span className="text-xs text-slate">
            {app.id} · ครั้งที่ {app.attempt}
          </span>
        </div>

        {!revealed ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-line-strong p-3">
            <div>
              <label htmlFor={`${id}-reason`} className="mb-1 block text-xs text-slate">
                เหตุผลที่เปิดดูเอกสาร (บันทึกทุกครั้ง)
              </label>
              <NativeSelect
                id={`${id}-reason`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 text-[13px]"
              >
                {viewReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </NativeSelect>
            </div>
            <Button size="sm" variant="outline" disabled={view.isPending} onClick={() => view.mutate()}>
              <Eye aria-hidden="true" />
              เปิดดูเอกสาร
            </Button>
            {view.isError && <p className="w-full text-xs text-danger">เปิดเอกสารไม่สำเร็จ ลองอีกครั้ง</p>}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DocumentPanel title="บัตรประชาชน (ปิดเลขหลังบัตร)" icon={IdCard} revealed={revealed}>
            OCR: {app.idCard.ocrName} · เลข {app.idCard.idMasked} · หมดอายุ {app.idCard.expiresYear}
          </DocumentPanel>
          <DocumentPanel title="เซลฟีคู่บัตร" icon={ScanFace} revealed={revealed}>
            เทียบใบหน้ากับรูปบนบัตร:{" "}
            <StatusPill tone={face.tone} className="h-5 px-2 text-[11px]">
              {face.text}
            </StatusPill>
          </DocumentPanel>
        </div>

        <table className="mt-4 w-full border-collapse text-[13px]">
          <caption className="sr-only">เทียบข้อมูลที่กรอกกับเอกสาร</caption>
          <thead className="bg-mist text-xs text-slate">
            <tr>
              <th scope="col" className="border-b border-line px-3 py-2 text-left font-semibold">
                ข้อมูล
              </th>
              <th scope="col" className="border-b border-line px-3 py-2 text-left font-semibold">
                ที่กรอก
              </th>
              <th scope="col" className="border-b border-line px-3 py-2 text-left font-semibold">
                จากเอกสาร
              </th>
              <th scope="col" className="border-b border-line px-3 py-2 text-left font-semibold">
                ผล
              </th>
            </tr>
          </thead>
          <tbody>
            {app.checks.map((c) => (
              <tr key={c.label}>
                <th scope="row" className="border-b border-line px-3 py-2 text-left font-normal text-slate">
                  {c.label}
                </th>
                {c.fromDocument === undefined ? (
                  <td colSpan={2} className="border-b border-line px-3 py-2">
                    {c.entered}
                  </td>
                ) : (
                  <>
                    <td className="border-b border-line px-3 py-2">{c.entered}</td>
                    <td className="border-b border-line px-3 py-2">{revealed ? c.fromDocument : "-"}</td>
                  </>
                )}
                <td className="border-b border-line px-3 py-2">
                  <StatusPill tone={checkTone[c.result]} className="h-5 px-2 text-[11px]">
                    {c.resultLabel}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {pending ? (
        <section aria-label="ผลการตรวจ" className="flex flex-col gap-3 rounded-lg border border-line bg-white p-[18px]">
          <label htmlFor={`${id}-note`} className="text-[13px] font-medium">
            ข้อความถึงผู้สมัคร
            <span className="font-normal text-slate"> (จำเป็นเมื่อปฏิเสธหรือขอเอกสารเพิ่ม)</span>
          </label>
          <textarea
            id={`${id}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            aria-invalid={Boolean(noteError) || undefined}
            aria-describedby={noteError ? `${id}-note-error` : undefined}
            className={cn(inputClass, "resize-y py-2 text-[13px]")}
          />
          {noteError && (
            <p id={`${id}-note-error`} className="-mt-2 text-xs text-danger">
              {noteError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto max-w-[460px] text-xs text-slate">
              อนุมัติแล้วผู้ใช้จะได้ป้าย “ยืนยันตัวตนแล้ว” และซื้อแพ็กเกจนายหน้าได้ทันที เอกสารจะถูกลบหลังปิดบัญชี 90
              วัน
            </p>
            <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => submit("request_info")}>
              ขอเอกสารเพิ่ม
            </Button>
            <Button variant="danger" size="sm" disabled={decide.isPending} onClick={() => submit("reject")}>
              ปฏิเสธ
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={decide.isPending || !revealed}
              title={revealed ? undefined : "เปิดดูเอกสารก่อนอนุมัติ"}
              onClick={() => submit("approve")}
            >
              อนุมัติ
            </Button>
          </div>
          {!revealed && <p className="-mt-1 text-right text-xs text-slate">เปิดดูเอกสารก่อนอนุมัติ</p>}
          {decide.isError && (
            <FormAlert>
              {decide.error instanceof ApiError && decide.error.status === 409
                ? "ใบสมัครนี้ถูกตัดสินไปแล้ว"
                : "บันทึกผลไม่สำเร็จ ลองอีกครั้ง"}
            </FormAlert>
          )}
        </section>
      ) : (
        <p className="rounded-lg border border-line bg-white px-4 py-3 text-[13px]">
          <StatusPill tone={kycStatusInfo[app.status].tone}>{kycStatusInfo[app.status].label}</StatusPill>{" "}
          {app.decidedBy && `โดย ${app.decidedBy}`}
          {app.note && <span className="mt-1 block text-slate">{app.note}</span>}
        </p>
      )}
    </div>
  );
}

/** E5: agent KYC review. ID vs selfie, a data match table, approve / reject / request more. */
export function KycReview() {
  const params = useSearchParams();
  const tab = tabs.find((t) => t === params.get("tab")) ?? "pending";
  const now = useNow(60_000);
  const { data, isPending, isError, refetch, isFetching } = useQuery(kycApplicationsQuery(tab));
  const rows = data?.data ?? [];
  const current = rows.find((a) => a.id === params.get("app")) ?? rows[0];

  return (
    <>
      <AdminPageHeader
        title="ยืนยันตัวตนนายหน้า"
        description="SLA 1 วันทำการ · เอกสารเปิดดูได้เฉพาะสิทธิ์ KYC และถูกบันทึกทุกครั้ง"
      />
      <AdminTabs
        label="สถานะการยืนยันตัวตน"
        current={tab}
        tabs={tabs.map((t) => ({
          value: t,
          label: kycStatusInfo[t].label,
          count: t === "pending" || t === "needs_info" ? data?.counts[t] : undefined,
        }))}
        href={(t) => appHref(t)}
      />
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดคิวยืนยันตัวตน" className="flex gap-4">
          <Skeleton className="h-80 w-[280px] rounded-lg" />
          <Skeleton className="h-80 flex-1 rounded-lg" />
        </div>
      ) : isError ? (
        <QueryError what="คิวยืนยันตัวตน" onRetry={() => refetch()} retrying={isFetching} />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-white py-10 text-center text-slate">ไม่มีใบสมัครในแท็บนี้</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="ใบสมัคร" className="overflow-hidden rounded-lg border border-line bg-white">
            <ul>
              {rows.map((a) => (
                <li key={a.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={appHref(tab, a.id)}
                    scroll={false}
                    aria-current={a.id === current?.id ? "true" : undefined}
                    className="block px-4 py-3 hover:bg-mist aria-[current=true]:bg-violet-50 aria-[current=true]:shadow-[inset_3px_0_0_var(--color-brand)]"
                  >
                    <span className="block font-semibold text-ink">{a.name}</span>
                    <span className="text-xs text-slate">
                      {a.affiliation}
                      {now !== null && ` · ส่งเมื่อ ${formatWait(now - Date.parse(a.submittedAt))} ที่แล้ว`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {current && <Application key={current.id} app={current} />}
        </div>
      )}
    </>
  );
}
