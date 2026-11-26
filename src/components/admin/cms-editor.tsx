"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, History, Trash2, X } from "lucide-react";
import { ArticleBody } from "@/components/guides/article-view";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FormAlert, NativeSelect, TextField, fieldA11y, inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/components/ui/toast";
import { articleCategories } from "@/data/articles";
import { propertyTypeLabels } from "@/data/catalog";
import { SITE_URL } from "@/lib/site";
import { adminRoutes } from "@/lib/admin";
import { cmsStatusInfo } from "@/lib/admin-queues";
import { adminApi, adminKeys, cmsArticleQuery } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  SEO_DESCRIPTION_MAX,
  type ArticleBlock,
  type ArticleCategory,
  type CmsArticleDto,
  type SaveCmsArticleRequest,
} from "@/types/api";
import type { PropertyType } from "@/types/property";
import { AdminPageHeader } from "./admin-shell";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const stamp = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

type BlockType = ArticleBlock["type"];

const blockNames: Record<BlockType, string> = {
  heading: "หัวข้อ H2",
  subheading: "หัวข้อย่อย H3",
  paragraph: "ข้อความ",
  list: "รายการ",
  image: "รูป",
  callout: "กล่องเตือน",
  listings: "การ์ดประกาศ",
  calculator: "เครื่องคำนวณ",
};

const toolbar: { type: BlockType; label: string }[] = [
  { type: "heading", label: "H2" },
  { type: "subheading", label: "H3" },
  { type: "paragraph", label: "ข้อความ" },
  { type: "list", label: "รายการ" },
  { type: "image", label: "รูป" },
  { type: "callout", label: "กล่องเตือน" },
  { type: "listings", label: "การ์ดประกาศ" },
  { type: "calculator", label: "เครื่องคำนวณ" },
];

function newBlock(type: BlockType): ArticleBlock {
  switch (type) {
    case "heading":
      return { type, id: `section-${Date.now().toString(36)}`, text: "" };
    case "subheading":
      return { type, text: "" };
    case "paragraph":
      return { type, text: "" };
    case "list":
      return { type, items: [""] };
    case "image":
      return { type, src: "", alt: "", caption: "" };
    case "callout":
      return { type, tone: "tip", title: "", text: "" };
    case "listings":
      return { type, title: "ประกาศที่เกี่ยวข้อง", query: { mode: "buy" }, limit: 3 };
    case "calculator":
      return { type, price: 5_000_000, downPaymentPct: 10, annualRatePct: 6, years: 30 };
  }
}

const toDraft = (a: CmsArticleDto): SaveCmsArticleRequest => ({
  slug: a.slug,
  title: a.title,
  category: a.category,
  tags: a.tags,
  cover: a.cover,
  seoDescription: a.seoDescription,
  body: a.body,
});

const small = cn(inputClass, "h-9 text-[13px]");

