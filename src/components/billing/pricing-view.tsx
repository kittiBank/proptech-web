"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { Button } from "@/components/ui/button";
import { contact, routes } from "@/data/navigation";
import { billingQueries } from "@/lib/api/queries";
import { YEARLY_MONTHS, formatBaht, planFeatures, planPrice, pricePerMonth } from "@/lib/billing";
import { BOOST_CATALOG, PLANS } from "@/lib/seller";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";
import type { BillingCycle } from "@/types/api";
import { useCreateOrder } from "./use-billing-actions";

const faqs = [
  {
    q: "ถ้าประกาศไม่ผ่านการตรวจ เงินค่าโปรโมตคืนไหม",
    a: "คืนเต็มจำนวนเป็นช่องทางเดิมหรือเป็นเครดิต ตามที่คุณเลือก",
  },
  {
    q: "ยกเลิกแพ็กเกจได้ไหม",
    a: "ยกเลิกการต่ออายุได้ทุกเมื่อ ใช้ต่อได้ถึงสิ้นรอบบิล ประกาศที่เกินโควตาฟรีจะถูกพักไว้",
  },
  { q: "ขอใบกำกับภาษีเต็มรูปได้ไหม", a: "ได้ ใส่ข้อมูลบริษัทครั้งเดียว ระบบออกให้ทุกยอดอัตโนมัติ" },
  {
    q: "เจ้าของทรัพย์ต้องยืนยันตัวตนไหม",
    a: "แค่ยืนยันเบอร์โทร ส่วนนายหน้าต้องยืนยันบัตรประชาชนก่อนเผยแพร่",
  },
];

const boostDuration: Record<string, string> = { bump: "ทันที" };

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mt-[18px] flex flex-col gap-2.5 text-sm text-ink">
      {items.map((f) => (
        <li key={f} className="flex gap-2">
          <Check className="mt-0.5 size-[18px] shrink-0 text-brand" aria-hidden="true" />
          {f}
        </li>
      ))}
    </ul>
  );
}

