import type { AdminProduct } from "@/lib/admin/types";

export type CatalogProduct = Pick<AdminProduct,
  "id" | "name" | "category" | "subcategory" | "productType" | "brand" |
  "gender" | "material" | "tags" | "price" | "salePrice" | "images" |
  "colors" | "sizes" | "newArrival" | "featured" | "bestseller"
> & {
  variants: Pick<AdminProduct["variants"][number], "color" | "size">[];
  ratingAverage?: number;
  reviewCount?: number;
};

/** Listing hydration needs display/search data; full inventory is fetched on preview. */
export function toCatalogListing(product: AdminProduct & { ratingAverage?: number; reviewCount?: number }): CatalogProduct {
  const { id, name, category, subcategory, productType, brand, gender, material, tags,
    price, salePrice, images, colors, sizes, newArrival, featured, bestseller,
    ratingAverage, reviewCount } = product;
  return { id, name, category, subcategory, productType, brand, gender, material, tags,
    price, salePrice, images: images.slice(0, 1), colors, sizes, newArrival, featured, bestseller,
    ratingAverage, reviewCount, variants: product.variants.map(({ color, size }) => ({ color, size })) };
}
