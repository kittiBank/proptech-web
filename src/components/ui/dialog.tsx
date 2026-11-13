"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** `panel` = centred card, `fullscreen` = edge to edge on a dark ground (photo viewer). */
  variant?: "panel" | "fullscreen";
  closeLabel?: string;
}

function DialogContent({ className, children, variant = "panel", closeLabel = "ปิด", ...props }: DialogContentProps) {
  const fullscreen = variant === "fullscreen";
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn("fixed inset-0 z-50 data-[state=open]:animate-fade-in", fullscreen ? "bg-ink/95" : "bg-ink/50")}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col outline-none data-[state=open]:animate-fade-in",
          fullscreen
            ? "inset-0 text-white"
            : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-lg bg-white sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(960px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className={cn(
            "absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full transition-colors",
            fullscreen ? "bg-white/10 text-white hover:bg-white/20" : "text-ink hover:bg-mist",
          )}
        >
          <X className="size-5" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription };
