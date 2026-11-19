"use client";

import { useId, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber, formatPrice } from "@/lib/format";
import { estimateMortgage } from "@/lib/mortgage";

const TERMS = [10, 15, 20, 25, 30, 35, 40];
const DEFAULT_RATE = 5.5;

const fieldLabel = "text-[13px] font-medium text-slate";

/** Monthly repayment estimate for a sale listing, prefilled with its price. */
export function MortgageCalculator({ price }: { price: number }) {
  const id = useId();
  const [downPct, setDownPct] = useState(10);
  const [rateText, setRateText] = useState(String(DEFAULT_RATE));
  const [years, setYears] = useState(30);

  const rate = Number(rateText);
  const rateValid = rateText.trim() !== "" && Number.isFinite(rate) && rate >= 0 && rate <= 20;
  const estimate = estimateMortgage({
    price,
    downPaymentPct: downPct,
    annualRatePct: rateValid ? rate : DEFAULT_RATE,
    years,
  });

  return (
    <div className="grid gap-6 rounded-lg border border-line p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-down`} className={fieldLabel}>
              เงินดาวน์
            </label>
            <span className="text-[15px] font-semibold text-ink tabular-nums">
              {downPct}% · ฿{formatPrice(Math.round((price * downPct) / 100))}
            </span>
          </div>
          <input
            id={`${id}-down`}
            type="range"
            min={0}
            max={50}
            step={5}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            aria-valuetext={`${downPct} เปอร์เซ็นต์`}
            className="w-full accent-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-rate`} className={fieldLabel}>
              ดอกเบี้ยต่อปี (%)
            </label>
            <input
              id={`${id}-rate`}
              type="number"
              inputMode="decimal"
              min={0}
              max={20}
              step={0.05}
              value={rateText}
              onChange={(e) => setRateText(e.target.value)}
              aria-invalid={!rateValid}
              aria-describedby={rateValid ? undefined : `${id}-rate-error`}
              className="h-10 rounded-md border border-line-strong bg-white px-3 text-[15px] text-ink tabular-nums aria-invalid:border-red-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span id={`${id}-term`} className={fieldLabel}>
              ระยะเวลากู้
            </span>
            <Select value={String(years)} onValueChange={(v) => setYears(Number(v))}>
              <SelectTrigger aria-labelledby={`${id}-term`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {t} ปี
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!rateValid && (
          <p id={`${id}-rate-error`} className="-mt-2 text-[13px] text-red-600">
            ใส่ดอกเบี้ยระหว่าง 0–20%
          </p>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-md bg-brand-soft p-5">
        <div>
          <p className="text-[13px] text-slate">ผ่อนต่อเดือนประมาณ</p>
          <p
            className="mt-1 text-[30px] leading-none font-semibold tracking-tight text-ink tabular-nums"
            aria-live="polite"
          >
            ฿{formatNumber(estimate.monthlyPayment)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <dt className="text-slate">ยอดกู้</dt>
          <dd className="text-right font-medium text-ink tabular-nums">฿{formatNumber(estimate.loanAmount)}</dd>
          <dt className="text-slate">ดอกเบี้ยรวม</dt>
          <dd className="text-right font-medium text-ink tabular-nums">฿{formatNumber(estimate.totalInterest)}</dd>
          <dt className="text-slate">รายได้ที่ควรมี</dt>
          <dd className="text-right font-medium text-ink tabular-nums">
            ฿{formatNumber(estimate.minMonthlyIncome)}/เดือน
          </dd>
        </dl>
      </div>

      <p className="text-[12px] leading-relaxed text-slate sm:col-span-2">
        ตัวเลขเป็นการประมาณด้วยอัตราดอกเบี้ยคงที่ตลอดสัญญา ยอดผ่อนจริงขึ้นกับธนาคาร โปรโมชันดอกเบี้ย และคุณสมบัติผู้กู้
        รายได้ที่ควรมีคิดจากภาระผ่อนไม่เกิน 40% ของรายได้
      </p>
    </div>
  );
}
