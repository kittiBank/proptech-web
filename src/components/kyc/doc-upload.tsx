"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { describeImage } from "@/lib/image-preview";
import { kycFileError, kycSlots } from "@/lib/kyc";
import { cn } from "@/lib/utils";
import type { KycDocSlot, KycDocumentDto } from "@/types/api";
import { useRemoveKycDocument, useUploadKycDocument } from "./use-kyc-actions";

interface DocUploadProps {
  slot: KycDocSlot;
  doc?: KycDocumentDto;
  /** Locked once submitted. */
  disabled?: boolean;
  /** Amber outline when the reviewer asked for this file again. */
  attention?: boolean;
  className?: string;
}

/**
 * One verification file (C16): a drop zone or file picker, then the preview
 * with replace and remove. Files are checked here and again by the API.
 */
export function DocUpload({ slot, doc, disabled, attention, className }: DocUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadKycDocument();
  const remove = useRemoveKycDocument();
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const { label, accept } = kycSlots[slot];
  const busy = upload.isPending || remove.isPending;

  const send = async (file: File) => {
    const mimeType = file.type || "application/octet-stream";
    const problem = kycFileError(slot, { mimeType, size: file.size });
    setError(problem);
    if (problem) return;
    const preview = mimeType === "application/pdf" ? undefined : (await describeImage(file)).preview;
    upload.mutate(
      { slot, name: file.name, mimeType, size: file.size, preview },
      {
        onError: (err) =>
          setError(
            err instanceof ApiError && err.status === 400
              ? String(err.body?.message ?? "").replace(/^file: /, "") || "ไฟล์นี้ใช้ไม่ได้"
              : "อัปโหลดไม่สำเร็จ ลองอีกครั้ง",
          ),
      },
    );
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !disabled) void send(file);
  };

  const picker = (
    <input
      ref={input}
      id={id}
      type="file"
      accept={accept.join(",")}
      className="sr-only"
      disabled={disabled || busy}
      aria-describedby={error ? `${id}-error` : undefined}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void send(file);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {doc ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-[10px] border bg-white p-3",
            attention ? "border-warning-line ring-3 ring-warning-soft" : "border-line",
          )}
        >
          {doc.preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- user upload preview
            <img src={doc.preview} alt={`ตัวอย่าง${label}`} className="h-16 w-24 shrink-0 rounded object-cover" />
          ) : (
            <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded bg-mist text-slate">
              <FileText className="size-6" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block truncate font-medium text-ink">{doc.name}</span>
            <span className={attention ? "font-medium text-warning" : "text-slate"}>
              {attention ? "ทีมงานขอไฟล์ใหม่" : upload.isPending ? "กำลังอัปโหลด…" : "อัปโหลดแล้ว"}
            </span>
          </span>
          {!disabled && (
            <span className="flex shrink-0 gap-1">
              <label
                htmlFor={id}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-mist has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
              >
                {picker}
                <RefreshCw className="size-[18px]" aria-hidden="true" />
                <span className="sr-only">เปลี่ยนไฟล์{label}</span>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove.mutate(slot)}
                className="inline-flex size-10 items-center justify-center rounded-md text-danger hover:bg-danger-soft"
              >
                <Trash2 className="size-[18px]" aria-hidden="true" />
                <span className="sr-only">ลบไฟล์{label}</span>
              </button>
            </span>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed p-4 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
            dragging ? "border-brand bg-brand-soft" : "border-violet-200 bg-[#FAF8FF] hover:border-brand",
            attention && "border-warning-line",
            (disabled || busy) && "cursor-not-allowed opacity-60",
          )}
        >
          {picker}
          <Upload className="size-[30px] text-brand" aria-hidden="true" />
          <span className="font-semibold text-ink">
            {upload.isPending ? "กำลังอัปโหลด…" : "อัปโหลดไฟล์"}
            <span className="sr-only"> {label}</span>
          </span>
          <span className="text-[13px] text-slate">
            ลากไฟล์มาวาง หรือกดเพื่อเลือก {slot === "company" ? "JPG, PNG, PDF" : "JPG, PNG, HEIC"} ไม่เกิน 10 MB
          </span>
        </label>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
