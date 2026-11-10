import { propertyCategories } from "@/data/catalog";
import { generatedListings } from "@/data/generated-listings";
import { transitLines } from "@/data/locations";
import { newProjects } from "@/data/projects";
import { pinnedPropertyIds, properties } from "@/data/properties";
import type { NewProject, Property, PropertyCategory, TransitLine } from "@/types/property";

// Future endpoints (NestJS):
//   GET /properties?pinned=true        GET /properties?page=&limit=&sort=-postedAt
//   GET /transit-lines                 GET /projects?status=new
//   GET /categories

export async function getPinnedProperties(): Promise<Property[]> {
  return pinnedPropertyIds
    .map((id) => properties.find((p) => p.id === id))
    .filter((p): p is Property => Boolean(p))
    .map((p) => ({ ...p, isPinned: true }));
}

/** General listings posted by owners and agents, newest first. */
export async function getGeneralListings(): Promise<Property[]> {
  return [...properties.filter((p) => !pinnedPropertyIds.includes(p.id)), ...generatedListings].sort((a, b) =>
    b.postedAt.localeCompare(a.postedAt),
  );
}

export async function getTransitLines(): Promise<TransitLine[]> {
  return transitLines;
}

export async function getNewProjects(): Promise<NewProject[]> {
  return newProjects;
}

export async function getPropertyCategories(): Promise<PropertyCategory[]> {
  return propertyCategories;
}
