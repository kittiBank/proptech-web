"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Heart, TrendingDown } from "lucide-react";
import { PropertyPhoto } from "@/components/property/property-photo";
import { TransitBadge } from "@/components/property/transit-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { routes } from "@/data/navigation";
import { formatListingPrice, formatNumber, formatRelativeDays } from "@/lib/format";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useFavoriteNote, useFavorites } from "@/providers/favorites-store";
import { COMPARE_MAX, FAVORITE_NOTE_MAX, type FavoriteDto } from "@/types/api";
import type { ListingMode } from "@/types/property";

type ModeFilter = "all" | ListingMode;
type Sort = "saved" | "price-asc" | "price-desc" | "drop";

const sorts: { value: Sort; label: string }[] = [
  { value: "saved", label: "บันทึกล่าสุด" },
  { value: "drop", label: "ราคาลดก่อน" },
  { value: "price-asc", label: "ราคาต่ำไปสูง" },
  { value: "price-desc", label: "ราคาสูงไปต่ำ" },
];

/** On phones the table has room for two columns, three on wider screens. */
const MOBILE_COMPARE_MAX = 2;

const priceDrop = (f: FavoriteDto) => Math.max(0, f.savedPrice - f.property.price);

function sortFavorites(list: FavoriteDto[], sort: Sort) {
  const sorted = [...list];
  if (sort === "price-asc") sorted.sort((a, b) => a.property.price - b.property.price);
  if (sort === "price-desc") sorted.sort((a, b) => b.property.price - a.property.price);
  if (sort === "drop") sorted.sort((a, b) => priceDrop(b) - priceDrop(a));
  // Closed listings sink to the bottom whatever the order.
  return sorted.sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed"));
}

function similarSearch(f: FavoriteDto) {
  const p = f.property;
  return routes.search({ mode: p.mode, type: p.type, station: p.station?.code });
}

function Note({ favorite }: { favorite: FavoriteDto }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(favorite.note);
  const mutation = useFavoriteNote();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(favorite.note);
          setEditing(true);
        }}
        className={cn(
          "w-full rounded-md bg-mist px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-violet-50",
          favorite.note ? "text-ink" : "text-slate",
        )}
        aria-label={favorite.note ? `แก้โน้ต: ${favorite.note}` : `เพิ่มโน้ตให้ ${favorite.property.title}`}
      >
        {favorite.note ? `โน้ต: ${favorite.note}` : "+ เพิ่มโน้ต"}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(
          { propertyId: favorite.property.id, note: draft.trim() },
          { onSuccess: () => setEditing(false) },
        );
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={id} className="sr-only">
        โน้ตส่วนตัว (เห็นคนเดียว)
      </label>
      <textarea
        id={id}
        autoFocus
        rows={2}
        maxLength={FAVORITE_NOTE_MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="เช่น ถามเรื่องที่จอดรถ"
        className={cn(inputClass, "resize-none py-2 text-[13px]")}
      />
      {mutation.isError && <p className="text-[13px] text-danger">บันทึกโน้ตไม่สำเร็จ ลองอีกครั้ง</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          ยกเลิก
        </Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          บันทึกโน้ต
        </Button>
      </div>
    </form>
  );
}

interface ItemProps {
  favorite: FavoriteDto;
  selected: boolean;
  selectable: boolean;
  /** Selection is full and this item is not in it. */
  selectionFull: boolean;
  onToggleSelect: () => void;
  onRemove: () => void;
}

function CompareCheckbox({
  favorite,
  selected,
  selectionFull,
  onToggleSelect,
}: Omit<ItemProps, "onRemove" | "selectable">) {
  const closed = favorite.status === "closed";
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink",
        (closed || (selectionFull && !selected)) && "cursor-not-allowed text-slate",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={closed || (selectionFull && !selected)}
        onChange={onToggleSelect}
        className="size-5 accent-brand"
        aria-label={`เปรียบเทียบ ${favorite.property.title}`}
      />
      เปรียบเทียบ
    </label>
  );
}

