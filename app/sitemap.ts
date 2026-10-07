import type { MetadataRoute } from "next";
import dbConnect from "@/lib/dbconnect";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/", "/women", "/men", "/new-in", "/shoes", "/accessories", "/sale", "/about", "/contact", "/faqs", "/terms", "/privacy-policy", "/cookie-policy"];
  const entries: MetadataRoute.Sitemap = paths.map(path => ({ url: new URL(path, siteUrl).href }));
  try {
    const db = await dbConnect();
    const products = await db.collection("admin_products").find(
      { status: "active", deletedAt: { $exists: false } },
      { projection: { _id: 0, id: 1, updatedAt: 1 } },
    ).limit(49000).toArray();
    for (const product of products) {
      if (typeof product.id !== "string") continue;
      const updated = new Date(product.updatedAt);
      entries.push({ url: new URL(`/products/${encodeURIComponent(product.id)}`, siteUrl).href, ...(Number.isFinite(updated.getTime()) ? { lastModified: updated } : {}) });
    }
  } catch { /* Public information pages stay discoverable during a storage outage. */ }
  return entries;
}
