"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queries";
import type { DraftDto, DraftResponse, DraftValues, PostStep } from "@/types/api";

const SAVE_DELAY_MS = 800;

/** Which editor wrote each cached copy, so an editor can tell its own writes from everyone else's. */
const writers = new WeakMap<DraftDto, symbol>();

export type SaveState = { kind: "idle" | "saving" | "error" } | { kind: "saved"; at: string };

/**
 * The draft being edited.
 *
 * Inputs read the live copy from React state, so every keystroke re-renders
 * synchronously. (Reading it from the query cache made controlled inputs lag a
 * tick behind: React reset the field between keystrokes and fast typing, Thai
 * input or a mobile keyboard committing a word dropped characters.)
 *
 * Every edit is also written to the query cache, which the preview, the other
 * steps and Next's hidden copies of earlier step pages read. A cache change
 * this editor did not make itself (another copy, a refetch) is adopted, so a
 * stale copy can never save old values over new ones.
 *
 * Edits are saved to `PATCH /me/drafts/:id` 0.8 s after typing stops, right
 * away on "ถัดไป", and when leaving a step.
 */
export function useDraftEditor(initial: DraftDto) {
  const client = useQueryClient();
  const key = queryKeys.drafts.detail(initial.id);
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const [save, setSave] = useState<SaveState>({ kind: "saved", at: initial.updatedAt });

  const [draft, setDraft] = useState(initial);
  // Latest copy for handlers; updated immediately on edits and after each commit.
  const latest = useRef(initial);
  // Copies this editor wrote come back later as `initial` (a tick late) and must not undo newer edits.
  const [editorId] = useState(() => Symbol("draft-editor"));
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    if (writers.get(initial) !== editorId) setDraft(initial);
  }
  useLayoutEffect(() => {
    latest.current = draft;
  }, [draft]);

  const current = useCallback(() => latest.current, []);

  const mutation = useMutation({
    mutationFn: (body: { values: DraftValues; completedSteps: PostStep[] }) => api.updateDraft(initial.id, body),
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
      const next = { ...latest.current, ...change(latest.current) };
      latest.current = next;
      writers.set(next, editorId);
      setDraft(next);
      client.setQueryData<DraftResponse>(key, { data: next });
      dirty.current = true;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush().catch(() => {}), SAVE_DELAY_MS);
    },
    [client, key, flush, editorId],
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

  return { draft, set, markComplete, flush, save, retry: () => void flush().catch(() => {}) };
}
