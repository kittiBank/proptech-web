"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { RadioCard, SegmentedControl } from "@/components/ui/choice";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { formatBaht, isValidTaxId } from "@/lib/billing";
import { CREDIT_TOP_UPS, type TaxProfileDto } from "@/types/api";
import { useCreateOrder, useUpdateBilling } from "./use-billing-actions";

const dialogHead = "border-b border-line px-5 pt-5 pr-14 pb-4 sm:px-6";
const dialogBody = "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 sm:px-6";
const dialogFoot = "flex justify-end gap-2 border-t border-line px-5 py-4 sm:px-6";

/** "เติมเครดิต": pick an amount, then pay it at checkout. */
export function TopUpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState<number>(1000);
  const order = useCreateOrder();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:w-[min(440px,calc(100vw-48px))]">
        <div className={dialogHead}>
          <DialogTitle className="text-xl font-semibold text-ink">เติมเครดิต</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate">
            ใช้จ่ายค่าโปรโมตได้ทันที ไม่มีวันหมดอายุ ราคารวม VAT
          </DialogDescription>
        </div>
        <fieldset className={dialogBody}>
          <legend className="sr-only">จำนวนเงิน</legend>
          {CREDIT_TOP_UPS.map((a) => (
            <RadioCard
              key={a}
              name="top-up"
              checked={amount === a}
              onChange={() => setAmount(a)}
              title={formatBaht(a)}
              description={a >= 2000 ? "เหมาะกับการโปรโมตหลายประกาศ" : undefined}
            />
          ))}
        </fieldset>
        <div className={dialogFoot}>
          <Button variant="outline" size="base" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            size="base"
            disabled={order.isPending}
            onClick={() => order.mutate({ kind: "credit", amount }, { onSuccess: onClose })}
          >
            ไปชำระเงิน {formatBaht(amount)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type TaxErrors = Partial<Record<keyof TaxProfileDto, string>>;

function validateTax(p: TaxProfileDto): TaxErrors {
  const e: TaxErrors = {};
  if (!p.name.trim()) e.name = p.type === "company" ? "ใส่ชื่อบริษัท" : "ใส่ชื่อ-นามสกุล";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = "อีเมลไม่ถูกต้อง";
  if (p.type === "company" || p.taxId) {
    if (!p.taxId || !isValidTaxId(p.taxId)) e.taxId = "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลักและถูกต้อง";
  }
  if (p.type === "company" && !p.address?.trim()) e.address = "ใส่ที่อยู่ตามหนังสือรับรองบริษัท";
  return e;
}

/** "ข้อมูลออกใบกำกับภาษี": person or company, tax id and address. */
export function TaxProfileDialog({
  open,
  value,
  onClose,
}: {
  open: boolean;
  value: TaxProfileDto;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:w-[min(520px,calc(100vw-48px))]">
        {open && <TaxForm value={value} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TaxForm({ value, onClose }: { value: TaxProfileDto; onClose: () => void }) {
  const [p, setP] = useState(value);
  const [errors, setErrors] = useState<TaxErrors>({});
  const save = useUpdateBilling();
  const set = (patch: Partial<TaxProfileDto>) => setP({ ...p, ...patch });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateTax(p);
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate({ taxProfile: { ...p, taxId: p.taxId?.replace(/\D/g, "") || undefined } }, { onSuccess: onClose });
  };
  const company = p.type === "company";

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className={dialogHead}>
        <DialogTitle className="text-xl font-semibold text-ink">ข้อมูลออกใบกำกับภาษี</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate">ใช้กับใบกำกับภาษีทุกใบหลังจากนี้</DialogDescription>
      </div>
      <div className={dialogBody}>
        <SegmentedControl
          label="ออกในนาม"
          value={p.type}
          options={[
            { value: "company", label: "นิติบุคคล" },
            { value: "personal", label: "บุคคลธรรมดา" },
          ]}
          onChange={(type) => set({ type })}
          className="self-start"
        />
        <TextField
          id="tax-name"
          label={company ? "ชื่อบริษัท" : "ชื่อ-นามสกุล"}
          value={p.name}
          onChange={(e) => set({ name: e.target.value })}
          error={errors.name}
        />
        <TextField
          id="tax-id"
          label={company ? "เลขประจำตัวผู้เสียภาษี" : "เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)"}
          inputMode="numeric"
          maxLength={17}
          value={p.taxId ?? ""}
          onChange={(e) => set({ taxId: e.target.value })}
          error={errors.taxId}
        />
        {company && (
          <TextField
            id="tax-branch"
            label="สาขา"
            hint="เช่น สำนักงานใหญ่ หรือ สาขาที่ 00001"
            value={p.branch ?? ""}
            onChange={(e) => set({ branch: e.target.value })}
          />
        )}
        <TextField
          id="tax-address"
          label={company ? "ที่อยู่" : "ที่อยู่ (ไม่บังคับ)"}
          value={p.address ?? ""}
          onChange={(e) => set({ address: e.target.value })}
          error={errors.address}
        />
        <TextField
          id="tax-email"
          label="อีเมลรับใบกำกับภาษี"
          type="email"
          value={p.email}
          onChange={(e) => set({ email: e.target.value })}
          error={errors.email}
        />
      </div>
      <div className={dialogFoot}>
        <Button type="button" variant="outline" size="base" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit" size="base" disabled={save.isPending}>
          บันทึก
        </Button>
      </div>
    </form>
  );
}

/** "ยกเลิกต่ออายุ": confirm, the plan stays until the end of the period. */
export function CancelRenewalDialog({ open, until, onClose }: { open: boolean; until: string; onClose: () => void }) {
  const save = useUpdateBilling();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:w-[min(440px,calc(100vw-48px))]">
        <div className="p-6 pr-14">
          <DialogTitle className="text-xl font-semibold text-ink">ยกเลิกการต่ออายุ?</DialogTitle>
          <DialogDescription className="mt-2 text-[15px] text-slate">
            ใช้แพ็กเกจต่อได้ถึง {until} หลังจากนั้นประกาศที่เกินโควตาฟรีจะถูกพักไว้ เปิดต่ออายุใหม่ได้ทุกเมื่อ
          </DialogDescription>
        </div>
        <div className={dialogFoot}>
          <Button variant="outline" size="base" onClick={onClose}>
            ใช้ต่อ
          </Button>
          <Button
            variant="danger-solid"
            size="base"
            disabled={save.isPending}
            onClick={() => save.mutate({ autoRenew: false }, { onSuccess: onClose })}
          >
            ยกเลิกต่ออายุ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
