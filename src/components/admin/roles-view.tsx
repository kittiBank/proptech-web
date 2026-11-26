"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FormAlert, NativeSelect, TextField, fieldA11y } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { toast } from "@/components/ui/toast";
import { auditLogCsv, formatAuditTime, roleLabels } from "@/lib/admin";
import { adminApi, adminKeys, adminRolesQuery, auditLogQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { downloadText } from "@/lib/csv";
import { bangkokDay } from "@/lib/format";
import type { AdminRoleDto, AdminRoleId, AuditEntryDto } from "@/types/api";
import { AdminCard } from "./admin-dashboard";
import { AdminPageHeader } from "./admin-shell";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleColumns: DataColumn<AdminRoleDto>[] = [
  { id: "name", header: "บทบาท", cell: (r) => <span className="font-semibold">{r.name}</span> },
  { id: "can", header: "ทำอะไรได้", cell: (r) => <span className="text-slate">{r.description}</span> },
  { id: "members", header: "คน", align: "right", cell: (r) => r.members },
];

const auditColumns: DataColumn<AuditEntryDto>[] = [
  {
    id: "at",
    header: "เวลา",
    className: "w-16",
    cell: (e) => (
      <time dateTime={e.at} className="tabular-nums">
        {formatAuditTime(e.at)}
      </time>
    ),
  },
  {
    id: "actor",
    header: "ผู้ทำ",
    cell: (e) => (
      <>
        {e.actor.name}
        <span className="block text-xs text-slate">{roleLabels[e.actor.role]}</span>
      </>
    ),
  },
  { id: "action", header: "การกระทำ", cell: (e) => e.action },
  { id: "note", header: "หมายเหตุ", cell: (e) => <span className="text-xs text-slate">{e.note}</span> },
];

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const id = useId();
  const client = useQueryClient();
  const [emailError, setEmailError] = useState<string>();
  const mutation = useMutation({
    mutationFn: adminApi.invite,
    onSuccess: ({ data }) => {
      client.invalidateQueries({ queryKey: ["admin", "audit-log"] });
      client.invalidateQueries({ queryKey: adminKeys.roles });
      toast(`ส่งคำเชิญถึง ${data.email} แล้ว`);
      onOpenChange(false);
    },
  });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const role = String(form.get("role")) as AdminRoleId;
    const error = !email ? "กรอกอีเมล" : EMAIL.test(email) ? undefined : "รูปแบบอีเมลไม่ถูกต้อง";
    setEmailError(error);
    if (!error) mutation.mutate({ email, role });
  };

  const taken = mutation.error instanceof ApiError && mutation.error.status === 409;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          mutation.reset();
          setEmailError(undefined);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:w-[440px]">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-6">
          <div className="pr-10">
            <DialogTitle className="text-lg font-semibold text-ink">เชิญแอดมิน</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate">
              ผู้ได้รับเชิญต้องยืนยันอีเมลและตั้ง 2FA ก่อนเข้าใช้งาน คำเชิญหมดอายุใน 7 วัน
            </DialogDescription>
          </div>
          <TextField
            id={`${id}-email`}
            name="email"
            type="email"
            label="อีเมลบริษัท"
            placeholder="name@propertyhub.co.th"
            error={emailError}
            autoFocus
          />
          <Field id={`${id}-role`} label="บทบาท">
            <NativeSelect {...fieldA11y(`${id}-role`)} name="role" defaultValue="moderator" className="h-11">
              {(Object.keys(roleLabels) as AdminRoleId[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {mutation.isError && (
            <FormAlert>{taken ? "อีเมลนี้เป็นแอดมินหรือได้รับเชิญแล้ว" : "ส่งคำเชิญไม่สำเร็จ ลองอีกครั้ง"}</FormAlert>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="base" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" size="base" disabled={mutation.isPending}>
              {mutation.isPending ? "กำลังส่ง…" : "ส่งคำเชิญ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2 px-4 pb-4">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
  );
}

/** E10: what each role may do, and the read-only audit log for a day. */
export function RolesView() {
  const id = useId();
  const [inviting, setInviting] = useState(false);
  const [today] = useState(() => bangkokDay(new Date()));
  const [date, setDate] = useState(today);
  const roles = useQuery(adminRolesQuery);
  const audit = useQuery(auditLogQuery(date));
  const entries = audit.data?.data ?? [];

  return (
    <>
      <AdminPageHeader title="สิทธิ์และบันทึกการใช้งาน" description="ใครทำอะไรได้ และทำอะไรไปแล้ว" />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <h2 className="text-[15px] font-semibold text-ink">บทบาท</h2>
            <Button size="sm" onClick={() => setInviting(true)}>
              <UserPlus aria-hidden="true" />
              เชิญแอดมิน
            </Button>
          </div>
          {roles.isPending ? (
            <TableSkeleton label="กำลังโหลดบทบาท" />
          ) : roles.isError ? (
            <QueryError what="บทบาท" onRetry={() => roles.refetch()} retrying={roles.isFetching} className="m-4" />
          ) : (
            <DataTable
              caption="บทบาทแอดมิน"
              columns={roleColumns}
              rows={roles.data.data}
              getRowId={(r) => r.id}
              className="rounded-none border-x-0"
            />
          )}
          <p className="px-4 py-3 text-xs text-slate">
            แอดมินทุกคนต้องเปิด 2FA · เข้าใช้งานได้เฉพาะเครือข่ายบริษัทหรือ VPN
          </p>
        </section>

        <AdminCard title="บันทึกการใช้งาน" flush>
          <div className="-mt-1 flex flex-wrap items-end gap-2 px-4 pb-3">
            <div>
              <label htmlFor={`${id}-date`} className="mb-1 block text-xs text-slate">
                วันที่
              </label>
              <input
                id={`${id}-date`}
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="h-9 rounded-md border border-line-strong bg-white px-2.5 text-[13px] text-ink"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={entries.length === 0}
              onClick={() => downloadText(`audit-log-${date}.csv`, auditLogCsv(date, entries))}
            >
              <Download aria-hidden="true" />
              ส่งออก
            </Button>
          </div>
          {audit.isPending ? (
            <TableSkeleton label="กำลังโหลดบันทึกการใช้งาน" />
          ) : audit.isError ? (
            <QueryError
              what="บันทึกการใช้งาน"
              onRetry={() => audit.refetch()}
              retrying={audit.isFetching}
              className="m-4"
            />
          ) : (
            <DataTable
              caption={`บันทึกการใช้งานวันที่ ${date}`}
              columns={auditColumns}
              rows={entries}
              getRowId={(e) => e.id}
              empty={<p className="py-6 text-center text-slate">ไม่มีบันทึกในวันนี้</p>}
              className="rounded-none border-x-0"
            />
          )}
          <p className="px-4 py-3 text-xs text-slate">บันทึกแก้ไขหรือลบไม่ได้ · เก็บ 2 ปี</p>
        </AdminCard>
      </div>
      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </>
  );
}