/** One block's fields. Plain text only; formatting comes from the block type. */
function BlockFields({
  block,
  onChange,
  id,
}: {
  block: ArticleBlock;
  onChange: (b: ArticleBlock) => void;
  id: string;
}) {
  switch (block.type) {
    case "heading":
    case "subheading":
      return (
        <input
          aria-label={blockNames[block.type]}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="หัวข้อ"
          className={cn(inputClass, "h-11 font-semibold", block.type === "heading" ? "text-[20px]" : "text-[17px]")}
        />
      );
    case "paragraph":
      return (
        <textarea
          aria-label="ข้อความ"
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="เขียนเนื้อหา"
          className={cn(inputClass, "field-sizing-content min-h-20 resize-none py-2.5 text-[16px] leading-[1.8]")}
        />
      );
    case "list":
      return (
        <textarea
          aria-label="รายการ (บรรทัดละข้อ)"
          value={block.items.join("\n")}
          onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })}
          placeholder="บรรทัดละหนึ่งข้อ"
          className={cn(inputClass, "field-sizing-content min-h-20 resize-none py-2.5")}
        />
      );
    case "image":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            aria-label="ลิงก์รูป"
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            placeholder="https://…"
            className={small}
          />
          <input
            aria-label="คำอธิบายรูป (alt)"
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="คำอธิบายรูปสำหรับผู้อ่านหน้าจอ"
            className={small}
          />
          <input
            aria-label="คำบรรยายใต้รูป"
            value={block.caption ?? ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="คำบรรยายใต้รูป (ไม่บังคับ)"
            className={cn(small, "sm:col-span-2")}
          />
        </div>
      );
    case "callout":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label htmlFor={`${id}-tone`} className="sr-only">
              ประเภทกล่อง
            </label>
            <NativeSelect
              id={`${id}-tone`}
              value={block.tone}
              onChange={(e) => onChange({ ...block, tone: e.target.value as "tip" | "warning" })}
              className="h-9 w-32 text-[13px]"
            >
              <option value="tip">เคล็ดลับ</option>
              <option value="warning">คำเตือน</option>
            </NativeSelect>
            <input
              aria-label="หัวข้อกล่อง"
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
              placeholder="หัวข้อกล่อง"
              className={small}
            />
          </div>
          <textarea
            aria-label="ข้อความในกล่อง"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            className={cn(inputClass, "field-sizing-content min-h-16 resize-none py-2 text-[14px]")}
          />
        </div>
      );
    case "listings":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            aria-label="หัวข้อการ์ดประกาศ"
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            className={cn(small, "col-span-2 sm:col-span-4")}
          />
          <NativeSelect
            aria-label="ซื้อหรือเช่า"
            value={block.query.mode ?? "buy"}
            onChange={(e) => onChange({ ...block, query: { ...block.query, mode: e.target.value as "buy" | "rent" } })}
            className="h-9 text-[13px]"
          >
            <option value="buy">ขาย</option>
            <option value="rent">เช่า</option>
          </NativeSelect>
          <NativeSelect
            aria-label="ประเภททรัพย์"
            value={block.query.type ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                query: { ...block.query, type: (e.target.value || undefined) as PropertyType | undefined },
              })
            }
            className="h-9 text-[13px]"
          >
            <option value="">ทุกประเภท</option>
            {(Object.keys(propertyTypeLabels) as PropertyType[]).map((t) => (
              <option key={t} value={t}>
                {propertyTypeLabels[t]}
              </option>
            ))}
          </NativeSelect>
          <input
            aria-label="รหัสสถานี เช่น E5"
            value={block.query.station ?? ""}
            onChange={(e) =>
              onChange({ ...block, query: { ...block.query, station: e.target.value.toUpperCase() || undefined } })
            }
            placeholder="สถานี เช่น E5"
            className={small}
          />
          <NativeSelect
            aria-label="จำนวนที่แสดง"
            value={String(block.limit)}
            onChange={(e) => onChange({ ...block, limit: Number(e.target.value) })}
            className="h-9 text-[13px]"
          >
            <option value="3">แสดง 3 รายการ</option>
            <option value="6">แสดง 6 รายการ</option>
          </NativeSelect>
        </div>
      );
    case "calculator":
      return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["price", "ราคา (บาท)"],
              ["downPaymentPct", "เงินดาวน์ %"],
              ["annualRatePct", "ดอกเบี้ย %"],
              ["years", "ระยะผ่อน (ปี)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs text-slate">
              {label}
              <input
                type="number"
                value={block[key]}
                onChange={(e) => onChange({ ...block, [key]: Number(e.target.value) })}
                className={cn(small, "mt-1 text-ink")}
              />
            </label>
          ))}
        </div>
      );
  }
}

