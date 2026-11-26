"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Extra classes for both the header and body cells, e.g. a width. */
  className?: string;
}

interface Selection {
  selected: string[];
  onChange: (ids: string[]) => void;
}

interface DataTableProps<T> {
  /** Table name for screen readers (visually hidden caption). */
  caption: string;
  columns: DataColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Turns on the checkbox column. Selection is controlled by the page. */
  selection?: Selection;
  /** Accessible name of a row's checkbox, e.g. the listing title. */
  rowLabel?: (row: T) => string;
  /** Actions in the ink bar shown while rows are selected. */
  bulkActions?: (selected: string[]) => ReactNode;
  pagination?: { page: number; pageCount: number; onPageChange: (page: number) => void };
  /** Left side of the footer, e.g. "แสดง 1–20 จาก 134". */
  footer?: ReactNode;
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode;
  /**
   * Limits the table height so the header sticks while the body scrolls,
   * e.g. "max-h-[640px]". Without it the table grows with the page.
   */
  scrollClassName?: string;
  /** The row shown in a detail panel next to the table (E4); highlighted and `aria-current`. */
  currentRowId?: string;
  /** Opens a row from anywhere on it; keep a link in the row for keyboard users. */
  onRowClick?: (row: T) => void;
  className?: string;
}

/** Desktop data table (C9, E2, E4, E6, E7, E10): sticky header, row selection, bulk-action bar, pagination footer. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  selection,
  rowLabel,
  bulkActions,
  pagination,
  footer,
  empty,
  scrollClassName,
  currentRowId,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const ids = rows.map(getRowId);
  const selected = selection?.selected ?? [];
  const pageSelected = ids.filter((id) => selected.includes(id));
  const all = ids.length > 0 && pageSelected.length === ids.length;
  const some = pageSelected.length > 0 && !all;

  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = some;
  }, [some]);

  const toggleAll = () => {
    if (!selection) return;
    selection.onChange(
      all ? selected.filter((id) => !ids.includes(id)) : [...selected, ...ids.filter((id) => !selected.includes(id))],
    );
  };
  const toggleRow = (id: string) =>
    selection?.onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const colSpan = columns.length + (selection ? 1 : 0);
  const cellAlign = (c: DataColumn<T>) => (c.align === "right" ? "text-right tabular-nums" : "text-left");

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-white", className)}>
      {selection && selected.length > 0 && (
        <div
          role="region"
          aria-label="การจัดการที่เลือก"
          className="flex flex-wrap items-center gap-3 bg-ink px-4 py-2.5 text-sm text-white"
        >
          <span className="font-semibold" aria-live="polite">
            เลือก {selected.length} รายการ
          </span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions?.(selected)}</div>
          <button
            type="button"
            onClick={() => selection.onChange([])}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-violet-200 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
            ยกเลิกการเลือก
          </button>
        </div>
      )}

      {/* `relative` keeps absolutely positioned sr-only text inside the scroller, so it cannot widen the page. */}
      <div className={cn("relative overflow-auto", scrollClassName)}>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-mist">
            <tr>
              {selection && (
                <th scope="col" className="w-12 border-b border-line px-4 py-3">
                  <input
                    ref={headerBox}
                    type="checkbox"
                    aria-label="เลือกทั้งหมดในหน้านี้"
                    checked={all}
                    onChange={toggleAll}
                    disabled={ids.length === 0}
                    className="size-4 accent-brand"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className={cn(
                    "border-b border-line px-4 py-3 text-xs font-semibold whitespace-nowrap text-slate",
                    cellAlign(c),
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-slate">
                  {empty ?? "ไม่มีข้อมูล"}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                const checked = selected.includes(id);
                const current = id === currentRowId;
                return (
                  <tr
                    key={id}
                    aria-current={current ? "true" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-line last:border-b-0",
                      current
                        ? "bg-violet-50 shadow-[inset_3px_0_0_var(--color-brand)]"
                        : checked
                          ? "bg-[#FAF8FF]"
                          : "hover:bg-mist/60",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selection && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`เลือก ${rowLabel?.(row) ?? id}`}
                          checked={checked}
                          onChange={() => toggleRow(id)}
                          className="size-4 accent-brand"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.id} className={cn("px-4 py-3 align-middle text-ink", cellAlign(c), c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(footer || (pagination && pagination.pageCount > 1)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2">
          <div className="text-[13px] text-slate">{footer}</div>
          {pagination && <Pagination {...pagination} />}
        </div>
      )}
    </div>
  );
}
