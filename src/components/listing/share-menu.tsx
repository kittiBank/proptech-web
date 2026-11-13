"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  title: string;
  className?: string;
}

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-white text-ink transition-colors hover:border-ink";

function currentUrl() {
  return typeof window === "undefined" ? "" : window.location.href.split("#")[0];
}

/** Social share links. Each opens the network's own share page; nothing is posted for the visitor. */
const networks = [
  {
    name: "LINE",
    mark: "L",
    markClass: "bg-[#06C755]",
    href: (url: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    mark: "f",
    markClass: "bg-[#1877F2]",
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "X",
    mark: "X",
    markClass: "bg-ink",
    href: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
];

export function ShareMenu({ title, className }: ShareMenuProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Popover onOpenChange={(open) => !open && setCopied(false)}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="แชร์ประกาศนี้" className={cn(iconButton, className)}>
          <Share2 className="size-[18px]" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label="แชร์ประกาศนี้">
        <p className="px-3 pt-2 pb-1.5 text-[13px] font-medium text-slate">แชร์ประกาศนี้</p>
        <ul>
          {networks.map((n) => (
            <li key={n.name}>
              <a
                href={n.href(currentUrl(), title)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-3 rounded-sm px-3 text-[15px] hover:bg-mist"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-[13px] font-bold text-white",
                    n.markClass,
                  )}
                >
                  {n.mark}
                </span>
                แชร์ไปที่ {n.name}
              </a>
            </li>
          ))}
          <li className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={copy}
              className="flex h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-[15px] hover:bg-mist"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full",
                  copied ? "bg-brand text-white" : "bg-mist text-ink",
                )}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </span>
              <span aria-live="polite">{copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์"}</span>
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export { iconButton as listingIconButton };
