import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Private and per-user paths stay out of search; those pages also send `noindex`. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/post",
        "/compare",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/onboarding",
        "/mock-api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
