export interface MortgageInput {
  /** Purchase price in THB. */
  price: number;
  /** Down payment as a percentage of the price, 0–100. */
  downPaymentPct: number;
  /** Annual interest rate in percent, e.g. 5.5. */
  annualRatePct: number;
  years: number;
}

export interface MortgageEstimate {
  loanAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  /** Thai banks typically cap repayments at about 40% of monthly income. */
  minMonthlyIncome: number;
}

/** Share of monthly income banks usually allow for loan repayments. */
export const DEBT_TO_INCOME = 0.4;

/** Fixed-rate amortising loan, monthly compounding. Amounts are rounded to whole baht. */
export function estimateMortgage({ price, downPaymentPct, annualRatePct, years }: MortgageInput): MortgageEstimate {
  const loan = Math.max(0, price * (1 - downPaymentPct / 100));
  const n = Math.max(1, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  const monthly = r === 0 ? loan / n : (loan * r) / (1 - (1 + r) ** -n);
  const monthlyPayment = Math.round(monthly);
  return {
    loanAmount: Math.round(loan),
    monthlyPayment,
    totalInterest: Math.round(monthly * n - loan),
    // From the rounded payment, so it matches what the page shows.
    minMonthlyIncome: Math.round(monthlyPayment / DEBT_TO_INCOME),
  };
}

// ---------------------------------------------------------------------------
// Calculator page state (/tools/mortgage). The URL holds the inputs so an
// article can link to the calculator prefilled, and a result can be shared.
// ---------------------------------------------------------------------------

export const MORTGAGE_LIMITS = {
  price: { min: 100_000, max: 500_000_000 },
  downPaymentPct: { min: 0, max: 90 },
  annualRatePct: { min: 0, max: 20 },
  years: { min: 1, max: 40 },
} as const;

/** Design D3 defaults: 10% down, 3.2% (a typical first-3-years rate), 30 years. */
export const defaultMortgageInput: MortgageInput = {
  price: 5_000_000,
  downPaymentPct: 10,
  annualRatePct: 3.2,
  years: 30,
};

export const downPaymentOptions = [0, 5, 10, 20, 30] as const;
export const termOptions = [15, 20, 25, 30, 35] as const;

function readNumber(raw: string | null, { min, max }: { min: number; max: number }, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/** Reads `price`, `down`, `rate` and `years`; missing or out-of-range values fall back to the defaults. */
export function parseMortgageParams(params: Pick<URLSearchParams, "get">): MortgageInput {
  const d = defaultMortgageInput;
  return {
    price: Math.round(readNumber(params.get("price"), MORTGAGE_LIMITS.price, d.price)),
    downPaymentPct: readNumber(params.get("down"), MORTGAGE_LIMITS.downPaymentPct, d.downPaymentPct),
    annualRatePct: readNumber(params.get("rate"), MORTGAGE_LIMITS.annualRatePct, d.annualRatePct),
    years: Math.round(readNumber(params.get("years"), MORTGAGE_LIMITS.years, d.years)),
  };
}

export function toMortgageQueryString(input: MortgageInput): string {
  return new URLSearchParams({
    price: String(input.price),
    down: String(input.downPaymentPct),
    rate: String(input.annualRatePct),
    years: String(input.years),
  }).toString();
}

/** Principal's share of everything paid over the loan, 0–100, for the principal/interest bar. */
export function principalSharePct({ loanAmount, totalInterest }: MortgageEstimate): number {
  const total = loanAmount + totalInterest;
  return total > 0 ? Math.round((loanAmount / total) * 100) : 100;
}
