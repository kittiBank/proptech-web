"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ChevronDown, Mail, MessageCircle, Search, SearchX, ShieldAlert } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { contact, routes } from "@/data/navigation";
import { helpTopics, searchFaqs, supportChannels, type HelpFaq, type HelpTopic } from "@/data/help";
import { cn } from "@/lib/utils";

function Faq({ faq, open, onToggle }: { faq: HelpFaq; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="border-t border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-medium text-ink hover:text-brand-strong"
        >
          <span className={cn(open && "font-semibold")}>{faq.question}</span>
          <ChevronDown
            className={cn("size-5 shrink-0 text-slate transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-4">
        <p className="leading-[1.75] text-slate">{faq.answer}</p>
        {faq.link && (
          <Link
            href={faq.link.href}
            className="mt-2 inline-flex min-h-9 items-center font-medium text-brand-strong underline underline-offset-4"
          >
            {faq.link.label}
          </Link>
        )}
      </div>
    </li>
  );
}

/** `/help` (D4): search and topics in the URL, an FAQ accordion, and ways to reach the team. */
export function HelpView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const topicParam = params.get("topic");
  const topic = helpTopics.some((t) => t.id === topicParam) ? (topicParam as HelpTopic) : undefined;
  const [query, setQuery] = useState(q);
  const faqs = searchFaqs(q, topic);
  // The first answer starts open, like the design.
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  const go = (next: { q?: string; topic?: HelpTopic | null }) => {
    const sp = new URLSearchParams();
    const nq = next.q ?? q;
    const nt = next.topic === undefined ? topic : next.topic;
    if (nq) sp.set("q", nq);
    if (nt) sp.set("topic", nt);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setOpenId(searchFaqs(nq, nt ?? undefined)[0]?.id ?? null);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go({ q: query.trim() });
  };
  const topicTitle = helpTopics.find((t) => t.id === topic)?.title;

  return (
    <div className="bg-white">
      <section className="bg-hero text-white">
        <Container className="py-10 text-center sm:py-12">
          <h1 className="text-[30px] font-semibold sm:text-[36px]">ศูนย์ช่วยเหลือ</h1>
          <p className="mt-1.5 text-violet-200">ค้นหาคำตอบ หรือคุยกับทีมงาน {supportChannels.hours}</p>
          <form role="search" onSubmit={submit} className="relative mx-auto mt-5 max-w-[600px]">
            <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="ค้นหาคำถาม"
              placeholder="พิมพ์คำถาม เช่น ประกาศไม่ผ่าน"
              className="h-[54px] w-full rounded-md border border-line-strong bg-white pr-28 pl-12 text-base text-ink placeholder:text-slate focus:ring-3 focus:ring-violet-200 focus:outline-none"
            />
            <Button type="submit" size="base" className="absolute top-1/2 right-2 -translate-y-1/2">
              ค้นหา
            </Button>
          </form>
        </Container>
      </section>

      <Container className="pt-8 pb-16 sm:pt-10">
        <nav aria-label="หมวดคำถาม">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {helpTopics.map((t) => {
              const active = t.id === topic;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => go({ topic: active ? null : t.id })}
                    className={cn(
                      "w-full rounded-[10px] border bg-white px-5 py-[18px] text-left transition-colors hover:border-ink",
                      active ? "border-2 border-brand bg-[#FAF8FF] px-[19px] py-[17px]" : "border-line",
                    )}
                  >
                    <span className="block font-semibold text-ink">{t.title}</span>
                    <span className="text-sm text-slate">{t.description}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-10 grid grid-cols-1 items-start gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="faq-title">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="faq-title" className="text-[22px] font-semibold text-ink">
                {q ? `ผลการค้นหา “${q}”` : (topicTitle ?? "คำถามที่พบบ่อย")}
              </h2>
              {(q || topic) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    go({ q: "", topic: null });
                  }}
                  className="min-h-9 text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
                >
                  ดูคำถามทั้งหมด
                </button>
              )}
            </div>
            <p className="sr-only" aria-live="polite">
              พบ {faqs.length} คำถาม
            </p>
            {faqs.length ? (
              <ul className="border-b border-line">
                {faqs.map((f) => (
                  <Faq
                    key={f.id}
                    faq={f}
                    open={openId === f.id}
                    onToggle={() => setOpenId(openId === f.id ? null : f.id)}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={SearchX}
                title="ไม่พบคำถามที่ตรงกัน"
                body="ลองใช้คำอื่น หรือทักทีมงานได้เลย เราตอบเร็ว"
                className="rounded-lg border border-line py-10"
              />
            )}
          </section>

          <aside
            aria-labelledby="contact-title"
            className="flex flex-col gap-3 rounded-xl border border-line p-[22px] lg:sticky lg:top-24"
          >
            <h2 id="contact-title" className="text-lg font-semibold text-ink">
              ยังไม่เจอคำตอบ
            </h2>
            <Button asChild>
              <Link href={routes.messageTo("support")}>
                <MessageCircle aria-hidden="true" />
                แชตกับทีมงาน
                <span className="text-xs font-normal">ตอบใน ~5 นาที</span>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={supportChannels.lineUrl} target="_blank" rel="noopener noreferrer">
                LINE {supportChannels.lineId}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${contact.email}`}>
                <Mail aria-hidden="true" />
                ส่งอีเมล ตอบใน 1 วันทำการ
              </a>
            </Button>
            <button
              type="button"
              onClick={() => go({ topic: "safety", q: "" })}
              className="mt-1 inline-flex min-h-9 items-center gap-1.5 text-left text-sm font-medium text-brand-strong underline underline-offset-4"
            >
              <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
              พบประกาศน่าสงสัย ดูวิธีแจ้งเรา
            </button>
          </aside>
        </div>
      </Container>
    </div>
  );
}
