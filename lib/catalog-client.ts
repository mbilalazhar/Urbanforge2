"use client";
import { useQuery } from "@tanstack/react-query";
import type { AdminProduct, AdminPromotion } from "@/lib/admin/types";
import type { Product } from "@/components/product/ProductCard";
import { products as legacyProducts } from "@/lib/products";

type CatalogResponse = { managed: boolean; products: AdminProduct[]; promotions: AdminPromotion[] };
const colorHex: Record<string, string> = { black: "#171717", white: "#f5f5f5", red: "#d33444", blue: "#365a86", green: "#547255", grey: "#888888", gray: "#888888", beige: "#d5c7ad", olive: "#6b7047", navy: "#26354b", pink: "#e0a8b7", brown: "#725042" };
export function storefrontProduct(product: AdminProduct): Product {
  const colors = [...new Set([...product.colors, ...product.variants.map(variant => variant.color)].filter(Boolean))];
  const sizes = [...new Set([...product.sizes, ...product.variants.map(variant => variant.size)].filter(Boolean))];
  return {
    id: product.id, name: product.name, category: product.category,
    price: `Rs. ${(product.salePrice ?? product.price).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`,
    image: product.images[0] || "/tee.png", tag: product.salePrice !== null && product.salePrice < product.price ? "SALE" : product.newArrival ? "NEW" : product.bestseller ? "BESTSELLER" : undefined,
    colors: colors.map(name => ({ name, hex: colorHex[name.toLowerCase()] || "#888888" })),
    description: product.description || product.shortDescription,
    details: [product.material, product.brand, product.shortDescription].filter(Boolean), sizes: sizes.length ? sizes : ["One size"],
    stock: product.stock, variants: product.variants, managed: true,
  };
}
export function useCatalog() {
  const query = useQuery({
    queryKey: ["catalog"], queryFn: async (): Promise<CatalogResponse> => {
      const response = await fetch("/api/catalog", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Products are temporarily unavailable.");
      return data;
    }, staleTime: 30_000, refetchInterval: 60_000, retry: false,
  });
  return { ...query, products: query.data ? query.data.managed ? query.data.products.map(storefrontProduct) : legacyProducts : [], managed: query.data?.managed ?? false };
}