function FavoriteCard(props: ItemProps) {
  const { favorite: f, selected, onRemove } = props;
  const p = f.property;
  const drop = priceDrop(f);
  const closed = f.status === "closed";

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-white",
        selected ? "border-brand ring-1 ring-brand" : "border-line",
      )}
    >
      <div className="relative">
        <Link href={routes.property(p.slug)} tabIndex={-1} aria-hidden="true">
          <PropertyPhoto
            image={p.image}
            sizes="(min-width: 1100px) 300px, 50vw"
            className={cn("aspect-[4/3]", closed && "opacity-75")}
          />
        </Link>
        {drop > 0 && !closed && (
          <span className="absolute top-3 left-3 inline-flex h-[26px] items-center gap-1 rounded-sm bg-success px-2.5 text-[13px] font-semibold text-white">
            <TrendingDown className="size-3.5" aria-hidden="true" />
            ลด ฿{formatNumber(drop)}
          </span>
        )}
        {closed && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/55 font-semibold text-white">
            ประกาศนี้ปิดแล้ว
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`นำ ${p.title} ออกจากรายการโปรด`}
          className="absolute top-2 right-2 inline-flex size-10 items-center justify-center rounded-full bg-white text-brand hover:bg-violet-50"
        >
          <Heart className="size-[18px] fill-brand" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold text-ink">
          <Link href={routes.property(p.slug)} className="hover:text-brand-strong">
            {p.title}
          </Link>
        </h3>
        <p className="text-ink">
          <strong className="text-lg font-semibold tabular-nums">{formatListingPrice(p.price, p.mode)}</strong>
          {drop > 0 && (
            <s className="ml-2 text-sm text-slate tabular-nums">
              <span className="sr-only">ราคาเดิม </span>
              {formatListingPrice(f.savedPrice, p.mode)}
            </s>
          )}
        </p>
        {p.station && <TransitBadge station={p.station} distance={p.stationDistance} />}
        {closed ? (
          <Link
            href={similarSearch(f)}
            className="text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            ดูประกาศคล้ายกันในย่านนี้
          </Link>
        ) : (
          <Note favorite={f} />
        )}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-1">
          <CompareCheckbox {...props} />
          <span className="text-[13px] text-slate">บันทึก {formatRelativeDays(f.savedAt.slice(0, 10))}</span>
        </div>
      </div>
    </article>
  );
}

