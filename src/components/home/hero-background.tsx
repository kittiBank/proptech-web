import { cn } from "@/lib/utils";

/**
 * Hero background: soft violet glows drifting slowly over `hero`.
 *
 * - CSS only, and only `transform` animates, so it runs on the compositor
 *   (no repaints, no main-thread work, no effect on LCP/TBT).
 * - Glows are radial gradients rather than `filter: blur`, which is costly on phones.
 * - Brightest point is ~55% `brand` over `hero`, keeping the white headline
 *   ≥ 8.7:1 and the 80% white subtitle ≥ 6.2:1 (WCAG AA).
 * - `prefers-reduced-motion`: the glows stay still (the global rule shortens
 *   durations, which would make an infinite loop flicker, so it is turned off here).
 */
const glow =
  "absolute rounded-full will-change-transform motion-reduce:animate-none [animation-timing-function:ease-in-out] [animation-iteration-count:infinite] [animation-direction:alternate]";

export function HeroBackground() {
  return (
    <div data-slot="hero-background" aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-hero">
      <div
        className={cn(
          glow,
          "top-[-30%] left-[-20%] size-[70vmax] animate-[hero-drift-a_26s] bg-[radial-gradient(closest-side,rgb(112_71_235/0.55),transparent)]",
        )}
      />
      <div
        className={cn(
          glow,
          "right-[-25%] bottom-[-45%] size-[80vmax] animate-[hero-drift-b_32s] bg-[radial-gradient(closest-side,rgb(68_36_168/0.7),transparent)]",
        )}
      />
      <div
        className={cn(
          glow,
          "top-[10%] right-[5%] size-[40vmax] animate-[hero-drift-c_22s] bg-[radial-gradient(closest-side,rgb(203_188_250/0.18),transparent)]",
        )}
      />
      {/* Darkens the lower edge so the search panel sits on a calm base. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-hero/80 to-transparent" />
    </div>
  );
}
