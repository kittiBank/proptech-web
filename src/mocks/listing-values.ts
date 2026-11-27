import { featurePoolByType } from "@/data/amenities";
import { photosByType } from "@/data/images";
import { defaultDraftValues, MAX_STATIONS, MIN_PHOTOS } from "@/lib/post-wizard";
import type { DraftValues } from "@/types/api";
import type { PropertyDetail } from "@/types/property";

const BUDDHIST_ERA = 543;
const PROVINCE = "กรุงเทพมหานคร";

/**
 * Wizard values for a demo listing that was never posted through the wizard, so the
 * dashboard's seeded listings open prefilled in edit mode (FE-24).
 */
export function draftValuesFromProperty(p: PropertyDetail): DraftValues {
  const gallery = p.gallery?.length ? p.gallery : [p.image];
  // Demo galleries hold 3–4 photos; top them up (same type's pool first) so a save passes the 5-photo rule.
  const pool = [...photosByType[p.type], ...Object.values(photosByType).flat()];
  const extra = pool.filter(
    (img, i) => !gallery.some((g) => g.src === img.src) && pool.findIndex((x) => x.src === img.src) === i,
  );
  const photos = [...gallery, ...extra.slice(0, Math.max(0, MIN_PHOTOS - gallery.length))].map((image, i) => ({
    id: `${p.id}-photo-${i + 1}`,
    url: image.src,
    name: image.alt,
    status: "ready" as const,
  }));
  const rent = p.mode === "rent";
  return {
    ...defaultDraftValues,
    posterKind: p.agent.kind,
    deal: rent ? "rent" : "sale",
    propertyType: p.type,
    projectName: p.projectName,
    // Listings outside a project name their road instead (the location step needs one of the two).
    road: p.projectName ? undefined : p.location.address.split(" ")[0],
    district: p.district,
    province: PROVINCE,
    point: p.location.point,
    stations: p.location.stations.slice(0, MAX_STATIONS).map((s) => s.station.code),
    bedrooms: p.type === "commercial" ? undefined : p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.area,
    floor: p.floor,
    // A few generated demo listings sit above their building's floor count; drop the impossible count.
    totalFloors: p.floor && p.totalFloors && p.floor > p.totalFloors ? undefined : p.totalFloors,
    facing: p.facing,
    // The wizard asks for the Buddhist-era year (e.g. 2563).
    yearBuilt: p.yearBuilt ? p.yearBuilt + BUDDHIST_ERA : undefined,
    parking: p.parking,
    furnishing: p.furnishing,
    features: p.features.filter((f) => featurePoolByType[p.type].includes(f)),
    petFriendly: p.highlights.includes("เลี้ยงสัตว์ได้"),
    title: p.title,
    description: p.description,
    photos,
    price: rent ? undefined : p.price,
    rentPrice: rent ? p.price : undefined,
    commonFee: p.commonFee,
    // Already confirmed when it was first published.
    confirmed: true,
  };
}
