"use client";

import { useEffect, useSyncExternalStore } from "react";
import { X } from "lucide-react";

/**
 * Toasts (D6, saves): one at a time, bottom centre, ink ground, announced
 * through a polite `role="status"` region. Call `toast()` from anywhere on the
 * client; `<Toaster />` is mounted once in the root layout.
 */

interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
  /** Milliseconds before it hides itself. */
  duration: number;
}

const DEFAULT_DURATION = 5000;

let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Show a toast, replacing any toast already on screen. Returns its id. */
export function toast(message: string, options: { action?: ToastAction; duration?: number } = {}) {
  current = { id: nextId++, message, action: options.action, duration: options.duration ?? DEFAULT_DURATION };
  emit();
  return current.id;
}

/** Hide the toast (only if it is still the one with `id`, when given). */
export function dismissToast(id?: number) {
  if (!current || (id !== undefined && current.id !== id)) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => current;
const getServerSnapshot = () => null;

/** The live region. Mount once; it stays in the DOM so screen readers pick up new messages. */
export function Toaster() {
  const item = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!item) return;
    const timer = window.setTimeout(() => dismissToast(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissToast(item.id);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[60] flex justify-center sm:bottom-6"
    >
      {item && <ToastView key={item.id} item={item} />}
    </div>
  );
}

function ToastView({ item }: { item: ToastItem }) {
  return (
    <div className="pointer-events-auto flex w-full max-w-md animate-fade-in items-center gap-3 rounded-lg bg-ink py-2 pr-2 pl-4 text-sm text-white shadow-[0_12px_32px_rgba(26,22,48,.12)]">
      <span className="line-clamp-2 flex-1 py-1.5">{item.message}</span>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action!.onClick();
            dismissToast(item.id);
          }}
          className="h-9 shrink-0 rounded-md px-2 font-semibold text-violet-200 hover:text-white"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="ปิดการแจ้งเตือน"
        onClick={() => dismissToast(item.id)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
