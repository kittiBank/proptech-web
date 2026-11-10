import type { ListingMode, TransitLine } from "@/types/property";
import { HeroBackground } from "./hero-background";
import { HeroSearch } from "./hero-search";

interface HeroProps {
  listingTotals: Record<ListingMode, number>;
  lines: TransitLine[];
}

export function Hero({ listingTotals, lines }: HeroProps) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <HeroBackground />

      <div className="relative mx-auto flex min-h-[560px] max-w-[1280px] flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[620px] sm:px-6 sm:py-20 lg:min-h-[680px] lg:px-8">
        <h1
          id="hero-title"
          className="text-[34px] leading-[1.25] font-semibold tracking-[-0.02em] text-white sm:text-[48px] lg:text-[60px] lg:leading-[1.2]"
        >
          <span className="block lg:inline">บ้านหลังต่อไป</span>{" "}
          <span className="block lg:inline">ห่างสถานีกี่ก้าว</span>
        </h1>
        <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-white/80 sm:text-lg">
          ซื้อหรือเช่าบ้าน คอนโด และที่ดินกว่า 96,000 ประกาศทั่วกรุงเทพฯ ทุกประกาศบอกระยะเดินถึง BTS และ MRT
        </p>

        <div className="mt-10 w-full max-w-[1160px] text-left">
          <HeroSearch listingTotals={listingTotals} lines={lines} />
        </div>
      </div>
    </section>
  );
}
