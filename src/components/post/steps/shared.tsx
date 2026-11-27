import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StepErrors } from "@/lib/post-wizard";
import type { DraftValues, PostStep, UploadPhotoRequest, UploadPhotoResponse } from "@/types/api";

export interface StepProps {
  values: DraftValues;
  /** Link to another step of the same wizard (new draft or edit mode). */
  stepHref: (step: PostStep) => string;
  /** Sends a photo for checking: to the draft, or to the listing in edit mode. */
  uploadPhoto: (body: UploadPhotoRequest) => Promise<UploadPhotoResponse>;
  /** Edit mode (FE-24): the last step shows the price only, no promotion or confirmation. */
  editing?: boolean;
  /** Merge a change; pass a function when it depends on the latest values (e.g. parallel uploads). */
  set: (patch: Partial<DraftValues> | ((current: DraftValues) => Partial<DraftValues>)) => void;
  /** Errors to show now: touched fields, or every field after "ถัดไป". */
  errors: StepErrors;
  touch: (field: keyof DraftValues & string) => void;
}

/** White section card used by every step. `id` lets "ถัดไป" scroll to the first error. */
export function WizardCard({
  title,
  sub,
  aside,
  children,
  className,
  id,
}: {
  title: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-40 rounded-[10px] border border-line bg-white p-5 sm:p-7", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-ink sm:text-[19px]">{title}</h2>
        {aside}
      </div>
      {sub && <p className="mt-1 text-sm text-slate">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Error under a group of chips or cards (fields use `Field`'s own error slot). */
export function GroupError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-[13px] text-danger">
      {message}
    </p>
  );
}

export const req = (
  <span className="text-danger" aria-hidden="true">
    {" "}
    *
  </span>
);
