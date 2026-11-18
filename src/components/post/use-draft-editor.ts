"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { DraftDto, DraftResponse, DraftValues, PostStep } from "@/types/api";

const SAVE_DELAY_MS = 800;

export type SaveState = { kind: "idle" | "saving" | "error" } | { kind: "saved"; at: string };

/**
 * The draft being edited. The query cache holds the live copy (it survives
 * moving between step pages); edits are saved to `PATCH /me/drafts/:id`
 * 0.8 s after typing stops, right away on "ถัดไป", and when leaving a step.
 */
export function useDraftEditor(draft: DraftDto) {
  const client = useQueryClient();
  const key = queryKeys.drafts.detail(draft.id);
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const [save, setSave] = useState<SaveState>({ kind: "saved", at: draft.updatedAt });

  const current = useCallback(() => client.getQueryData<DraftResponse>(key)?.data ?? draft, [client, key, draft]);

  const mutation = useMutation({
    mutationFn: (body: { values: DraftValues; completedSteps: PostStep[] }) => api.updateDraft(draft.id, body),
    onMutate: () => setSave({ kind: "saving" }),
    onSuccess: ({ data }) => setSave({ kind: "saved", at: data.updatedAt }),
    onError: () => {
      dirty.current = true;
      setSave({ kind: "error" });
    },
  });
  const { mutateAsync } = mutation;

  /** Saves now; resolves when the server has the latest copy. */
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (!dirty.current) return;
    dirty.current = false;
    const { values, completedSteps } = current();
    await mutateAsync({ values, completedSteps });
  }, [current, mutateAsync]);

  const update = useCallback(
    (change: (d: DraftDto) => Partial<DraftDto>) => {
      client.setQueryData<DraftResponse>(key, (old) => {
        const base = old?.data ?? draft;
        return { data: { ...base, ...change(base) } };
      });
      dirty.current = true;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush().catch(() => {}), SAVE_DELAY_MS);
    },
    [client, key, draft, flush],
  );

  const set = useCallback(
    (patch: Partial<DraftValues> | ((v: DraftValues) => Partial<DraftValues>)) =>
      update((d) => ({ values: { ...d.values, ...(typeof patch === "function" ? patch(d.values) : patch) } })),
    [update],
  );

  const markComplete = useCallback(
    (step: PostStep) =>
      update((d) => ({
        completedSteps: d.completedSteps.includes(step) ? d.completedSteps : [...d.completedSteps, step],
      })),
    [update],
  );

  // Leaving the step page (stepper link, back button) saves what is pending.
  useEffect(
    () => () => {
      if (timer.current !== undefined) void flush().catch(() => {});
    },
    [flush],
  );

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || mutation.isPending) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mutation.isPending]);

  return { set, markComplete, flush, save, retry: () => void flush().catch(() => {}) };
}
