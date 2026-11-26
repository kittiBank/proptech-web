import { Suspense } from "react";
import type { Metadata } from "next";
import { UsersView } from "@/components/admin/users-view";

export const metadata: Metadata = { title: "ผู้ใช้" };

/** E6. Filters and the open user live in the URL. */
export default function Page() {
  return (
    <Suspense>
      <UsersView />
    </Suspense>
  );
}
