import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { lineColor } from "@/components/property/transit-badge";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { popularStations } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { cn } from "@/lib/utils";

interface NotFoundViewProps {
  title?: string;
  description?: string;
}

/** D8: unknown page or listing. A search box and popular stations, so the visit is not a dead end. */
export function NotFoundView({
  title = "ไม่พบหน้าที่คุณหา",
  description = "ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว ลองค้นหาจากชื่อโครงการ ย่าน หรือสถานี",
}: NotFoundViewProps) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 py-16 text-center sm:py-24">
      {/* Decoration in the design's pale violet; generated content keeps it out of the text (and contrast checks). */}
      <span
        aria-hidden="true"
        className="text-[72px] leading-none font-semibold tracking-[-0.04em] text-violet-200 before:content-['404'] sm:text-[96px]"
      />
      <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">{title}</h1>
      <p className="mt-1.5 max-w-[460px] text-[16px] text-slate">{description}</p>

      <Form action={routes.search({})} role="search" className="mt-7 flex w-full max-w-[560px] gap-2">
        <label htmlFor="not-found-q" className="sr-only">
          ค้นหาประกาศ
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-slate"
            aria-hidden="true"
          />
          <input
            id="not-found-q"
            name="q"
            type="search"
            placeholder="ชื่อโครงการ ย่าน หรือสถานี"
            className={cn(inputClass, "h-12 pl-10")}
          />
        </div>
        <Button type="submit" size="lg">
          ค้นหา
        </Button>
      </Form>

      <h2 className="mt-9 mb-2.5 text-sm font-normal text-slate">หรือเริ่มจากสถานียอดนิยม</h2>
      <ul className="flex flex-wrap justify-center gap-2">
        {popularStations.map((s) => (
          <li key={s.code}>
            <Link
              href={routes.search({ station: s.code })}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-sm text-ink hover:border-ink"
            >
              <span
                className={cn(
                  "inline-flex h-5 min-w-8 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white",
                  lineColor[s.line],
                )}
              >
                {s.code}
              </span>{" "}
              {s.name}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-9 text-sm">
        <Link href={routes.home} className="text-brand-strong underline-offset-4 hover:underline">
          กลับหน้าแรก
        </Link>
        <span aria-hidden="true" className="mx-2 text-slate">
          ·
        </span>
        <Link href={routes.help} className="text-brand-strong underline-offset-4 hover:underline">
          ศูนย์ช่วยเหลือ
        </Link>
      </p>
    </div>
  );
}
