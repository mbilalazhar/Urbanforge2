import type { Metadata } from "next";

// Set SITE_URL to the public HTTPS origin at build/deploy time.
export const siteUrl = new URL(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
export const siteDescription = "Discover UrbanForge streetwear, clothing, footwear and accessories. Explore everyday essentials, new arrivals and bold fits built for the streets.";

export function pageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "UrbanForge", type: "website", images: [{ url: "/social-preview.jpg", width: 1200, height: 630, alt: "UrbanForge streetwear collection" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/social-preview.jpg"] },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
