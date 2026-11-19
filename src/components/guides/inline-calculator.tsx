"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { NativeSelect } from "@/components/ui/field";
import { routes } from "@/data/navigation";
import { formatNumber, formatPrice } from "@/lib/format";
import { downPaymentOptions, estimateMortgage, termOptions, toMortgageQueryString } from "@/lib/mortgage";

const RATE_OPTIONS = [2.5, 3, 3.2, 3.5, 4, 4.5, 5, 6];

const uniqueSorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

/** Article-embedded estimate (D2, D12): fixed price, quick picks, link to the full calculator. */
export function InlineCalculator({
  price,
  downPaymentPct,
  annualRatePct,
  years,
}: {
  price: number;
  downPaymentPct: number;
  annualRatePct: number;
  years: number;
}) {
  const id = useId();
  const [down, setDown] = useState(downPaymentPct);
  const [rate, setRate] = useState(annualRatePct);
  const [term, setTerm] = useState(years);
  const input = { price, downPaymentPct: down, annualRatePct: rate, years: term };
  const { monthlyPayment } = estimateMortgage(input);

  const selects = [
    {
      key: "down",
      label: "เงินดาวน์",
      value: down,
      set: setDown,
      options: uniqueSorted([...downPaymentOptions, downPaymentPct]),
      text: (v: number) => `ดาวน์ ${v}%`,
    },
    {
      key: "rate",
      label: "ดอกเบี้ยต่อปี",
      value: rate,
      set: setRate,
      options: uniqueSorted([...RATE_OPTIONS, annualRatePct]),
      text: (v: number) => `ดอกเบี้ย ${v}%`,
    },
    {
      key: "years",
      label: "ระยะเวลาผ่อน",
      value: term,
      set: setTerm,
      options: uniqueSorted([...termOptions, years]),
      text: (v: number) => `${v} ปี`,
    },
  ];

  return (
    <aside
      aria-labelledby={`${id}-title`}
      className="my-7 rounded-xl border border-line bg-mist px-4 py-5 sm:px-[22px]"
    >
      <p id={`${id}-title`} className="font-semibold text-ink">
        ผ่อนห้องราคา ฿{formatPrice(price)} เดือนละเท่าไร
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {selects.map((s) => (
          <div key={s.key}>
            <label htmlFor={`${id}-${s.key}`} className="sr-only">
              {s.label}
            </label>
            <NativeSelect
              id={`${id}-${s.key}`}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="h-11 pr-9 pl-3 text-sm"
            >
              {s.options.map((v) => (
                <option key={v} value={v}>
                  {s.text(v)}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-ink" aria-live="polite">
          ค่างวดโดยประมาณ <b className="text-[22px] font-semibold tabular-nums">฿{formatNumber(monthlyPayment)}</b>{" "}
          ต่อเดือน
        </p>
        <Link
          href={`${routes.mortgageTool}?${toMortgageQueryString(input)}`}
          className="text-[15px] font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          เปิดเครื่องคำนวณเต็ม
        </Link>
      </div>
    </aside>
  );
}
