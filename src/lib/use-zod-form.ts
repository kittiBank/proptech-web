"use client";

import { useState, type FocusEvent, type FormEvent } from "react";
import type { z } from "zod";
import { fieldErrors, formValues, type FieldErrors } from "./validation";

/**
 * Validation for uncontrolled forms (design handoff §4): check a field when it
 * loses focus (once it has a value) and every field on submit; errors render
 * under the field. `onValid` gets the parsed output.
 */
export function useZodForm<S extends z.ZodType<Record<string, unknown>>>(
  schema: S,
  onValid: (values: z.output<S>, form: HTMLFormElement) => void,
) {
  const [errors, setErrors] = useState<FieldErrors<z.input<S>>>({});

  const onBlur = (e: FocusEvent<HTMLFormElement>) => {
    const target = e.target as EventTarget as HTMLInputElement;
    if (!target.name || target.type === "checkbox" || !target.value) return;
    const result = schema.safeParse(formValues(e.currentTarget));
    const message = result.success ? undefined : result.error.issues.find((i) => i.path[0] === target.name)?.message;
    setErrors((prev) => ({ ...prev, [target.name]: message }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const result = schema.safeParse(formValues(form));
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      // Move focus to the first broken field so keyboard and screen-reader users land on it.
      const first = result.error.issues[0]?.path[0];
      if (typeof first === "string") (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    onValid(result.data, form);
  };

  return { errors, setErrors, formProps: { onBlur, onSubmit, noValidate: true } };
}
