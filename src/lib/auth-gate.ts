"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { sessionQuery } from "@/lib/api/queries";
import { routes } from "@/data/navigation";
import { useSession } from "@/providers/session";
import type { PropertyImage } from "@/types/property";

/**
 * Gated actions (favorite, message, request a viewing, save a search). Signed-out visitors
 * get the login modal; the action waits in sessionStorage and the component
 * that started it runs it once the visitor is signed in and back on the page.
 */

export type GateIntent = "favorite" | "message" | "viewing" | "save-search";

export interface PendingAction {
  intent: GateIntent;
  /** Which instance resumes, e.g. the listing id. */
  key: string;
  /** Page the action belongs to (pathname only). */
  path: string;
  /** Shown in the login modal, e.g. the listing being saved. */
  preview?: { title: string; subtitle?: string; image?: PropertyImage };
}

const KEY = "propertyhub:pending-action";
let memory: PendingAction | null = null;

export function getPendingAction(): PendingAction | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingAction) : memory;
  } catch {
    return memory;
  }
}

export function setPendingAction(action: PendingAction | null) {
  memory = action;
  try {
    if (action) window.sessionStorage.setItem(KEY, JSON.stringify(action));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Memory only.
  }
}

/** `/path?x` only; anything else (other origins, `//host`) falls back to `fallback`. */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : fallback;
}

/**
 * `requireAuth(action, run)`: runs `run` now when signed in; otherwise saves
 * the action and opens the login modal (`/login`, intercepted on site pages).
 */
export function useAuthGate() {
  const { user } = useSession();
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    async (action: Omit<PendingAction, "path">, run: () => void) => {
      // A tap before the session has loaded waits for it instead of assuming "signed out".
      const current = user !== undefined ? user : await client.fetchQuery(sessionQuery).catch(() => null);
      if (current) {
        run();
        return;
      }
      setPendingAction({ ...action, path: pathname });
      router.push(routes.login({ intent: action.intent, next: pathname + window.location.search }), {
        scroll: false,
      });
    },
    [client, pathname, router, user],
  );
}

/** Runs `run` once after sign-in if the pending action is this one, on this page. */
export function useResumeAction(intent: GateIntent, key: string, run: () => void) {
  const { user } = useSession();
  const pathname = usePathname();
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (!user) return;
    const pending = getPendingAction();
    if (!pending || pending.intent !== intent || pending.key !== key || pending.path !== pathname) return;
    setPendingAction(null);
    runRef.current();
  }, [user, intent, key, pathname]);
}
