"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice";
import { TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { propertyQueries } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import {
  DEBT_TO_INCOME,
  MORTGAGE_LIMITS,
  downPaymentOptions,
  estimateMortgage,
  parseMortgageParams,
  principalSharePct,
  termOptions,
  toMortgageQueryString,
  type MortgageEstimate,
  type MortgageInput,
} from "@/lib/mortgage";
import { budgetListQuery, budgetPriceRange } from "@/lib/mortgage-budget";
import { cn } from "@/lib/utils";

const baht = (n: number) => `฿${formatNumber(n)}`;
const digitsOnly = (text: string) => text.replace(/[^\d]/g, "");

function validPrice(price: number) {
  return price >= MORTGAGE_LIMITS.price.min && price <= MORTGAGE_LIMITS.price.max;
}

function validRate(text: string) {
  const n = Number(text);
  return text.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= MORTGAGE_LIMITS.annualRatePct.max;
}

/** Presets plus the prefilled value, so a value from a link (e.g. 27 ปี) still shows as selected. */
const withValue = (options: readonly number[], value: number) =>
  [...new Set([...options, value])].sort((a, b) => a - b);

/** Inputs as typed (text) plus the last valid values, which the estimate uses. */
function useMortgageForm() {
  const searchParams = useSearchParams();
  // The URL only seeds the form; after that the form owns the values and mirrors them back.
  const [initial] = useState(() => parseMortgageParams(searchParams));
  const [priceText, setPriceTextState] = useState(formatNumber(initial.price));
  const [rateText, setRateTextState] = useState(String(initial.annualRatePct));
  // Kept while a field is half-typed or invalid, so the result does not jump to ฿0.
  const [price, setPrice] = useState(initial.price);
  const [annualRatePct, setRate] = useState(initial.annualRatePct);
  const [downPaymentPct, setDownPaymentPct] = useState(initial.downPaymentPct);
  const [years, setYears] = useState(initial.years);
  const input: MortgageInput = { price, downPaymentPct, annualRatePct, years };
  const query = toMortgageQueryString(input);

  // Shareable URL without a navigation (Next keeps useSearchParams in sync with history.replaceState).
  useEffect(() => {
    window.history.replaceState(null, "", `${routes.mortgageTool}?${query}`);
  }, [query]);

  const typedPrice = Number(digitsOnly(priceText));

  return {
    input,
    priceText,
    setPriceText: (text: string) => {
      const digits = digitsOnly(text).slice(0, 10);
      setPriceTextState(digits ? formatNumber(Number(digits)) : "");
      if (validPrice(Number(digits))) setPrice(Number(digits));
    },
    priceError: validPrice(typedPrice) ? undefined : "ใส่ราคาระหว่าง ฿100,000 ถึง ฿500 ล้าน",
    rateText,
    setRateText: (text: string) => {
      setRateTextState(text);
      if (validRate(text)) setRate(Number(text));
    },
    rateError: validRate(rateText) ? undefined : "ใส่ดอกเบี้ยระหว่าง 0 ถึง 20%",
    downPaymentPct,
    setDownPaymentPct,
    downOptions: withValue(downPaymentOptions, initial.downPaymentPct),
    years,
    setYears,
    termOptions: withValue(termOptions, initial.years),
  };
}

function BudgetLink({
  input,
  estimate,
  variant,
}: {
  input: MortgageInput;
  estimate: MortgageEstimate;
  variant: "card" | "bar";
}) {
  const range = budgetPriceRange(input.price);
  const { data } = useQuery(propertyQueries.list(budgetListQuery(input.price)));
  const total = data?.meta.total;
  const href = routes.search({ mode: "buy", price: range.value });
  const cta = total === undefined ? "ดูประกาศในงบนี้" : `ดู ${formatNumber(total)} ประกาศในงบนี้`;

  if (variant === "bar") {
    return (
      <BottomActionBar label="หาห้องในงบนี้" className="bg-white/95 backdrop-blur">
        <Button asChild size="lg" className="w-full font-semibold">
          <Link href={href}>{cta}</Link>
        </Button>
      </BottomActionBar>
    );
  }

  return (
    <div className="hidden flex-wrap items-center gap-5 rounded-xl border border-line px-6 py-5 lg:flex">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">หาห้องในงบนี้</p>
        <p className="text-sm text-slate">
          ค่างวดไม่เกิน {baht(estimate.monthlyPayment)} ต่อเดือน · ประกาศขายช่วง {range.label}{" "}
          {total === undefined ? (
            <Skeleton className="inline-block h-3.5 w-16 align-middle" />
          ) : (
            <>มี {formatNumber(total)} ประกาศ</>
          )}
        </p>
      </div>
      <Button asChild>
        <Link href={href}>ดูประกาศในงบ</Link>
      </Button>
    </div>
  );
}

function Breakdown({ estimate, compact }: { estimate: MortgageEstimate; compact?: boolean }) {
  const principal = principalSharePct(estimate);
  const interest = 100 - principal;
  const total = estimate.loanAmount + estimate.totalInterest;
  return (
    <div className={cn(!compact && "rounded-xl border border-line px-6 py-[22px]")}>
      <p className={cn("font-semibold text-ink", compact && "text-sm")}>ยอดจ่ายรวม {baht(total)}</p>
      <div
        role="img"
        aria-label={`เงินต้น ${principal}% ดอกเบี้ย ${interest}%`}
        className={cn("flex gap-0.5 overflow-hidden rounded", compact ? "mt-2 h-3" : "mt-3.5 h-4")}
      >
        <span className="bg-brand" style={{ width: `${principal}%` }} />
        <span className="flex-1 bg-violet-200" />
      </div>
      <ul
        className={cn(
          "flex flex-wrap gap-x-6 gap-y-1 text-slate",
          compact ? "mt-1.5 text-xs" : "mt-2.5 text-sm text-ink",
        )}
      >
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-brand" />
          เงินต้น {compact ? "" : `${baht(estimate.loanAmount)} `}({principal}%)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-violet-200" />
          ดอกเบี้ย {compact ? "" : `${baht(estimate.totalInterest)} `}({interest}%)
        </li>
      </ul>
    </div>
  );
}

export function MortgageTool() {
  const id = useId();
  const form = useMortgageForm();
  const { input } = form;
  const estimate = estimateMortgage(input);
  const downAmount = Math.round((input.price * form.downPaymentPct) / 100);

  return (
    <Container className="pt-6 pb-28 sm:pt-8 lg:pb-[72px]">
      <nav aria-label="เส้นทางหน้า">
        <ol className="flex items-center gap-1.5 text-sm text-slate">
          <li className="flex items-center gap-1.5">
            <Link href={routes.guides} className="text-brand-strong hover:underline">
              บทความ & คู่มือ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </li>
          <li>เครื่องมือ</li>
        </ol>
      </nav>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">คำนวณค่างวดผ่อนบ้าน</h1>
      <p className="mt-1 text-slate">ตัวเลขโดยประมาณ ดอกเบี้ยจริงขึ้นกับธนาคารและโปรโมชันในแต่ละช่วง</p>

      <div className="mt-6 grid items-start gap-6 lg:mt-7 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-8">
        {/* Result summary: first on phones (D13), right column on desktop (D3). */}
        <section
          aria-labelledby={`${id}-result`}
          className="rounded-xl bg-hero px-5 py-[18px] text-white sm:px-[30px] sm:py-7 lg:col-start-2 lg:row-start-1"
        >
          <p id={`${id}-result`} className="text-[13px] text-violet-200 sm:text-[15px]">
            ค่างวดต่อเดือนโดยประมาณ
          </p>
          <p
            aria-live="polite"
            className="mt-0.5 text-[36px] leading-tight font-semibold tracking-[-0.02em] tabular-nums sm:text-[48px]"
          >
            {baht(estimate.monthlyPayment)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#4A3C8C] pt-3 sm:mt-5 sm:grid-cols-3 sm:gap-4 sm:pt-[18px]">
            <div>
              <dt className="text-[13px] text-violet-200">วงเงินกู้</dt>
              <dd className="font-semibold tabular-nums sm:text-lg">{baht(estimate.loanAmount)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-violet-200">รายได้ขั้นต่ำที่ควรมี</dt>
              <dd className="font-semibold tabular-nums sm:text-lg">{baht(estimate.minMonthlyIncome)}/เดือน</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-[13px] text-violet-200">ดอกเบี้ยรวม {input.years} ปี</dt>
              <dd className="font-semibold tabular-nums sm:text-lg">{baht(estimate.totalInterest)}</dd>
            </div>
          </dl>
        </section>

        <section
          aria-label="ข้อมูลสินเชื่อ"
          className="flex flex-col gap-5 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:rounded-xl lg:border lg:border-line lg:p-6"
        >
          <TextField
            id={`${id}-price`}
            label="ราคาทรัพย์"
            inputMode="numeric"
            autoComplete="off"
            suffix="บาท"
            value={form.priceText}
            onChange={(e) => form.setPriceText(e.target.value)}
            error={form.priceError}
            className="font-semibold tabular-nums"
          />

          <fieldset className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <legend className="text-sm font-medium text-ink">เงินดาวน์</legend>
              <span className="text-sm text-slate tabular-nums">
                {form.downPaymentPct}% · {baht(downAmount)}
              </span>
            </div>
            <input
              type="range"
              aria-label="เงินดาวน์ (เปอร์เซ็นต์)"
              min={MORTGAGE_LIMITS.downPaymentPct.min}
              max={50}
              step={5}
              value={form.downPaymentPct}
              onChange={(e) => form.setDownPaymentPct(Number(e.target.value))}
              aria-valuetext={`${form.downPaymentPct} เปอร์เซ็นต์`}
              className="my-1 hidden w-full accent-brand lg:block"
            />
            <div className="flex flex-wrap gap-1.5">
              {form.downOptions.map((pct) => (
                <ChoiceChip
                  key={pct}
                  type="radio"
                  name={`${id}-down`}
                  checked={form.downPaymentPct === pct}
                  onChange={() => form.setDownPaymentPct(pct)}
                >
                  {pct}%
                </ChoiceChip>
              ))}
            </div>
          </fieldset>

          <TextField
            id={`${id}-rate`}
            label="ดอกเบี้ยเฉลี่ย 3 ปีแรก"
            inputMode="decimal"
            autoComplete="off"
            suffix="% ต่อปี"
            value={form.rateText}
            onChange={(e) => form.setRateText(e.target.value.replace(/[^\d.]/g, ""))}
            error={form.rateError}
            hint="หลังปีที่ 3 ดอกเบี้ยมักลอยตัว ลองใส่ 5 ถึง 6% เพื่อเผื่อไว้"
            className="pr-20 tabular-nums"
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-ink">ระยะเวลาผ่อน</legend>
            <div className="flex flex-wrap gap-1.5">
              {form.termOptions.map((y) => (
                <ChoiceChip
                  key={y}
                  type="radio"
                  name={`${id}-years`}
                  checked={form.years === y}
                  onChange={() => form.setYears(y)}
                >
                  {y} ปี
                </ChoiceChip>
              ))}
            </div>
          </fieldset>

          <div className="lg:hidden">
            <Breakdown estimate={estimate} compact />
          </div>
        </section>

        <div className="flex flex-col gap-5 lg:col-start-2">
          <div className="hidden lg:block">
            <Breakdown estimate={estimate} />
          </div>
          <BudgetLink input={input} estimate={estimate} variant="card" />
          <p className="text-[13px] text-slate">
            ธนาคารส่วนใหญ่ให้ภาระหนี้รวมไม่เกิน {DEBT_TO_INCOME * 100}% ของรายได้ ค่างวดนี้ยังไม่รวมประกันอัคคีภัย
            ประกันชีวิตผู้กู้ และค่าโอน
          </p>
        </div>
      </div>

      <BudgetLink input={input} estimate={estimate} variant="bar" />
    </Container>
  );
}
