"use client";

import { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { avatarColour, nameInitial } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const avatar = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none",
  {
    variants: {
      size: {
        sm: "size-8 text-sm",
        md: "size-10 text-base",
        lg: "size-14 text-2xl",
        /** Profile hero: 84px on phones, 104px from sm up. */
        xl: "size-[84px] text-4xl sm:size-[104px] sm:text-[44px]",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

interface AvatarProps extends VariantProps<typeof avatar> {
  /** Full name; drives the initial, the colour and the accessible label. */
  name: string;
  /** Profile photo. Falls back to the initial if missing or broken. */
  src?: string | null;
  /**
   * Decorative by default because a name is usually printed next to it.
   * Set `labelled` when the avatar stands alone so screen readers hear the name.
   */
  labelled?: boolean;
  className?: string;
}

/** Initial on a colour picked from the name, with an image when there is one (chat, account, admin). */
export function Avatar({ name, src, size, labelled = false, className }: AvatarProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const showImage = src && broken !== src;
  const a11y = labelled ? { role: "img", "aria-label": name } : { "aria-hidden": true as const };

  return (
    <span {...a11y} className={cn(avatar({ size }), avatarColour(name), className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote user photos of unknown size; next/image needs config per host
        <img src={src} alt="" onError={() => setBroken(src)} className="size-full object-cover" />
      ) : (
        nameInitial(name)
      )}
    </span>
  );
}
