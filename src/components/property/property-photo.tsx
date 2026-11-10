"use client";

import Image from "next/image";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyImage } from "@/types/property";

interface PropertyPhotoProps {
  image: PropertyImage;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Extra classes for the <img> itself, e.g. a hover zoom. */
  imageClassName?: string;
}

/** next/image with a quiet placeholder if a listing photo fails to load. */
export function PropertyPhoto({ image, sizes, priority, className, imageClassName }: PropertyPhotoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-violet-50", className)}>
      {failed ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-violet-200"
          role="img"
          aria-label={image.alt}
        >
          <Building2 className="size-10" strokeWidth={1.25} aria-hidden="true" />
        </div>
      ) : (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
