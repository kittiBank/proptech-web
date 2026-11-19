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
