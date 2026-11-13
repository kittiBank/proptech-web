import { describe, expect, it } from "vitest";
import { estimateMortgage } from "./mortgage";

describe("estimateMortgage", () => {
  it("amortises a 30-year loan at 6%", () => {
    // 5,000,000 at 10% down → 4,500,000 loan; standard annuity ≈ 26,980/month.
    const e = estimateMortgage({ price: 5_000_000, downPaymentPct: 10, annualRatePct: 6, years: 30 });
    expect(e.loanAmount).toBe(4_500_000);
    expect(e.monthlyPayment).toBe(26_980);
    expect(Math.abs(e.totalInterest - 5_212_719)).toBeLessThan(2);
    expect(e.minMonthlyIncome).toBe(Math.round(e.monthlyPayment / 0.4));
  });

  it("splits the loan evenly when the rate is zero", () => {
    const e = estimateMortgage({ price: 1_200_000, downPaymentPct: 0, annualRatePct: 0, years: 10 });
    expect(e.monthlyPayment).toBe(10_000);
    expect(e.totalInterest).toBe(0);
  });

  it("needs no loan when paid in full", () => {
    const e = estimateMortgage({ price: 3_000_000, downPaymentPct: 100, annualRatePct: 5, years: 20 });
    expect(e.loanAmount).toBe(0);
    expect(e.monthlyPayment).toBe(0);
  });
});
