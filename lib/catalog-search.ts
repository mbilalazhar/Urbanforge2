import type { AdminProduct } from "@/lib/admin/types";

/** Search the catalog fields before reducing a product to card presentation data. */
export function matchesCatalogProduct(product: AdminProduct, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const searchable = [product.name, product.category, product.subcategory, product.productType,
    product.brand, product.gender, product.material, ...product.tags, ...product.colors,
    ...product.variants.map(variant => variant.color),
    product.newArrival ? "new arrival new in" : "", product.bestseller ? "bestseller" : "",
    product.salePrice !== null && product.salePrice < product.price ? "sale" : "",
  ].join(" ").toLowerCase();
  return terms.every(term => searchable.includes(term));
}
