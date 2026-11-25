import Link from "next/link";
import { Container } from "@/components/home/section-header";
import { DPO_EMAIL, legalDocs, type LegalDoc } from "@/data/legal";
import { routes } from "@/data/navigation";
import { formatThaiDate } from "@/lib/seller";
import { cn } from "@/lib/utils";
import { CookieSettingsButton } from "@/components/consent/cookie-consent";
import { LegalToc } from "./legal-toc";

/** Legal page template (D5): document switcher and table of contents, a summary box, then numbered sections. */
export function LegalView({ doc }: { doc: LegalDoc }) {
  return (
    <Container className="grid grid-cols-1 gap-8 pt-8 pb-16 lg:grid-cols-[260px_minmax(0,760px)] lg:gap-14 lg:pt-9">
      <nav aria-label="เอกสาร" className="self-start lg:sticky lg:top-24">
        <ul className="mb-5 flex flex-wrap gap-x-4 gap-y-1 lg:flex-col lg:gap-0.5">
          {legalDocs.map((d) => (
            <li key={d.slug}>
              <Link
                href={routes.legal(d.slug)}
                aria-current={d.slug === doc.slug ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center",
                  d.slug === doc.slug ? "font-semibold text-violet-700" : "text-ink hover:text-brand-strong",
                )}
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden lg:block">
          <p className="mb-2 text-xs font-semibold text-slate">หัวข้อ</p>
          <LegalToc sections={doc.sections} />
        </div>
      </nav>

      <article>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">{doc.title}</h1>
        <p className="mt-1.5 text-sm text-slate">
          มีผลตั้งแต่ {formatThaiDate(`${doc.effectiveDate}T12:00:00+07:00`)} · ฉบับที่ {doc.version}
        </p>
        <section aria-labelledby="legal-summary" className="mt-6 mb-8 rounded-[10px] bg-brand-soft px-[22px] py-5">
          <h2 id="legal-summary" className="mb-1.5 font-semibold text-ink">
            สรุปสั้น
          </h2>
          <ul className="list-disc pl-5 leading-[1.9] text-ink">
            {doc.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
            <h2 id={`${s.id}-title`} className={cn("mb-3 text-[22px] font-semibold text-ink", i > 0 && "mt-7")}>
              {i + 1}. {s.title}
            </h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mb-4 text-base leading-[1.85] text-ink">
                {p}
              </p>
            ))}
          </section>
        ))}
        {doc.slug === "cookies" && (
          <CookieSettingsButton className="mt-2 h-11 rounded-md border border-line-strong px-4 font-medium text-ink hover:border-ink" />
        )}
        <p className="mt-8 border-t border-line pt-5 text-sm text-slate">
          มีคำถามเรื่องข้อมูลส่วนบุคคล ติดต่อ{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-brand-strong underline underline-offset-4">
            {DPO_EMAIL}
          </a>
        </p>
      </article>
    </Container>
  );
}
