"use client";

import { useRef, useState, type DragEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Star, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import type { DraftPhoto } from "@/types/api";
import { GroupError, WizardCard, type StepProps } from "./shared";
import { describeImage } from "@/lib/image-preview";

interface Upload {
  key: string;
  name: string;
  /** Local preview while the upload runs. */
  url: string;
  progress: number;
  failed?: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/webp";

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const tileButton =
  "inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-white disabled:opacity-40";

function PhotoTile({
  photo,
  index,
  count,
  isCover,
  onMove,
  onCover,
  onRemove,
  dragProps,
}: {
  photo: DraftPhoto;
  index: number;
  count: number;
  isCover: boolean;
  onMove: (to: number) => void;
  onCover: () => void;
  onRemove: () => void;
  dragProps: Record<string, unknown>;
}) {
  const rejected = photo.status === "rejected";
  return (
    <li
      {...dragProps}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-lg bg-violet-50",
        rejected ? "ring-2 ring-danger" : "cursor-grab active:cursor-grabbing",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user upload preview */}
      <img src={photo.url} alt={photo.name} className={cn("size-full object-cover", rejected && "opacity-40")} />
      {isCover && (
        <span className="absolute top-2 left-2 inline-flex h-6 items-center rounded-sm bg-brand px-2 text-xs font-semibold text-white">
          รูปปก
        </span>
      )}
      {rejected ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-danger-soft/85 p-3 text-center">
          <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-danger">{photo.reason}</span>
        </div>
      ) : null}
      <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
        {!rejected && (
          <span className="flex gap-1">
            <button
              type="button"
              className={tileButton}
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
              aria-label={`เลื่อนรูป ${index + 1} ไปทางซ้าย`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={tileButton}
              disabled={index === count - 1}
              onClick={() => onMove(index + 1)}
              aria-label={`เลื่อนรูป ${index + 1} ไปทางขวา`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
            {!isCover && (
              <button
                type="button"
                className={tileButton}
                onClick={onCover}
                aria-label={`ตั้งรูป ${index + 1} เป็นรูปปก`}
              >
                <Star className="size-4" aria-hidden="true" />
              </button>
            )}
          </span>
        )}
        <button
          type="button"
          className={cn(tileButton, "ml-auto")}
          onClick={onRemove}
          aria-label={`ลบรูป ${photo.name}`}
        >
          <Trash2 className="size-4 text-danger" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/** C4/C7 `PhotoUploader`: drop zone, sortable grid, cover badge, per-file progress, rejected state. */
export function PhotosStep({ draftId, values, set, errors, touch }: StepProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<HTMLInputElement>(null);

  const gallery = values.photos.filter((p) => !p.isFloorPlan);
  const plans = values.photos.filter((p) => p.isFloorPlan);
  const ready = gallery.filter((p) => p.status === "ready").length;
  const rejected = gallery.filter((p) => p.status === "rejected");
  const coverId = gallery.find((p) => p.status === "ready")?.id;

  const setGallery = (next: DraftPhoto[]) =>
    set((v) => ({ photos: [...next, ...v.photos.filter((p) => p.isFloorPlan)] }));

  async function upload(files: FileList | File[], isFloorPlan = false) {
    const room = MAX_PHOTOS - values.photos.length - uploads.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    setNotice(
      files.length > list.length
        ? `ใส่ได้สูงสุด ${MAX_PHOTOS} รูป ข้าม ${files.length - list.length} รูปที่เกิน`
        : undefined,
    );

    await Promise.all(
      list.map(async (file, i) => {
        const key = `${Date.now()}-${i}-${file.name}`;
        const info = await describeImage(file);
        setUploads((u) => [...u, { key, name: file.name, url: info.preview, progress: 5 }]);
        // fetch() reports no upload progress; ease the bar towards 90% until the server answers.
        const timer = window.setInterval(
          () =>
            setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: Math.min(90, x.progress + 12) } : x))),
          120,
        );
        try {
          const { data } = await api.uploadPhoto(draftId, {
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            width: info.width,
            height: info.height,
            preview: info.preview,
          });
          setUploads((u) => u.filter((x) => x.key !== key));
          set((v) => ({ photos: [...v.photos, { ...data, isFloorPlan: isFloorPlan || undefined }] }));
        } catch (error) {
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, failed: true, progress: 0 } : x)));
          setNotice(
            error instanceof ApiError && error.status < 500
              ? "อัปโหลดไม่สำเร็จ ตรวจไฟล์อีกครั้ง"
              : "อัปโหลดไม่สำเร็จ ลองอีกครั้ง",
          );
        } finally {
          window.clearInterval(timer);
          touch("photos");
        }
      }),
    );
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  };

  return (
    <>
      <WizardCard
        id="field-photos"
        title="รูปภาพ"
        aside={
          <span className="text-sm text-slate tabular-nums">
            {gallery.length} / {MAX_PHOTOS}
          </span>
        }
        sub={`อย่างน้อย ${MIN_PHOTOS} รูป รูปแนวนอนกว้าง 1,200 px ขึ้นไป ลากหรือใช้ปุ่มลูกศรเพื่อเรียงลำดับ รูปแรกคือรูปปก`}
      >
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "hidden flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-9 text-center sm:flex",
            dragOver ? "border-brand bg-brand-soft" : "border-line-strong bg-mist",
          )}
        >
          <ImagePlus className="size-7 text-brand" aria-hidden="true" />
          <p className="font-semibold text-ink">
            ลากรูปมาวางตรงนี้ หรือ{" "}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-brand-strong underline underline-offset-4"
            >
              เลือกจากเครื่อง
            </button>
          </p>
          <p className="text-[13px] text-slate">JPG, PNG, HEIC ไม่เกิน 15 MB ต่อรูป</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          <Button type="button" variant="outline" size="lg" onClick={() => cameraRef.current?.click()}>
            <Camera aria-hidden="true" />
            ถ่ายรูป
          </Button>
          <Button type="button" size="lg" onClick={() => fileRef.current?.click()}>
            <ImagePlus aria-hidden="true" />
            เลือกจากอัลบั้ม
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          aria-label="เลือกรูปจากเครื่อง"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />

        {(gallery.length > 0 || uploads.length > 0) && (
          <ul aria-label="รูปที่เลือก" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((photo, i) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                index={i}
                count={gallery.length}
                isCover={photo.id === coverId}
                onMove={(to) => setGallery(move(gallery, i, to))}
                onCover={() => setGallery(move(gallery, i, 0))}
                onRemove={() => {
                  setGallery(gallery.filter((p) => p.id !== photo.id));
                  touch("photos");
                }}
                dragProps={
                  photo.status === "ready"
                    ? {
                        draggable: true,
                        onDragStart: (e: DragEvent) => {
                          setDragIndex(i);
                          e.dataTransfer.effectAllowed = "move";
                        },
                        onDragOver: (e: DragEvent) => {
                          if (dragIndex !== null) e.preventDefault();
                        },
                        onDrop: (e: DragEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragIndex !== null && dragIndex !== i) setGallery(move(gallery, dragIndex, i));
                          setDragIndex(null);
                        },
                        onDragEnd: () => setDragIndex(null),
                      }
                    : {}
                }
              />
            ))}
            {uploads.map((u) => (
              <li key={u.key} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-violet-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img src={u.url} alt="" className="size-full object-cover opacity-50" />
                <div className="absolute inset-x-3 bottom-3">
                  <p className="mb-1.5 text-[13px] font-semibold text-ink">
                    {u.failed ? "อัปโหลดไม่สำเร็จ" : `กำลังอัปโหลด ${u.progress}%`}
                  </p>
                  <div
                    role="progressbar"
                    aria-label={`อัปโหลด ${u.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={u.progress}
                    className="h-1.5 overflow-hidden rounded-full bg-white"
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-[width]"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
                {u.failed && (
                  <button
                    type="button"
                    onClick={() => setUploads((list) => list.filter((x) => x.key !== u.key))}
                    className={cn(tileButton, "absolute top-2 right-2")}
                    aria-label={`ลบ ${u.name}`}
                  >
                    <Trash2 className="size-4 text-danger" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-slate" aria-live="polite">
          {ready >= MIN_PHOTOS
            ? `มี ${ready} รูปผ่านแล้ว ครบขั้นต่ำ เพิ่มรูปส่วนกลางและแปลนห้องช่วยให้มีคนทักมากขึ้น`
            : `ผ่านแล้ว ${ready} รูป ต้องการอีก ${MIN_PHOTOS - ready} รูป`}
        </p>
        {rejected.length > 0 && (
          <p className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {rejected.length} รูปไม่ผ่าน: {rejected[0].reason}
          </p>
        )}
        {notice && <p className="mt-2 text-sm text-danger">{notice}</p>}
        <GroupError id="photos-error" message={errors.photos} />
      </WizardCard>

      <WizardCard
        title={
          <>
            แปลนห้องและวิดีโอ <span className="text-sm font-normal text-slate">(ไม่บังคับ)</span>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <button
              type="button"
              onClick={() => planRef.current?.click()}
              className="flex h-[120px] w-full items-center justify-center rounded-lg border-2 border-dashed border-line-strong text-[15px] font-medium text-brand-strong hover:border-brand"
            >
              + เพิ่มแปลนห้อง
            </button>
            <input
              ref={planRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                if (e.target.files) void upload(e.target.files, true);
                e.target.value = "";
              }}
            />
            {plans.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {plans.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-md bg-mist px-3 py-1.5 text-sm text-ink">
                    {p.status === "rejected" ? <span className="text-danger">{p.reason}</span> : p.name}
                    <button
                      type="button"
                      aria-label={`ลบแปลน ${p.name}`}
                      onClick={() => set((v) => ({ photos: v.photos.filter((x) => x.id !== p.id) }))}
                      className="text-slate hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <TextField
            id="videoUrl"
            label="ลิงก์วิดีโอหรือ Virtual tour"
            placeholder="YouTube, TikTok หรือ Matterport"
            inputMode="url"
            hint="ประกาศที่มีวิดีโอได้รับข้อความมากกว่าประมาณ 2 เท่า"
            value={values.videoUrl ?? ""}
            onChange={(e) => set({ videoUrl: e.target.value || undefined })}
            onBlur={() => touch("videoUrl")}
            error={errors.videoUrl}
          />
        </div>
      </WizardCard>
    </>
  );
}
