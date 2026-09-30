import type { Product } from "@/components/product/ProductCard";
import type { AdminProduct } from "@/lib/admin/types";
export const formatProductPrice = (value: number) => `Rs. ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value)}`;
export function productPrice(product: Product) { return product.amount ?? Number(product.price.replace(/[^0-9.]/g, "")); }
export function colorHex(name: string) {
  const colors: Record<string, string> = { black: "#171717", white: "#fafafa", red: "#c82032", blue: "#385f9b", green: "#496449", olive: "#737447", beige: "#d7c6a5", sand: "#d7c6a5", grey: "#929292", gray: "#929292", pink: "#df9dae", brown: "#795b47", navy: "#253247", cream: "#eee8d6", yellow: "#e6cd57", orange: "#d88745", purple: "#80628a" };
  return /^#[0-9a-f]{3,8}$/i.test(name) ? name : colors[name.toLowerCase()] ?? "#b7b7b7";
}
export function toProductCard(product: AdminProduct): Product {
  const amount = product.salePrice ?? product.price;
  return { id: product.id, name: product.name, category: product.category, price: formatProductPrice(amount), amount,
    image: product.images[0] ?? "", href: `/products/${encodeURIComponent(product.id)}`,
    tag: product.bestseller ? "BESTSELLER" : amount < product.price ? "SALE" : product.newArrival ? "NEW" : undefined,
    colors: [...new Set(product.variants?.length ? product.variants.map(variant => variant.color).filter(Boolean) : product.colors)].map(name => ({ name, hex: colorHex(name) })),
    sizes: [...new Set(product.variants?.length ? product.variants.map(variant => variant.size).filter(Boolean) : product.sizes)],
  };
}
