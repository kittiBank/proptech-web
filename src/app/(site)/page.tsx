import { GeneralListings } from "@/components/home/general-listings";
import { Hero } from "@/components/home/hero";
import { NewProjects } from "@/components/home/new-projects";
import { PinnedProperties } from "@/components/home/pinned-properties";
import { PostCta } from "@/components/home/post-cta";
import { PropertyCategories } from "@/components/home/property-categories";
import {
  getGeneralListings,
  getNewProjects,
  getPinnedProperties,
  getPropertyCategories,
  getTransitLines,
} from "@/lib/api/properties";

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
    <>
      <Hero listingTotals={listingTotals} lines={lines} />
      <PinnedProperties properties={pinned} />
      <NewProjects projects={projects} />
      <GeneralListings properties={listings} />
      <PropertyCategories categories={categories} />
      <PostCta />
    </>
  );
}
