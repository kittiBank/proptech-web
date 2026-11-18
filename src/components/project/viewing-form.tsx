"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useId, useRef, useState, type FocusEvent, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, NativeSelect, TextField, fieldA11y } from "@/components/ui/field";
import { api } from "@/lib/api/endpoints";
import { useAuthGate, useResumeAction } from "@/lib/auth-gate";
import { formatThaiDate } from "@/lib/listing";
import { fieldErrors, requiredText, thaiPhone, validateField, type FieldErrors } from "@/lib/validation";
import type { ProjectDetail } from "@/types/property";

/** Local calendar date as YYYY-MM-DD (`toISOString` would shift it to UTC). */
function isoDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const viewingSchema = z.object({
  name: requiredText("กรอกชื่อของคุณ"),
  phone: thaiPhone,
  date: z
    .string()
    .min(1, "เลือกวันที่สะดวก")
    .refine((d) => d >= isoDay(new Date()), "เลือกวันนี้หรือวันถัดไป"),
  unitTypeId: z.string().optional(),
});

type Values = z.input<typeof viewingSchema>;

interface ViewingFormProps {
  project: ProjectDetail;
  /** Tells the desktop and bottom-sheet copies apart when a sign-in resumes the request. */
  instance: "aside" | "sheet";
  /** Unit type picked from the price table. */
  unitTypeId?: string;
  onUnitTypeChange?: (id: string) => void;
}

/** "นัดชมห้องตัวอย่าง": sends name, phone, date and unit type to the developer's sales team. */
export function ViewingForm({ project, instance, unitTypeId, onUnitTypeChange }: ViewingFormProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const requireAuth = useAuthGate();
  const gateKey = `${project.slug}:${instance}`;
  // Signed in from the login modal: send the request the visitor filled in.
  useResumeAction("viewing", gateKey, () => formRef.current?.requestSubmit());
  const [errors, setErrors] = useState<FieldErrors<Values>>({});
  const mutation = useMutation({
    mutationFn: (body: z.output<typeof viewingSchema>) => api.createProjectViewing(project.slug, body),
  });

  const read = (form: HTMLFormElement): Values => {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      date: String(data.get("date") ?? ""),
      unitTypeId: String(data.get("unitTypeId") ?? "") || undefined,
    };
  };

  const onBlur = (e: FocusEvent<HTMLFormElement>) => {
    const target = e.target as EventTarget as HTMLInputElement;
    const field = target.name as keyof Values;
    // Skip untouched empty fields so tabbing through the form does not shout.
    if (!(field in viewingSchema.shape) || !target.value) return;
    const message = validateField(viewingSchema, field, read(e.currentTarget));
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = viewingSchema.safeParse(read(e.currentTarget));
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    const body = result.data;
    requireAuth(
      {
        intent: "viewing",
        key: gateKey,
        preview: {
          title: project.name,
          subtitle: `นัดชมห้องตัวอย่าง ${formatThaiDate(body.date)}`,
          image: project.image,
        },
      },
      () => mutation.mutate(body),
    );
  };

  if (mutation.isSuccess) {
    const date = mutation.variables?.date;
    return (
      <div role="status" className="flex gap-3 rounded-md bg-success-soft p-4 text-[15px] text-ink">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <p>
          ส่งคำขอนัดชมแล้ว{date ? ` วันที่ ${formatThaiDate(date)}` : ""} ฝ่ายขายของโครงการจะโทรยืนยันเวลาภายใน 1
          วันทำการ
        </p>
      </div>
    );
  }

  const unitId = `${id}-unit`;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onBlur={onBlur}
      noValidate
      className="flex flex-col gap-3.5"
      aria-label="นัดชมห้องตัวอย่าง"
    >
      <TextField
        id={`${id}-name`}
        name="name"
        label="ชื่อ"
        autoComplete="name"
        placeholder="ชื่อของคุณ"
        error={errors.name}
      />
      <TextField
        id={`${id}-phone`}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        label="เบอร์โทร"
        placeholder="08x-xxx-xxxx"
        error={errors.phone}
      />
      <TextField
        id={`${id}-date`}
        name="date"
        type="date"
        label="วันที่สะดวก"
        min={isoDay(new Date())}
        error={errors.date}
      />
      <Field id={unitId} label="แบบห้องที่สนใจ">
        <NativeSelect
          {...fieldA11y(unitId)}
          name="unitTypeId"
          value={unitTypeId ?? ""}
          onChange={(e) => onUnitTypeChange?.(e.target.value)}
        >
          <option value="">ยังไม่แน่ใจ</option>
          {project.unitTypes.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.area} ตร.ม.)
            </option>
          ))}
        </NativeSelect>
      </Field>
      {mutation.isError && <FormAlert>ส่งคำขอไม่สำเร็จ ลองอีกครั้ง หรือโทรหาฝ่ายขายโครงการ</FormAlert>}
      <Button type="submit" size="lg" disabled={mutation.isPending} className="mt-1">
        {mutation.isPending ? "กำลังส่ง..." : "ส่งคำขอนัดชม"}
      </Button>
      <p className="text-[13px] text-slate">ฝ่ายขายของโครงการจะโทรยืนยันเวลาภายใน 1 วันทำการ</p>
    </form>
  );
}
