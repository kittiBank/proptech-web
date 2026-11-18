import { z } from "zod";

/**
 * Shared Zod pieces for forms. Messages are the Thai copy shown under the
 * field, so schemas double as the form's error text.
 */

/** Thai mobile or landline: 9–10 digits starting with 0. Dashes and spaces are allowed and stripped. */
export const thaiPhone = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^0\d{8,9}$/, "กรอกเบอร์โทร 9–10 หลัก เช่น 0812345678"));

export const requiredText = (message: string) => z.string().trim().min(1, message);

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/** First error message per field, from a failed `safeParse`. */
export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out as FieldErrors<T>;
}

/**
 * Validates one field of an object schema, for on-blur checks. Returns the
 * message, or `undefined` when the value is fine.
 */
export function validateField<S extends z.ZodObject>(
  schema: S,
  field: keyof z.input<S> & string,
  values: Partial<z.input<S>>,
): string | undefined {
  const result = schema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
}