function BlockEditor({
  block,
  index,
  total,
  active,
  onFocus,
  onChange,
  onMove,
  onRemove,
}: {
  block: ArticleBlock;
  index: number;
  total: number;
  active: boolean;
  onFocus: () => void;
  onChange: (b: ArticleBlock) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const name = `${blockNames[block.type]} บล็อกที่ ${index + 1}`;
  const rich =
    block.type === "listings" || block.type === "calculator" || block.type === "callout" || block.type === "image";
  return (
    <div
      role="group"
      aria-label={name}
      onFocusCapture={onFocus}
      className={cn(
        "group/block relative rounded-lg border px-3 pt-2 pb-3",
        rich ? "border-dashed border-violet-200 bg-[#FAF8FF]" : "border-transparent hover:border-line",
        active && "border-violet-200",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1 text-xs text-slate">
        <span className="font-medium">{blockNames[block.type]}</span>
        <span className="ml-auto flex gap-0.5 opacity-60 group-focus-within/block:opacity-100 group-hover/block:opacity-100">
          <button
            type="button"
            aria-label={`เลื่อนขึ้น ${name}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="inline-flex size-7 items-center justify-center rounded hover:bg-mist disabled:opacity-30"
          >
            <ArrowUp className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`เลื่อนลง ${name}`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="inline-flex size-7 items-center justify-center rounded hover:bg-mist disabled:opacity-30"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`ลบ ${name}`}
            disabled={total === 1}
            onClick={onRemove}
            className="inline-flex size-7 items-center justify-center rounded text-danger hover:bg-danger-soft disabled:opacity-30"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
      <BlockFields block={block} onChange={onChange} id={id} />
    </div>
  );
}

function SidebarCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-[18px]">
      {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Editor({ article }: { article: CmsArticleDto }) {
  const id = useId();
  const client = useQueryClient();
  const [draft, setDraft] = useState(() => toDraft(article));
  const [saved, setSaved] = useState(() => JSON.stringify(toDraft(article)));
  const [active, setActive] = useState(article.body.length - 1);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [at, setAt] = useState("");
  const [tag, setTag] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const dirty = JSON.stringify(draft) !== saved;

  const errors = {
    title: draft.title.trim() ? undefined : "ใส่ชื่อบทความ",
    slug: SLUG.test(draft.slug) ? undefined : "ใช้ a-z 0-9 และขีดกลาง เช่น buy-resale-condo",
    seo: draft.seoDescription.length > SEO_DESCRIPTION_MAX ? `ยาวเกิน ${SEO_DESCRIPTION_MAX} ตัวอักษร` : undefined,
  };
  const valid = !errors.title && !errors.slug && !errors.seo;

  const apply = (data: CmsArticleDto) => {
    client.setQueryData(adminKeys.cmsArticle(article.id), { data });
    client.invalidateQueries({ queryKey: adminKeys.cms, exact: true });
  };
  const save = useMutation({
    mutationFn: () => adminApi.saveCmsArticle(article.id, draft),
    onSuccess: ({ data }) => {
      setSaved(JSON.stringify(toDraft(data)));
      apply(data);
    },
  });
  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) await save.mutateAsync();
      return adminApi.publishCmsArticle(article.id, schedule && at ? { at: new Date(at).toISOString() } : {});
    },
    onSuccess: ({ data }) => {
      apply(data);
      client.invalidateQueries({ queryKey: ["admin", "audit-log"] });
      toast(data.status === "scheduled" ? "ตั้งเวลาเผยแพร่แล้ว" : "เผยแพร่แล้ว");
    },
  });

  // Ctrl/Cmd+S saves the draft.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        setShowErrors(true);
        if (valid && dirty && !save.isPending) save.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [valid, dirty, save]);

  const setBody = (body: ArticleBlock[]) => setDraft((d) => ({ ...d, body }));
  const insert = (type: BlockType) => {
    const at = Math.min(active + 1, draft.body.length);
    setBody([...draft.body.slice(0, at), newBlock(type), ...draft.body.slice(at)]);
    setActive(at);
  };
  const move = (i: number, delta: -1 | 1) => {
    const next = [...draft.body];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setBody(next);
    setActive(i + delta);
  };
  const addTag = () => {
    const t = tag.trim();
    if (t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTag("");
  };

  const saveError =
    save.error instanceof ApiError && save.error.status === 409
      ? "slug นี้ถูกใช้กับบทความอื่นแล้ว"
      : save.isError
        ? "บันทึกไม่สำเร็จ ลองอีกครั้ง"
        : undefined;
  const status = cmsStatusInfo[article.status];
  const category = articleCategories.find((c) => c.value === draft.category)?.label;

  return (
    <>
      <AdminPageHeader
        title="แก้ไขบทความ"
        description={undefined}
        actions={
          <Button variant="outline" size="sm" onClick={() => setHistory(true)}>
            <History aria-hidden="true" />
            ประวัติการแก้ไข
          </Button>
        }
      />
      <nav aria-label="เส้นทางหน้า" className="-mt-2 text-[13px] text-slate">
        <Link href={adminRoutes.cms} className="text-brand-strong underline underline-offset-2">
          บทความ
        </Link>{" "}
        / {draft.title || "ไม่มีชื่อ"}
      </nav>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="เนื้อหาบทความ" className="overflow-hidden rounded-lg border border-line bg-white">
          {!preview && (
            <div
              role="toolbar"
              aria-label="เพิ่มบล็อก"
              className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-line bg-mist px-3 py-2"
            >
              {toolbar.map((t) => (
                <Button
                  key={t.type}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5"
                  aria-label={`เพิ่ม ${blockNames[t.type]}`}
                  onClick={() => insert(t.type)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          )}
          <div className="px-5 py-6 sm:px-9 sm:py-7">
            <p className="text-xs font-semibold text-brand-strong">{category}</p>
            {preview ? (
              <article aria-label="ตัวอย่างบทความ">
                <h1 className="mt-1 text-[30px] leading-tight font-semibold">{draft.title}</h1>
                <PropertyPhoto image={draft.cover} sizes="720px" className="my-5 aspect-[16/9] rounded-lg" />
                <ArticleBody blocks={draft.body} />
              </article>
            ) : (
              <>
                <label htmlFor={`${id}-title`} className="sr-only">
                  ชื่อบทความ
                </label>
                <textarea
                  id={`${id}-title`}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value.replace(/\n/g, " ") })}
                  maxLength={120}
                  rows={1}
                  aria-invalid={(showErrors && Boolean(errors.title)) || undefined}
                  className="mt-1 field-sizing-content w-full resize-none bg-transparent text-[30px] leading-tight font-semibold text-ink outline-none placeholder:text-slate/60 focus:rounded focus:ring-3 focus:ring-violet-100"
                  placeholder="ชื่อบทความ"
                />
                {showErrors && errors.title && <p className="text-xs text-danger">{errors.title}</p>}
                <div className="my-5 grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr]">
                  <PropertyPhoto image={draft.cover} sizes="220px" className="aspect-[16/9] rounded-lg" />
                  <div className="flex flex-col gap-2">
                    <input
                      aria-label="ลิงก์ภาพปก"
                      value={draft.cover.src}
                      onChange={(e) => setDraft({ ...draft, cover: { ...draft.cover, src: e.target.value } })}
                      className={small}
                    />
                    <input
                      aria-label="คำอธิบายภาพปก (alt)"
                      value={draft.cover.alt}
                      onChange={(e) => setDraft({ ...draft, cover: { ...draft.cover, alt: e.target.value } })}
                      className={small}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {draft.body.map((block, i) => (
                    <BlockEditor
                      key={i}
                      block={block}
                      index={i}
                      total={draft.body.length}
                      active={i === active}
                      onFocus={() => setActive(i)}
                      onChange={(b) => setBody(draft.body.map((x, j) => (j === i ? b : x)))}
                      onMove={(d) => move(i, d)}
                      onRemove={() => {
                        setBody(draft.body.filter((_, j) => j !== i));
                        setActive(Math.max(0, i - 1));
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside aria-label="การตั้งค่าบทความ" className="flex flex-col gap-3 xl:sticky xl:top-4">
          <SidebarCard>
            <div className="flex items-center justify-between gap-2">
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              <span className="text-xs text-slate" aria-live="polite">
                {dirty ? "ยังไม่บันทึก" : `บันทึก ${time.format(new Date(article.updatedAt))}`}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!dirty || save.isPending}
                onClick={() => {
                  setShowErrors(true);
                  if (valid) save.mutate();
                }}
              >
                บันทึก
              </Button>
              <Button variant="outline" size="sm" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
                {preview ? "กลับไปแก้ไข" : "ดูตัวอย่าง"}
              </Button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={schedule}
                onChange={(e) => setSchedule(e.target.checked)}
                className="size-4 accent-brand"
              />
              ตั้งเวลาเผยแพร่
            </label>
            {schedule && (
              <input
                type="datetime-local"
                aria-label="วันและเวลาเผยแพร่"
                value={at}
                onChange={(e) => setAt(e.target.value)}
                className={cn(small, "mt-2")}
              />
            )}
            <Button
              className="mt-2 w-full"
              size="sm"
              disabled={publish.isPending || (schedule && !at)}
              onClick={() => {
                setShowErrors(true);
                if (valid) publish.mutate();
              }}
            >
              {schedule ? "ตั้งเวลาเผยแพร่" : "เผยแพร่"}
            </Button>
            {(saveError || publish.isError) && (
              <FormAlert className="mt-2">{saveError ?? "เผยแพร่ไม่สำเร็จ ลองอีกครั้ง"}</FormAlert>
            )}
            <p className="mt-2.5 text-xs text-slate">
              {article.reviewer ? `ผู้ตรวจทาน: ${article.reviewer} · ` : ""}
              {article.status === "scheduled" && article.scheduledAt
                ? `เผยแพร่ ${stamp.format(new Date(article.scheduledAt))}`
                : "ตั้งเวลาเผยแพร่ได้"}
            </p>
          </SidebarCard>

          <SidebarCard title="SEO">
            <div className="mt-2.5 flex flex-col gap-3">
              <TextField
                id={`${id}-slug`}
                label="Slug"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value.trim().toLowerCase() })}
                error={showErrors ? errors.slug : undefined}
                hint="/guides/…"
                className="h-9 text-[13px]"
              />
              <Field
                id={`${id}-seo`}
                label={`คำอธิบาย ${draft.seoDescription.length}/${SEO_DESCRIPTION_MAX}`}
                error={errors.seo}
              >
                <textarea
                  {...fieldA11y(`${id}-seo`, errors.seo)}
                  value={draft.seoDescription}
                  onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })}
                  rows={3}
                  className={cn(inputClass, "resize-y py-2 text-[13px]")}
                />
              </Field>
              <div aria-label="ตัวอย่างในผลค้นหา Google" role="group" className="rounded-md bg-mist p-2.5 text-xs">
                <span className="block truncate text-[14px] text-mrt-blue">{draft.title || "ชื่อบทความ"}</span>
                <span className="block truncate text-success">
                  {SITE_URL.replace(/^https?:\/\//, "")}/guides/{draft.slug}
                </span>
                <span className="line-clamp-2 text-slate">{draft.seoDescription || "-"}</span>
              </div>
            </div>
          </SidebarCard>

          <SidebarCard title="หมวดและแท็ก">
            <div className="mt-2.5 flex flex-col gap-2.5">
              <label htmlFor={`${id}-category`} className="sr-only">
                หมวด
              </label>
              <NativeSelect
                id={`${id}-category`}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as ArticleCategory })}
                className="h-9 text-[13px]"
              >
                {articleCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
              <ul className="flex flex-wrap gap-1.5" aria-label="แท็ก">
                {draft.tags.map((t) => (
                  <li key={t}>
                    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-mist pr-1 pl-2.5 text-xs text-slate">
                      {t}
                      <button
                        type="button"
                        aria-label={`ลบแท็ก ${t}`}
                        onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
                        className="inline-flex size-5 items-center justify-center rounded-full hover:bg-line"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  addTag();
                }}
              >
                <input
                  aria-label="เพิ่มแท็ก"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="เพิ่มแท็ก"
                  className={small}
                />
                <Button type="submit" variant="outline" size="sm" className="h-9" disabled={!tag.trim()}>
                  เพิ่ม
                </Button>
              </form>
            </div>
          </SidebarCard>
        </aside>
      </div>

      <Dialog open={history} onOpenChange={setHistory}>
        <DialogContent className="sm:w-[420px]">
          <div className="p-6">
            <DialogTitle className="pr-10 text-lg font-semibold text-ink">ประวัติการแก้ไข</DialogTitle>
            <ol className="mt-3 max-h-[60vh] overflow-y-auto text-[13px]">
              {article.revisions.map((r) => (
                <li key={r.id} className="border-b border-line py-2 last:border-b-0">
                  <span className="font-medium">{r.note}</span>
                  <span className="block text-slate">
                    {stamp.format(new Date(r.at))} · {r.by}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** E9: block editor with listing-card and calculator blocks, preview, SEO, and publish or schedule. */
export function CmsEditor() {
  const { articleId } = useParams<{ articleId: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(cmsArticleQuery(articleId));
  if (isPending) {
    return (
      <div role="status" aria-label="กำลังโหลดบทความ" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="py-16 text-center">
          <h1 className="text-[22px] font-semibold">ไม่พบบทความนี้</h1>
          <Link href={adminRoutes.cms} className="mt-3 inline-block font-medium text-brand-strong hover:underline">
            กลับรายการบทความ
          </Link>
        </div>
      );
    }
    return <QueryError what="บทความ" onRetry={() => refetch()} retrying={isFetching} />;
  }
  return <Editor key={data.data.id} article={data.data} />;
}
