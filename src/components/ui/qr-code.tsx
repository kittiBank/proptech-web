import { qrMatrix } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Placeholder QR drawn as an SVG grid (PromptPay at checkout, phone hand-off in KYC). Not scannable; real codes come from the provider. */
export function QrCode({ payload, label, className }: { payload: string; label: string; className?: string }) {
  const grid = qrMatrix(payload);
  const size = grid.length;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      className={cn("size-[150px] shrink-0 rounded-md bg-white", className)}
      shapeRendering="crispEdges"
    >
      {grid.flatMap((row, y) =>
        row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#1A1630" /> : null)),
      )}
    </svg>
  );
}
