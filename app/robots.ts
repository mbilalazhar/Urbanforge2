import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // Media must remain crawlable for product images and social previews.
    // Utility pages use noindex metadata; crawling lets bots read that directive.
    rules: [{ userAgent: "*", allow: ["/", "/api/media/"], disallow: ["/api/"] }],
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
