import { describe, expect, it } from "vitest";
import type { OrderDto } from "@/types/api";
import {
  applyCoupon,
  cardBrand,
  formatBaht,
  formatCardNumber,
  formatExpiry,
  invoiceHtml,
  isValidCardNumber,
  isValidExpiry,
  isValidTaxId,
  planPrice,
  pricePerMonth,
  qrMatrix,
  splitVat,
} from "./billing";

describe("prices", () => {
  it("splits VAT out of an inclusive price to the satang", () => {
    expect(splitVat(590)).toEqual({ subtotal: 551.4, vat: 38.6 });
    expect(splitVat(1290)).toEqual({ subtotal: 1205.61, vat: 84.39 });
    const { subtotal, vat } = splitVat(49);
    expect(subtotal + vat).toBeCloseTo(49, 10);
  });

  it("charges 10 months for a year", () => {
    expect(planPrice("agent_pro", "monthly")).toBe(1290);
    expect(planPrice("agent_pro", "yearly")).toBe(12_900);
    expect(pricePerMonth("agent_pro", "yearly")).toBe(1075);
    expect(planPrice("free", "yearly")).toBe(0);
  });

  it("formats baht and applies coupons", () => {
    expect(formatBaht(1290)).toBe("฿1,290");
    expect(formatBaht(590, true)).toBe("฿590.00");
    expect(applyCoupon(590, 10)).toBe(531);
  });
});

describe("cards", () => {
  it("checks numbers with Luhn and reads the brand", () => {
    expect(isValidCardNumber("4242 4242 4242 4242")).toBe(true);
    expect(isValidCardNumber("4242 4242 4242 4241")).toBe(false);
    expect(isValidCardNumber("1234")).toBe(false);
    expect(cardBrand("4242424242424242")).toBe("visa");
    expect(cardBrand("5555555555554444")).toBe("mastercard");
    expect(cardBrand("3530111333300000")).toBe("jcb");
    expect(cardBrand("6011111111111117")).toBeUndefined();
  });

  it("formats while typing and rejects past expiry dates", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatExpiry("0829")).toBe("08/29");
    const now = new Date("2026-11-25T00:00:00Z");
    expect(isValidExpiry("11/26", now)).toBe(true);
    expect(isValidExpiry("10/26", now)).toBe(false);
    expect(isValidExpiry("13/30", now)).toBe(false);
  });

  it("checks Thai tax ids", () => {
    expect(isValidTaxId("0105566012344")).toBe(true);
    expect(isValidTaxId("0-1055-66012-34-4")).toBe(true);
    expect(isValidTaxId("0105566012345")).toBe(false);
    expect(isValidTaxId("12345")).toBe(false);
  });
});

describe("PromptPay QR and invoice", () => {
  it("draws the same grid for the same payload, with finder squares", () => {
    const a = qrMatrix("o-1");
    expect(a).toHaveLength(25);
    expect(qrMatrix("o-1")).toEqual(a);
    expect(qrMatrix("o-2")).not.toEqual(a);
    // Top-left finder: solid border, light ring, solid centre.
    expect(a[0].slice(0, 7).every(Boolean)).toBe(true);
    expect(a[1][1]).toBe(false);
    expect(a[3][3]).toBe(true);
  });

  it("escapes buyer details in the invoice", () => {
    const order = {
      id: "o-1",
      title: "เติมเครดิต",
      listPrice: 500,
      discount: 0,
      amount: 500,
      subtotal: 467.29,
      vat: 32.71,
      invoiceNo: "INV-2569-000121",
      createdAt: "2026-11-25T03:00:00Z",
      paidAt: "2026-11-25T03:00:00Z",
    } as OrderDto;
    const html = invoiceHtml(order, { type: "personal", name: "<script>x</script>", email: "a@b.co" });
    expect(html).toContain("INV-2569-000121");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("฿467.29");
    expect(html).not.toContain("<script>x");
  });
});
