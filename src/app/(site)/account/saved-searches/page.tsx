import type { Metadata } from "next";
import { SavedSearchesView } from "@/components/account/saved-searches-view";

export const metadata: Metadata = { title: "การค้นหาที่บันทึกไว้" };

/** Saved searches with alert settings (B9), from `GET /me/saved-searches`. */
export default function SavedSearchesPage() {
  return <SavedSearchesView />;
}
