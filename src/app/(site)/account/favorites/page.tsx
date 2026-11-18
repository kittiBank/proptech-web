import type { Metadata } from "next";
import { FavoritesView } from "@/components/favorites/favorites-view";

export const metadata: Metadata = {
  title: "รายการโปรด",
  robots: { index: false },
};

/** Saved listings (B8, B10, B11), from `GET /me/favorites`. */
export default function FavoritesPage() {
  return <FavoritesView />;
}
