"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormAlert, NativeSelect, inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { FilterSelect } from "@/components/ui/select";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { adminRoutes } from "@/lib/admin";
import { paymentStatusInfo, userKindLabels, userStatusInfo, usersCsv } from "@/lib/admin-queues";
import { adminApi, adminKeys, adminUserQuery, adminUsersQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { downloadText } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import { formatThaiDate } from "@/lib/listing";
import { cn } from "@/lib/utils";
import {
  ADMIN_USERS_PAGE_SIZE,
  type AdminUserAction,
  type AdminUserDetailDto,
  type AdminUserJoined,
  type AdminUserKind,
  type AdminUserRowDto,
  type AdminUserStatus,
  type ListAdminUsersQuery,
} from "@/types/api";
import { AdminPageHeader } from "./admin-shell";
import { useAfterDecision } from "./admin-ui";

type KindFilter = AdminUserKind | "all";
type StatusFilter = AdminUserStatus | "all";

const kindOptions: { value: KindFilter; label: string }[] = [
  { value: "all", label: "ประเภท: ทั้งหมด" },
  ...(Object.keys(userKindLabels) as AdminUserKind[]).map((k) => ({ value: k, label: `ประเภท: ${userKindLabels[k]}` })),
];
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "สถานะ: ทั้งหมด" },
  ...(Object.keys(userStatusInfo) as AdminUserStatus[]).map((s) => ({
    value: s,
    label: `สถานะ: ${userStatusInfo[s].label}`,
  })),
];
const joinedOptions: { value: AdminUserJoined; label: string }[] = [
  { value: "all", label: "สมัคร: ทุกช่วง" },
  { value: "7d", label: "สมัคร: 7 วัน" },
  { value: "30d", label: "สมัคร: 30 วัน" },
  { value: "90d", label: "สมัคร: 90 วัน" },
];
const viaLabels = { email: "อีเมล", google: "Google", line: "LINE" } as const;
const revealReasons = ["ตรวจสอบรายงาน", "ติดต่อเรื่องความปลอดภัย", "ผู้ใช้ร้องขอ"];

function pick<T extends string>(value: string | null, options: { value: T }[], fallback: T): T {
  return options.some((o) => o.value === value) ? (value as T) : fallback;
}

function useUsersParams() {
  const params = useSearchParams();
  const query: ListAdminUsersQuery = {
    kind: pick(params.get("kind"), kindOptions, "all"),
    status: pick(params.get("status"), statusOptions, "all"),
    joined: pick(params.get("joined"), joinedOptions, "all"),
    q: params.get("q") ?? undefined,
    sharedWith: params.get("sharedWith") ?? undefined,
    page: Math.max(1, Number(params.get("page")) || 1),
  };
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    return `${adminRoutes.users}${qs ? `?${qs}` : ""}`;
  };
  return { query, selected: params.get("user") ?? undefined, href };
}

const Status = ({ status }: { status: AdminUserStatus }) => (
  <StatusPill tone={userStatusInfo[status].tone} className="h-5 px-2 text-[11px]">
    {userStatusInfo[status].label}
  </StatusPill>
);

function columns(href: (patch: Record<string, string | undefined>) => string): DataColumn<AdminUserRowDto>[] {
  return [
    {
      id: "user",
      header: "ผู้ใช้",
      cell: (u) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={u.name} size="sm" />
          <span className="min-w-0">
            <Link
              href={href({ user: u.id, page: undefined })}
              scroll={false}
              className="block truncate font-semibold text-ink hover:text-brand-strong"
            >
              {u.name}
            </Link>
            <span className="text-xs text-slate">{u.contact}</span>
          </span>
        </span>
      ),
    },
    { id: "kind", header: "ประเภท", cell: (u) => userKindLabels[u.kind] },
    {
      id: "status",
      header: "สถานะ",
      cell: (u) => (
        <span className="flex flex-wrap items-center gap-1">
          <Status status={u.status} />
          {u.sharedPhone && (
            <StatusPill tone="warning" className="h-5 px-2 text-[11px]">
              เบอร์ซ้ำ
            </StatusPill>
          )}
        </span>
      ),
    },
    { id: "listings", header: "ประกาศ", align: "right", cell: (u) => formatNumber(u.listings) },
    { id: "paid", header: "ยอดจ่ายรวม", align: "right", cell: (u) => `฿${formatNumber(u.totalPaid)}` },
  ];
}

