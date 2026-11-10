import { GeneralListings } from "@/components/home/general-listings";
import { Hero } from "@/components/home/hero";
import { NewProjects } from "@/components/home/new-projects";
import { PinnedProperties } from "@/components/home/pinned-properties";
import { PostCta } from "@/components/home/post-cta";
import { PropertyCategories } from "@/components/home/property-categories";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import {
  getGeneralListings,
  getNewProjects,
  getPinnedProperties,
  getPropertyCategories,
  getTransitLines,
} from "@/lib/api/properties";
import { HomeSearchProvider } from "@/providers/home-search-provider";

export default async function HomePage() {
  const [pinned, listings, lines, projects, categories] = await Promise.all([
    getPinnedProperties(),
    getGeneralListings(),
    getTransitLines(),
    getNewProjects(),
    getPropertyCategories(),
  ]);

  // Sale/rent split of the category totals; replaced by API facets later.
  const total = categories.reduce((sum, c) => sum + c.listingCount, 0);
  const listingTotals = { buy: Math.round(total * 0.63), rent: Math.round(total * 0.37) };

  return (
    <HomeSearchProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero listingTotals={listingTotals} lines={lines} />
        <PinnedProperties properties={pinned} />
        <NewProjects projects={projects} />
        <GeneralListings properties={listings} />
        <PropertyCategories categories={categories} />
        <PostCta />
      </main>
      <SiteFooter />
    </HomeSearchProvider>
  );
}
