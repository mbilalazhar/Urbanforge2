import type { AdminProduct } from "@/lib/admin/types";

export type CatalogProduct = AdminProduct & { ratingAverage?: number; reviewCount?: number };
export const homeCollections = [
  { id: "new-arrivals", label: "New Arrivals", description: "Fresh drops. Bold fits. Built for what's next." },
  { id: "featured", label: "Featured", description: "Standout pieces from the UrbanForge collection." },
  { id: "bestsellers", label: "Bestsellers", description: "The favorites that keep coming back into rotation." },
  { id: "top-rated", label: "Top Rated", description: "Discover the pieces our community rates highest." },
  { id: "essentials", label: "The Essentials", description: "Everyday staples. Made for your rotation." },
] as const;
export type HomeCollection = typeof homeCollections[number]["id"];

export function collectionProducts(products: CatalogProduct[], collection: HomeCollection) {
  switch (collection) {
    case "new-arrivals": return products.filter(product => product.newArrival);
    case "featured": return products.filter(product => product.featured);
    case "bestsellers": return products.filter(product => product.bestseller);
    case "top-rated": return products.filter(product => (product.reviewCount ?? 0) > 0)
      .sort((a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    case "essentials": return products.filter(product => product.tags.some(tag => /^(essential|essentials)$/i.test(tag.trim())));
  }
}
