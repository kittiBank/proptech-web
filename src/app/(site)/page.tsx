import { GeneralListings } from "@/components/home/general-listings";
import { Hero } from "@/components/home/hero";
import { NewProjects } from "@/components/home/new-projects";
import { PinnedProperties } from "@/components/home/pinned-properties";
import { PostCta } from "@/components/home/post-cta";
import { PropertyCategories } from "@/components/home/property-categories";

/**
 * Static shell. Each data section fetches its own API data through TanStack
 * Query (`lib/api/queries.ts`) and renders its own loading and error state.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <PinnedProperties />
      <NewProjects />
      <GeneralListings />
      <PropertyCategories />
      <PostCta />
    </>
  );
}