/** Suspend, ban or message: each needs a reason (or the message) and goes to the audit log. */
function ActionDialog({
  user,
  action,
  onClose,
}: {
  user: AdminUserDetailDto;
  action: Exclude<AdminUserAction, "unsuspend"> | null;
  onClose: () => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const refresh = useAfterDecision(adminKeys.users);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (a: AdminUserAction) =>
      adminApi.actOnUser(
        user.id,
        a === "message" ? { action: a, message: text.trim() } : { action: a, reason: text.trim() },
      ),
    onSuccess: ({ data }, a) => {
      client.setQueryData(adminKeys.user(user.id), { data });
      client.invalidateQueries({ queryKey: ["admin", "reports"] });
      refresh();
      toast(
        a === "message"
          ? `ส่งข้อความถึง ${user.name} แล้ว`
          : a === "ban"
            ? `แบน ${user.name} ถาวรแล้ว`
            : `ระงับ ${user.name} แล้ว`,
      );
      setText("");
      onClose();
    },
  });
  const copy = {
    suspend: {
      title: `ระงับบัญชี ${user.name}?`,
      body: "ประกาศทั้งหมดของบัญชีนี้จะถูกซ่อน ยกเลิกการระงับได้ภายหลัง",
      label: "เหตุผล",
      cta: "ระงับบัญชี",
    },
    ban: {
      title: `แบน ${user.name} ถาวร?`,
      body: "บัญชีจะเข้าใช้งานไม่ได้อีกและยกเลิกไม่ได้จากหน้านี้",
      label: "เหตุผล",
      cta: "แบนถาวร",
    },
    message: {
      title: `ส่งข้อความถึง ${user.name}`,
      body: "ผู้ใช้จะได้รับทางการแจ้งเตือนและอีเมล",
      label: "ข้อความ",
      cta: "ส่งข้อความ",
    },
  };
  const c = action ? copy[action] : copy.message;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!action) return;
    if (!text.trim()) {
      setError(action === "message" ? "เขียนข้อความ" : "ระบุเหตุผล");
      return;
    }
    setError(undefined);
    mutation.mutate(action);
  };

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) {
          mutation.reset();
          setError(undefined);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:w-[460px]">
        <form onSubmit={submit} noValidate className="flex flex-col gap-3 p-6">
          <DialogTitle className="pr-10 text-lg font-semibold text-ink">{c.title}</DialogTitle>
          <DialogDescription className="text-sm text-slate">{c.body}</DialogDescription>
          <label htmlFor={`${id}-text`} className="text-[13px] font-medium">
            {c.label}
          </label>
          <textarea
            id={`${id}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={500}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(inputClass, "resize-y py-2 text-[13px]")}
            autoFocus
          />
          {error && (
            <p id={`${id}-error`} className="-mt-1 text-xs text-danger">
              {error}
            </p>
          )}
          {mutation.isError && <FormAlert>ดำเนินการไม่สำเร็จ ลองอีกครั้ง</FormAlert>}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" size="base" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              size="base"
              variant={action === "message" ? "primary" : "danger-solid"}
              disabled={mutation.isPending}
            >
              {c.cta}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const time = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

type DetailTab = "listings" | "reports" | "payments" | "activity";

function UserDetail({ id }: { id: string }) {
  const uid = useId();
  const { href } = useUsersParams();
  const { data, isPending, isError, refetch, isFetching } = useQuery(adminUserQuery(id));
  const [tab, setTab] = useState<DetailTab>("listings");
  const [dialog, setDialog] = useState<Exclude<AdminUserAction, "unsuspend"> | null>(null);
  const [reason, setReason] = useState(revealReasons[0]);
  const client = useQueryClient();
  const refresh = useAfterDecision(adminKeys.users);
  const reveal = useMutation({ mutationFn: () => adminApi.revealPhone(id, reason) });
  const unsuspend = useMutation({
    mutationFn: () => adminApi.actOnUser(id, { action: "unsuspend" }),
    onSuccess: ({ data: user }) => {
      client.setQueryData(adminKeys.user(id), { data: user });
      client.invalidateQueries({ queryKey: ["admin", "reports"] });
      refresh();
      toast(`ยกเลิกการระงับ ${user.name} แล้ว`);
    },
  });

  if (isPending) return <Skeleton className="h-96 rounded-lg" />;
  if (isError) return <QueryError what="ข้อมูลผู้ใช้" onRetry={() => refetch()} retrying={isFetching} />;
  const u = data.data;
  const tabs: { value: DetailTab; label: string }[] = [
    { value: "listings", label: `ประกาศ ${u.listingItems.length}` },
    { value: "reports", label: `รายงาน ${u.reports.length}` },
    { value: "payments", label: "การชำระเงิน" },
    { value: "activity", label: "บันทึก" },
  ];
  const restricted = u.status === "suspended" || u.status === "banned";

  return (
    <aside
      aria-labelledby={`${uid}-name`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-white p-[18px]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${uid}-name`} className="text-[17px] font-semibold">
          {u.name}
        </h2>
        <Status status={u.status} />
      </div>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-slate">สมัคร</dt>
        <dd>
          {formatThaiDate(u.joinedAt)} ผ่าน {viaLabels[u.joinedVia]} · {userKindLabels[u.kind]}
        </dd>
        <dt className="text-slate">เบอร์</dt>
        <dd className="flex flex-col gap-1.5">
          <span>
            {u.phoneVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
            {u.sharedPhoneWith.length > 0 && (
              <>
                {" "}
                · <span className="font-medium text-warning">ใช้ร่วมกับอีก {u.sharedPhoneWith.length} บัญชี</span>{" "}
                <Link
                  href={href({ sharedWith: u.id, user: undefined, q: undefined })}
                  className="text-brand-strong underline underline-offset-2"
                >
                  ดู
                </Link>
              </>
            )}
          </span>
          {reveal.data ? (
            <span className="font-mono">{reveal.data.data.phone}</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <label htmlFor={`${uid}-reason`} className="sr-only">
                เหตุผลที่เปิดดูเบอร์เต็ม
              </label>
              <NativeSelect
                id={`${uid}-reason`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-8 py-0 text-xs"
              >
                {revealReasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </NativeSelect>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={reveal.isPending}
                onClick={() => reveal.mutate()}
              >
                ดูเบอร์เต็ม
              </Button>
            </span>
          )}
        </dd>
        <dt className="text-slate">อุปกรณ์</dt>
        <dd>
          {u.device}
          {u.networkNote && <span className="block text-danger">{u.networkNote}</span>}
        </dd>
        {u.suspension && (
          <>
            <dt className="text-slate">{u.status === "banned" ? "แบนเมื่อ" : "ระงับเมื่อ"}</dt>
            <dd>
              {time.format(new Date(u.suspension.at))} โดย {u.suspension.by}
              <span className="block text-slate">เหตุ: {u.suspension.reason || "-"}</span>
            </dd>
          </>
        )}
      </dl>

      <div role="tablist" aria-label="ข้อมูลผู้ใช้" className="flex gap-3.5 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.value}`}
            aria-selected={tab === t.value}
            aria-controls={`${uid}-panel`}
            onClick={() => setTab(t.value)}
            className={cn(
              "relative h-9 shrink-0 font-medium whitespace-nowrap text-slate hover:text-ink",
              tab === t.value &&
                "font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`} className="text-[13px]">
        {tab === "listings" &&
          (u.listingItems.length ? (
            <ul>
              {u.listingItems.map((l) => (
                <li
                  key={l.code}
                  className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-b-0"
                >
                  <a
                    href={routes.property(l.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate hover:text-brand-strong"
                  >
                    {l.code} {l.title}
                  </a>
                  <StatusPill tone={l.hidden ? "neutral" : "success"} className="h-5 px-2 text-[11px]">
                    {l.hidden ? "ซ่อน" : "แสดงอยู่"}
                  </StatusPill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-slate">-</p>
          ))}
        {tab === "reports" &&
          (u.reports.length ? (
            <ul>
              {u.reports.map((r) => (
                <li key={r.id} className="border-b border-line py-2 last:border-b-0">
                  <Link href={`${adminRoutes.reports}?case=${r.id}`} className="hover:text-brand-strong">
                    {r.id} {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-slate">-</p>
          ))}
        {tab === "payments" &&
          (u.payments.length ? (
            <ul>
              {u.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-b-0"
                >
                  <span>
                    {p.id} {p.item}
                  </span>
                  <span className="tabular-nums">฿{formatNumber(p.amount)}</span>
                  <StatusPill tone={paymentStatusInfo[p.status].tone} className="h-5 px-2 text-[11px]">
                    {paymentStatusInfo[p.status].label}
                  </StatusPill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-slate">-</p>
          ))}
        {tab === "activity" &&
          (u.activity.length ? (
            <ul>
              {u.activity.map((e) => (
                <li key={e.id} className="border-b border-line py-2 last:border-b-0">
                  {time.format(new Date(e.at))} · {e.actor.name}: {e.action}
                  {e.note && <span className="block text-slate">{e.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-slate">-</p>
          ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {u.status === "suspended" ? (
          <Button variant="outline" size="sm" disabled={unsuspend.isPending} onClick={() => unsuspend.mutate()}>
            ยกเลิกการระงับ
          </Button>
        ) : (
          !restricted && (
            <Button variant="danger" size="sm" onClick={() => setDialog("suspend")}>
              ระงับบัญชี
            </Button>
          )
        )}
        <Button variant="outline" size="sm" onClick={() => setDialog("message")}>
          ส่งข้อความ
        </Button>
        {u.status !== "banned" && (
          <Button variant="danger-solid" size="sm" className="ml-auto" onClick={() => setDialog("ban")}>
            แบนถาวร
          </Button>
        )}
      </div>
      {(unsuspend.isError || reveal.isError) && <FormAlert>ดำเนินการไม่สำเร็จ ลองอีกครั้ง</FormAlert>}
      <p className="text-xs text-slate">แอดมินไม่เห็นรหัสผ่านหรือข้อมูลบัตร · การเปิดดูเบอร์เต็มต้องระบุเหตุผล</p>
      <ActionDialog user={u} action={dialog} onClose={() => setDialog(null)} />
    </aside>
  );
}

/** E6: accounts with filters and a detail panel (suspend / ban, shared-phone signal). */
export function UsersView() {
  const router = useRouter();
  const { query, selected, href } = useUsersParams();
  const { data, isPending, isError, refetch, isFetching } = useQuery(adminUsersQuery(query));
  const [exporting, setExporting] = useState(false);
  const rows = data?.data ?? [];
  const current = selected ?? rows[0]?.id;
  const meta = data?.meta;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: AdminUserRowDto[] = [];
      for (let page = 1; ; page++) {
        const res = await adminApi.users({ ...query, page });
        all.push(...res.data);
        if (page >= res.meta.totalPages) break;
      }
      downloadText("users.csv", usersCsv(all));
    } catch (error) {
      toast(error instanceof ApiError ? "ส่งออกไม่สำเร็จ" : "ส่งออกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="ผู้ใช้"
        description={data ? `ทั้งหมด ${formatNumber(data.platformTotal)} บัญชี` : undefined}
        actions={
          <Button variant="outline" size="sm" disabled={exporting || !meta?.total} onClick={exportCsv}>
            <Download aria-hidden="true" />
            ส่งออก
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <form
          key={query.q ?? ""}
          role="search"
          className="relative w-full max-w-[280px]"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.replace(href({ q: q || undefined, user: undefined }));
          }}
        >
          <label htmlFor="users-q" className="sr-only">
            ค้นหาผู้ใช้
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate"
            aria-hidden="true"
          />
          <input
            id="users-q"
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            placeholder="ชื่อ รหัส อีเมล หรือเบอร์"
            className={cn(inputClass, "h-11 pl-9 text-[14px]")}
          />
        </form>
        <FilterSelect
          label="ประเภท"
          value={query.kind!}
          options={kindOptions}
          onChange={(v) => router.replace(href({ kind: v === "all" ? undefined : v }))}
        />
        <FilterSelect
          label="สถานะ"
          value={query.status!}
          options={statusOptions}
          onChange={(v) => router.replace(href({ status: v === "all" ? undefined : v }))}
        />
        <FilterSelect
          label="สมัคร"
          value={query.joined!}
          options={joinedOptions}
          onChange={(v) => router.replace(href({ joined: v === "all" ? undefined : v }))}
        />
        {query.sharedWith && (
          <Button asChild variant="outline" size="sm" className="h-11">
            <Link href={href({ sharedWith: undefined })}>
              บัญชีที่ใช้เบอร์ร่วมกับ {query.sharedWith}
              <X aria-label="ล้างตัวกรอง" />
            </Link>
          </Button>
        )}
      </div>
      {isPending ? (
        <div
          role="status"
          aria-label="กำลังโหลดผู้ใช้"
          className="flex flex-col gap-2 rounded-lg border border-line bg-white p-4"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="รายชื่อผู้ใช้" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <DataTable
            caption="ผู้ใช้"
            columns={columns(href)}
            rows={rows}
            getRowId={(u) => u.id}
            currentRowId={current}
            onRowClick={(u) =>
              router.replace(href({ user: u.id, page: meta && meta.page > 1 ? String(meta.page) : undefined }), {
                scroll: false,
              })
            }
            pagination={
              meta && meta.totalPages > 1
                ? {
                    page: meta.page,
                    pageCount: meta.totalPages,
                    onPageChange: (page) => router.replace(href({ page: String(page) })),
                  }
                : undefined
            }
            footer={
              meta && (
                <span className="tabular-nums">
                  {meta.total ? (meta.page - 1) * ADMIN_USERS_PAGE_SIZE + 1 : 0} ถึง{" "}
                  {Math.min(meta.page * ADMIN_USERS_PAGE_SIZE, meta.total)} จาก {formatNumber(meta.total)}
                </span>
              )
            }
            empty={<p className="py-10 text-center text-slate">ไม่พบผู้ใช้ตามเงื่อนไข</p>}
          />
          {current && <UserDetail key={current} id={current} />}
        </div>
      )}
    </>
  );
}
