import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import type { ArticleDetailDto, ProjectDetailDto, PropertyDetailDto } from "@/types/api";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "./site";

/**
 * schema.org JSON-LD builders. Render the result with `<JsonLd data={…} />`.
 * Validate with https://validator.schema.org/ when changing a shape.
 */
type JsonLdObject = Record<string, unknown>;

const accommodationType = {
  condo: "Apartment",
  house: "SingleFamilyResidence",
  townhouse: "House",
  land: "Place",
  commercial: "Place",
} as const;

const address = (street: string, locality: string) => ({
  "@type": "PostalAddress",
  streetAddress: street,
  addressLocality: locality,
  addressRegion: "กรุงเทพมหานคร",
  addressCountry: "TH",
});

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "th-TH",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** A sale or rental listing: the page is a RealEstateListing, the unit is the Offer's item. */
export function listingJsonLd(p: PropertyDetailDto): JsonLdObject {
  const url = absoluteUrl(routes.property(p.slug));
  const isLand = p.type === "land" || p.type === "commercial";
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.description,
    url,
    image: (p.gallery ?? [p.image]).map((img) => img.src),
    datePosted: p.postedAt,
    dateModified: p.updatedAt,
    identifier: p.code,
    offers: {
      "@type": "Offer",
      url,
      price: p.price,
      priceCurrency: "THB",
      businessFunction:
        p.mode === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      ...(p.mode === "rent" && {
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: p.price,
          priceCurrency: "THB",
          unitCode: "MON",
        },
      }),
      seller: { "@type": p.poster.kind === "owner" ? "Person" : "Organization", name: p.poster.name },
      itemOffered: {
        "@type": accommodationType[p.type],
        name: `${propertyTypeLabels[p.type]} ${p.projectName ?? p.district}`,
        ...(!isLand && {
          numberOfBedrooms: p.bedrooms,
          numberOfBathroomsTotal: p.bathrooms,
          floorSize: { "@type": "QuantitativeValue", value: p.area, unitCode: "MTK" },
        }),
        address: address(p.location.address, p.district),
        geo: { "@type": "GeoCoordinates", latitude: p.location.point.lat, longitude: p.location.point.lng },
      },
    },
  };
}

export function projectJsonLd(p: ProjectDetailDto): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: p.name,
    description: p.description,
    url: absoluteUrl(routes.project(p.slug)),
    image: p.gallery.map((img) => img.src),
    address: address(p.location.address, p.district),
    geo: { "@type": "GeoCoordinates", latitude: p.location.point.lat, longitude: p.location.point.lng },
  };
}

export function articleJsonLd(a: ArticleDetailDto): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt,
    image: [a.cover.src],
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    inLanguage: "th-TH",
    author: { "@type": "Organization", name: a.author },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    mainEntityOfPage: absoluteUrl(routes.guide(a.slug)),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** JSON for a `<script type="application/ld+json">`, with `<` escaped so text cannot close the tag. */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