/** `/pricing` (C12): plans with a monthly/yearly switch, the promotion price list and FAQ. */
export function PricingView() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const { user } = useSession();
  const { data: billing } = useQuery({ ...billingQueries.summary, enabled: Boolean(user) });
  const order = useCreateOrder();
  const onPro = billing?.plan === "agent_pro" && billing.cycle === cycle;

  const choosePro = () => order.mutate({ kind: "plan", plan: "agent_pro", cycle });

  return (
    <div className="bg-white">
      <section className="bg-hero text-white">
        <Container className="pt-12 pb-28 text-center sm:pt-14">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[40px]">
            ลงฟรี จ่ายเฉพาะเมื่ออยากให้คนเห็นมากขึ้น
          </h1>
          <p className="mx-auto mt-2.5 max-w-[620px] text-[17px] text-violet-200">
            ไม่มีค่าคอมมิชชันจากการขายหรือเช่า ราคาทั้งหมดรวม VAT แล้ว
          </p>
          <div
            role="radiogroup"
            aria-label="รอบการชำระ"
            className="mt-6 inline-flex rounded-lg border border-violet-200/40 bg-white p-[3px]"
          >
            {(["monthly", "yearly"] as const).map((c) => (
              <label
                key={c}
                className={cn(
                  "inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md px-[18px] text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                  cycle === c ? "bg-ink text-white" : "text-ink hover:bg-mist",
                )}
              >
                <input
                  type="radio"
                  name="cycle"
                  value={c}
                  checked={cycle === c}
                  onChange={() => setCycle(c)}
                  className="sr-only"
                />
                {c === "monthly" ? "รายเดือน" : "รายปี"}
                {c === "yearly" && (
                  <span className="rounded-full bg-success-soft px-1.5 text-[11px] font-semibold text-success">
                    ประหยัด {12 - YEARLY_MONTHS} เดือน
                  </span>
                )}
              </label>
            ))}
          </div>
        </Container>
      </section>

      <Container className="-mt-20">
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          <article
            aria-labelledby="plan-free"
            className="flex flex-col rounded-xl border border-line bg-white p-[26px]"
          >
            <h2 id="plan-free" className="text-lg font-semibold text-ink">
              เจ้าของทรัพย์
            </h2>
            <p className="text-sm text-slate">ขายหรือปล่อยเช่าทรัพย์ของตัวเอง</p>
            <p className="mt-[18px] text-[38px] leading-tight font-semibold tracking-[-0.02em] text-ink">ฟรี</p>
            <p className="text-[13px] text-slate">ซื้อโปรโมตแยกเป็นครั้ง</p>
            <Features items={planFeatures.free} />
            <Button asChild variant="outline" size="lg" className="mt-6 md:mt-auto">
              <Link href={routes.postProperty}>เริ่มลงประกาศ</Link>
            </Button>
          </article>

          <article
            aria-labelledby="plan-pro"
            className="flex flex-col rounded-xl border-2 border-brand bg-white p-[25px] shadow-[0_16px_40px_rgba(112,71,235,.14)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="plan-pro" className="text-lg font-semibold text-ink">
                {PLANS.agent_pro.name}
              </h2>
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">
                นายหน้าเลือกมากที่สุด
              </span>
            </div>
            <p className="text-sm text-slate">นายหน้าอิสระและทีมเล็ก</p>
            <p className="mt-[18px] text-[38px] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {formatBaht(pricePerMonth("agent_pro", cycle))}
              <span className="text-base font-normal text-slate"> /เดือน</span>
            </p>
            <p className="text-[13px] text-slate tabular-nums">
              {cycle === "yearly"
                ? `จ่ายรายปี ${formatBaht(planPrice("agent_pro", "yearly"))} หรือรายเดือน ${formatBaht(planPrice("agent_pro", "monthly"))}`
                : `หรือจ่ายรายปี ${formatBaht(planPrice("agent_pro", "yearly"))} ประหยัด ${12 - YEARLY_MONTHS} เดือน`}
            </p>
            <Features items={planFeatures.agent_pro} />
            {user ? (
              <Button size="lg" className="mt-6" onClick={choosePro} disabled={order.isPending || onPro}>
                {onPro ? "แพ็กเกจปัจจุบันของคุณ" : order.isPending ? "กำลังสร้างรายการ…" : "เลือก Pro"}
              </Button>
            ) : (
              <Button asChild size="lg" className="mt-6">
                <Link href={routes.login({ next: routes.pricing })}>เลือก Pro</Link>
              </Button>
            )}
            <p className="mt-2 text-center text-xs text-slate">
              ต้อง
              <Link href={routes.verify} className="text-brand-strong underline underline-offset-4">
                ยืนยันตัวตน
              </Link>
              ก่อนเผยแพร่
            </p>
          </article>

          <article
            aria-labelledby="plan-agency"
            className="flex flex-col rounded-xl border border-line bg-white p-[26px]"
          >
            <h2 id="plan-agency" className="text-lg font-semibold text-ink">
              เอเจนซี
            </h2>
            <p className="text-sm text-slate">บริษัทนายหน้าที่มีหลายทีม</p>
            <p className="mt-[18px] text-[38px] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {formatBaht(pricePerMonth("agency", cycle))}
              <span className="text-base font-normal text-slate"> /เดือน</span>
            </p>
            <p className="text-[13px] text-slate tabular-nums">
              {cycle === "yearly" ? `จ่ายรายปี ${formatBaht(planPrice("agency", "yearly"))} ` : ""}เริ่ม 5 ที่นั่ง
            </p>
            <Features items={planFeatures.agency} />
            <Button asChild variant="outline" size="lg" className="mt-6 md:mt-auto">
              <a href={`mailto:${contact.email}?subject=${encodeURIComponent("สนใจแพ็กเกจเอเจนซี")}`}>ติดต่อทีมขาย</a>
            </Button>
          </article>
        </div>

        <section aria-labelledby="boost-prices" className="mt-16">
          <h2 id="boost-prices" className="text-[26px] font-semibold text-ink">
            โปรโมตรายประกาศ
          </h2>
          <p className="mt-1.5 text-slate">
            ซื้อได้ทุกแพ็กเกจ จ่ายด้วยเครดิต PromptPay หรือบัตร แพ็กเกจ Pro ใช้โควตาที่มีก่อน
          </p>
          {/* Scrolls sideways on phones; focusable so keyboard users can scroll it too. */}
          <div
            role="region"
            aria-label="ตารางราคาโปรโมต"
            tabIndex={0}
            className="relative mt-[18px] overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand"
          >
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">ราคาโปรโมตรายประกาศ รวม VAT</caption>
              <thead>
                <tr className="border-b border-line text-[13px] text-slate">
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    ประเภท
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    ได้อะไร
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">
                    ระยะเวลา
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-semibold">
                    ราคา
                  </th>
                </tr>
              </thead>
              <tbody>
                {BOOST_CATALOG.map((b) => (
                  <tr key={b.kind} className="border-b border-line">
                    <th scope="row" className="px-4 py-3.5 font-semibold text-ink">
                      {b.title.replace(/ \d+ (วัน|ครั้ง)$/, "")}
                    </th>
                    <td className="px-4 py-3.5 text-ink">{b.description}</td>
                    <td className="px-4 py-3.5 text-ink">{b.days ? `${b.days} วัน` : boostDuration[b.kind]}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink tabular-nums">
                      {formatBaht(b.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="pricing-faq" className="mt-16 pb-20">
          <h2 id="pricing-faq" className="text-[26px] font-semibold text-ink">
            คำถามที่พบบ่อย
          </h2>
          <dl className="mt-[18px] grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-ink">{f.q}</dt>
                <dd className="mt-1 text-sm text-slate">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Container>
    </div>
  );
}
