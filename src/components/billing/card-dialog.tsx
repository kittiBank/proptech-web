"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { cardBrand, formatCardNumber, formatExpiry, isValidCardNumber, isValidExpiry } from "@/lib/billing";
import type { SavedCardDto } from "@/types/api";
import { useAddCard } from "./use-billing-actions";

type Errors = Partial<Record<"number" | "expiry" | "name", string>>;

function validate(v: { number: string; expiry: string; name: string }): Errors {
  const errors: Errors = {};
  if (!isValidCardNumber(v.number) || !cardBrand(v.number))
    errors.number = "เลขบัตรไม่ถูกต้อง รองรับ Visa, Mastercard และ JCB";
  if (!isValidExpiry(v.expiry)) errors.expiry = "ใส่วันหมดอายุเป็น ดด/ปป และต้องยังไม่หมดอายุ";
  if (!v.name.trim()) errors.name = "ใส่ชื่อบนบัตร";
  return errors;
}

/** "+ เพิ่มบัตร": number, expiry and name. The mock keeps only the brand, last 4 digits and expiry. */
export function AddCardDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (card: SavedCardDto) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:w-[min(440px,calc(100vw-48px))]">
        {open && <CardForm onClose={onClose} onAdded={onAdded} />}
      </DialogContent>
    </Dialog>
  );
}

function CardForm({ onClose, onAdded }: { onClose: () => void; onAdded?: (card: SavedCardDto) => void }) {
  const [values, setValues] = useState({ number: "", expiry: "", name: "" });
  const [errors, setErrors] = useState<Errors>({});
  const add = useAddCard();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    add.mutate(values, {
      onSuccess: ({ data }) => {
        onAdded?.(data);
        onClose();
      },
      onError: () => setErrors({ number: "ธนาคารไม่รับบัตรนี้ ตรวจเลขบัตรอีกครั้ง" }),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 pt-5 pr-14 pb-4 sm:px-6">
        <DialogTitle className="text-xl font-semibold text-ink">เพิ่มบัตร</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate">
          เข้ารหัสและเก็บโดยผู้ให้บริการชำระเงิน PropertyHub ไม่เห็นเลขบัตรเต็ม
        </DialogDescription>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 sm:px-6">
        <TextField
          id="card-number"
          label="เลขบัตร"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={values.number}
          onChange={(e) => setValues({ ...values, number: formatCardNumber(e.target.value) })}
          error={errors.number}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="card-expiry"
            label="วันหมดอายุ"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="ดด/ปป"
            value={values.expiry}
            onChange={(e) => setValues({ ...values, expiry: formatExpiry(e.target.value) })}
            error={errors.expiry}
          />
          <TextField id="card-cvc" label="CVC" inputMode="numeric" autoComplete="cc-csc" maxLength={4} />
        </div>
        <TextField
          id="card-name"
          label="ชื่อบนบัตร"
          autoComplete="cc-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={errors.name}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" size="base" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit" size="base" disabled={add.isPending}>
          {add.isPending ? "กำลังบันทึก…" : "บันทึกบัตร"}
        </Button>
      </div>
    </form>
  );
}