function FavoriteRow(props: ItemProps) {
  const { favorite: f, selected, selectable, selectionFull, onToggleSelect, onRemove } = props;
  const p = f.property;
  const drop = priceDrop(f);
  const closed = f.status === "closed";

  return (
    <div className={cn("flex items-center gap-3 border-b border-line bg-white px-4 py-3", selected && "bg-brand-soft")}>
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          disabled={closed || (selectionFull && !selected)}
          onChange={onToggleSelect}
          className="size-5 shrink-0 accent-brand"
          aria-label={`เปรียบเทียบ ${p.title}`}
        />
      )}
      <Link
        href={routes.property(p.slug)}
        className="relative w-[88px] shrink-0 overflow-hidden rounded-md"
        tabIndex={-1}
        aria-hidden="true"
      >
        <PropertyPhoto image={p.image} sizes="88px" className="aspect-[4/3]" />
        {closed && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-xs font-semibold text-white">
            ปิดแล้ว
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={routes.property(p.slug)} className="line-clamp-1 text-sm font-semibold text-ink">
          {p.title}
        </Link>
        <p className="font-semibold text-ink tabular-nums">{formatListingPrice(p.price, p.mode)}</p>
        {drop > 0 && !closed && <p className="text-[13px] font-medium text-success">ลดราคา ฿{formatNumber(drop)}</p>}
        {closed && <p className="text-[13px] text-slate">ประกาศนี้ปิดแล้ว</p>}
        {p.station && !closed && (
          <TransitBadge station={p.station} distance={p.stationDistance} className="text-[13px]" />
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`นำ ${p.title} ออกจากรายการโปรด`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-brand hover:bg-violet-50"
      >
        <Heart className="size-5 fill-brand" aria-hidden="true" />
      </button>
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div
      role="status"
      aria-label="กำลังโหลดรายการโปรด"
      className="mt-6 grid gap-5 min-[1100px]:grid-cols-3 sm:grid-cols-2"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-line bg-white">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FavoritesView() {
  const { favorites, isPending, isError, isFetching, refetch, remove, save } = useFavorites();
  const wide = useMediaQuery("(min-width: 640px)");
  const max = wide ? COMPARE_MAX : MOBILE_COMPARE_MAX;
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sort, setSort] = useState<Sort>("saved");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [removed, setRemoved] = useState<FavoriteDto | null>(null);

  // A shrinking screen or an unsaved listing can leave stale picks behind.
  const picks = selected
    .filter((id) => favorites.some((f) => f.property.id === id && f.status === "active"))
    .slice(0, max);

  useEffect(() => {
    if (!removed) return;
    const t = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(t);
  }, [removed]);

  const counts = useMemo(
    () => ({
      all: favorites.length,
      buy: favorites.filter((f) => f.property.mode === "buy").length,
      rent: favorites.filter((f) => f.property.mode === "rent").length,
    }),
    [favorites],
  );
  const visible = useMemo(
    () => sortFavorites(mode === "all" ? favorites : favorites.filter((f) => f.property.mode === mode), sort),
    [favorites, mode, sort],
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...picks, id].slice(0, max)));

  const onRemove = (f: FavoriteDto) => {
    remove(f.property.id);
    setSelected((prev) => prev.filter((id) => id !== f.property.id));
    setRemoved(f);
  };

  const undo = () => {
    if (removed) save(removed.property);
    setRemoved(null);
  };

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
          รายการโปรด
          {favorites.length > 0 && (
            <span className="ml-2 align-middle text-base font-medium text-slate tabular-nums sm:hidden">
              {favorites.length}
            </span>
          )}
        </h1>
        <p className="mt-1 hidden text-[15px] text-slate sm:block">
          เราแจ้งให้ทราบเมื่อประกาศที่คุณบันทึกลดราคาหรือถูกปิด
        </p>
      </div>
      {favorites.length > 1 && (
        <Button
          variant="link"
          className="h-11 sm:hidden"
          aria-pressed={selectMode}
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected([]);
          }}
        >
          {selectMode ? "ยกเลิก" : "เลือกเพื่อเปรียบเทียบ"}
        </Button>
      )}
    </div>
  );

  if (isPending) {
    return (
      <>
        {header}
        <FavoritesSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <>
        {header}
        <QueryError what="รายการโปรด" onRetry={() => refetch()} retrying={isFetching} className="mt-6" />
      </>
    );
  }

  if (favorites.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={Heart}
          title="ยังไม่มีประกาศที่บันทึกไว้"
          body="กดรูปหัวใจบนประกาศที่สนใจ แล้วกลับมาเทียบราคาและรับแจ้งเตือนเมื่อราคาลดได้ที่นี่"
          action={
            <Button asChild size="lg">
              <Link href={routes.search({})}>เริ่มค้นหาประกาศ</Link>
            </Button>
          }
          secondary={
            <Link
              href={routes.newProjects}
              className="font-medium text-brand-strong underline-offset-4 hover:underline"
            >
              ดูโครงการใหม่
            </Link>
          }
          className="mt-6 rounded-lg bg-white"
        />
        {removed && <UndoToast favorite={removed} onUndo={undo} />}
      </>
    );
  }

  const itemProps = (f: FavoriteDto): ItemProps => ({
    favorite: f,
    selected: picks.includes(f.property.id),
    selectable: wide || selectMode,
    selectionFull: picks.length >= max,
    onToggleSelect: () => toggleSelect(f.property.id),
    onRemove: () => onRemove(f),
  });

  const showBar = picks.length > 0;

  return (
    <div className={cn(showBar && "pb-24")}>
      {header}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="ประเภทประกาศ" className="flex gap-1.5">
          {(
            [
              ["all", `ทั้งหมด ${counts.all}`],
              ["buy", `ขาย ${counts.buy}`],
              ["rent", `เช่า ${counts.rent}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium tabular-nums transition-colors",
                mode === value
                  ? "border-ink bg-ink text-white"
                  : "border-line-strong bg-white text-ink hover:border-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger
            aria-label="เรียงตาม"
            className="h-11 w-auto rounded-md border border-line-strong bg-white px-3.5 hover:border-ink"
          >
            <span className="text-slate">เรียง:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {sorts.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-[15px] text-slate">ไม่มีประกาศ{mode === "buy" ? "ขาย" : "เช่า"}ในรายการโปรด</p>
      ) : (
        <>
          <ul className="mt-6 hidden gap-5 min-[1100px]:grid-cols-3 sm:grid sm:grid-cols-2">
            {visible.map((f) => (
              <li key={f.property.id} className="flex [&>article]:w-full">
                <FavoriteCard {...itemProps(f)} />
              </li>
            ))}
          </ul>
          <ul className="-mx-4 mt-4 border-t border-line sm:hidden">
            {visible.map((f) => (
              <li key={f.property.id}>
                <FavoriteRow {...itemProps(f)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {showBar && (
        <div
          role="region"
          aria-label="เปรียบเทียบประกาศ"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
        >
          <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <span className="text-[15px] font-medium text-ink tabular-nums" aria-live="polite">
              เลือกแล้ว {picks.length} จาก {max}
              <span className="hidden sm:inline"> ประกาศ</span>
            </span>
            <span aria-hidden="true" className="hidden gap-1 sm:flex">
              {Array.from({ length: max }, (_, i) => (
                <span key={i} className={cn("h-1.5 w-6 rounded-full", i < picks.length ? "bg-brand" : "bg-line")} />
              ))}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => setSelected([])}>
                ล้าง
              </Button>
              {picks.length >= 2 ? (
                <Button asChild>
                  <Link href={routes.compare(picks)}>เปรียบเทียบ</Link>
                </Button>
              ) : (
                <Button disabled title="เลือกอย่างน้อย 2 ประกาศ">
                  เปรียบเทียบ
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {removed && !showBar && <UndoToast favorite={removed} onUndo={undo} />}
    </div>
  );
}

function UndoToast({ favorite, onUndo }: { favorite: FavoriteDto; onUndo: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-[0_12px_32px_rgba(26,22,48,.12)] sm:bottom-6"
    >
      <span className="line-clamp-1 flex-1">นำ “{favorite.property.title}” ออกแล้ว</span>
      <button
        type="button"
        onClick={onUndo}
        className="h-9 shrink-0 rounded-md px-2 font-semibold text-violet-200 hover:text-white"
      >
        เลิกทำ
      </button>
    </div>
  );
}
