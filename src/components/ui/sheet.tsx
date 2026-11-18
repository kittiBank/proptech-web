"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;

const sides = {
  right: "inset-y-0 right-0 w-[88%] max-w-sm data-[state=open]:animate-sheet-in",
  /** Mobile bottom sheet: 16px top corners, grows to 90% of the screen, then scrolls. */
  bottom:
    "inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-2xl pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-sheet-up",
};

function SheetContent({
  className,
  children,
  closeLabel = "ปิดเมนู",
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { closeLabel?: string; side?: keyof typeof sides }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn("fixed z-50 flex flex-col bg-white outline-none", sides[side], className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-mist"
          aria-label={closeLabel}
        >
          <X className="size-5" aria-hidden="true" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
