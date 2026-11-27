import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { ListingEditor } from "@/components/post/listing-editor";

export const metadata: Metadata = { title: "แก้ไขประกาศ", robots: { index: false } };

/**
 * Edit mode of the posting wizard (FE-24). The editor lives in this layout rather than the step
 * page: layouts stay mounted between steps, so unsaved edits survive moving from step to step.
 * Reads route params, so it renders on the client.
 */
export default function EditListingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense>
        <ListingEditor />
      </Suspense>
      {children}
    </>
  );
}
