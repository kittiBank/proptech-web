"use client";

import { useState, type ComponentProps } from "react";
import { TextField } from "@/components/ui/field";

interface NumberTextOptions {
  /** Allow one decimal point, e.g. 35.5 ตร.ม. */
  decimal?: boolean;
  /** Show thousands separators, e.g. 6,900,000. */
  grouped?: boolean;
}

const THAI_DIGITS = /[๐-๙]/g;

/**
 * Cleans what was typed into a numeric field: Thai digits become 0–9; letters,
 * signs, spaces and extra dots are dropped (one stray key never wipes the field).
 */
export function cleanNumberText(raw: string, { decimal = false, grouped = false }: NumberTextOptions = {}): string {
  let text = raw.replace(THAI_DIGITS, (d) => String(d.charCodeAt(0) - 0x0e50)).replace(/[^\d.]/g, "");
  const dot = text.indexOf(".");
  text = !decimal
    ? text.replace(/\./g, "")
    : dot < 0
      ? text
      : text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, "");
  if (!grouped) return text;
  const [whole, fraction] = text.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? withCommas : `${withCommas}.${fraction}`;
}

/** The number in a cleaned text, or `undefined` while it is empty or just ".". */
export function parseNumberText(text: string): number | undefined {
  const plain = text.replace(/,/g, "");
  if (plain === "" || plain === ".") return undefined;
  const n = Number(plain);
  return Number.isFinite(n) ? n : undefined;
}

const toText = (value: number | undefined, options: NumberTextOptions) =>
  value === undefined ? "" : cleanNumberText(String(value), options);

type NumberFieldProps = Omit<ComponentProps<typeof TextField>, "value" | "onChange" | "inputMode"> &
  NumberTextOptions & {
    value: number | undefined;
    onValue: (value: number | undefined) => void;
  };

/**
 * Text field for a number. Keeps the text as typed ("35." while typing 35.5)
 * and reports the parsed number; follows `value` when it changes from outside
 * (e.g. a project prefilling the building height).
 */
export function NumberField({ value, onValue, decimal, grouped, ...props }: NumberFieldProps) {
  const options = { decimal, grouped };
  const [text, setText] = useState(() => toText(value, options));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (value !== parseNumberText(text)) setText(toText(value, options));
  }

  return (
    <TextField
      {...props}
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const next = cleanNumberText(e.target.value, options);
        const n = parseNumberText(next);
        setText(next);
        setSynced(n);
        onValue(n);
      }}
    />
  );
}
