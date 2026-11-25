import { cn } from "@/lib/utils";

export interface BarDatum {
  /** Axis label, e.g. "22 พ.ย.". */
  label: string;
  value: number;
  /** Emphasised bar (brand); the rest are violet-200. */
  highlight?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  /** One sentence with the key numbers; the chart is `role="img"` with this name (handoff §7). */
  summary: string;
  /** Tailwind height class for the plot area. */
  heightClassName?: string;
  /** Formats the value in each bar's tooltip. */
  format?: (value: number) => string;
  /** How many axis labels to print (evenly spaced, first and last included). */
  labelCount?: number;
  className?: string;
}

/**
 * Simple vertical bar chart (C8, E1, E7, D3): brand and violet-200 only, a
 * baseline, and sparse axis labels. Screen readers get `summary`, not the bars.
 */
export function BarChart({
  data,
  summary,
  heightClassName = "h-44",
  format = String,
  labelCount = 4,
  className,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? (data.length - 1) / Math.max(1, labelCount - 1) : 1;
  const labelled = new Set(Array.from({ length: Math.min(labelCount, data.length) }, (_, i) => Math.round(i * step)));
  const gap = data.length > 40 ? "gap-px" : data.length > 20 ? "gap-[3px]" : "gap-1.5";

  return (
    <figure role="img" aria-label={summary} className={cn("m-0", className)}>
      <div className={cn("flex items-end border-b border-line", gap, heightClassName)} aria-hidden="true">
        {data.map((d, i) => (
          <div
            key={`${d.label}-${i}`}
            title={`${d.label}: ${format(d.value)}`}
            className={cn("min-w-0 flex-1 rounded-t-[3px]", d.highlight ? "bg-brand" : "bg-violet-200")}
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-slate" aria-hidden="true">
        {data.map((d, i) =>
          labelled.has(i) ? (
            <span
              key={`${d.label}-${i}`}
              className={cn(
                "absolute whitespace-nowrap tabular-nums",
                i === 0 ? "left-0" : i === data.length - 1 ? "right-0" : "-translate-x-1/2",
              )}
              style={i === 0 || i === data.length - 1 ? undefined : { left: `${((i + 0.5) / data.length) * 100}%` }}
            >
              {d.label}
            </span>
          ) : null,
        )}
      </div>
    </figure>
  );
}
