import type { AdminProduct } from "@/lib/admin/types";
import type { CatalogProduct } from "@/lib/catalog/listing";

export const SEARCH_PRODUCT_LIMIT = 8;

/** Alternate the two selections, skipping overlap and filling any spare slots. */
export function selectSearchProducts<T extends Pick<AdminProduct, "id" | "featured" | "bestseller">>(products: T[]): T[] {
  const groups = [products.filter(product => product.bestseller), products.filter(product => product.featured)];
  const selected = new Map<string, T>();
  const positions = [0, 0];
  while (selected.size < SEARCH_PRODUCT_LIMIT) {
    const previousSize = selected.size;
    groups.forEach((group, index) => {
      while (positions[index] < group.length && selected.has(group[positions[index]].id)) positions[index]++;
      if (positions[index] < group.length && selected.size < SEARCH_PRODUCT_LIMIT) {
        const product = group[positions[index]++];
        selected.set(product.id, product);
      }
    });
    if (selected.size === previousSize) break;
  }
  return [...selected.values()];
}

/** Search the catalog fields before reducing a product to card presentation data. */
export function matchesCatalogProduct(product: CatalogProduct, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const searchable = [product.name, product.category, product.subcategory, product.productType,
    product.brand, product.gender, product.material, ...product.tags, ...product.colors,
    ...product.variants.map(variant => variant.color),
    product.newArrival ? "new arrival new in" : "", product.bestseller ? "bestseller" : "",
    product.salePrice !== null && product.salePrice < product.price ? "sale" : "",
  ].join(" ").toLowerCase();
  return terms.every(term => searchable.includes(term));
}
