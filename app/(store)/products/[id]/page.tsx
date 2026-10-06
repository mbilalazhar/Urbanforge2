import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogProduct } from "@/lib/admin/server";
import type { ProductResponse } from "@/lib/catalog/client";
import ProductPage from "@/components/product/ProductPage";

export const dynamic = "force-dynamic";
const loadProduct = cache(async (id: string): Promise<ProductResponse> => {
  const response = await catalogProduct(id);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Unable to load this product. Please try again.");
  return response.json();
});
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product } = await loadProduct((await params).id);
  const title = (product.seoTitle ?? "").trim().replace(/\s*[|–—-]\s*UrbanForge\s*$/i, "") || product.name;
  const description = [product.seoDescription, product.shortDescription, product.description]
    .map(value => (value ?? "").replace(/\s+/g, " ").trim()).find(Boolean)
    || `Shop ${product.name} at UrbanForge. Explore product details, available sizes and colors, and find your next streetwear essential.`;
  return { title, description: description.length > 160 ? `${description.slice(0, 157).replace(/\s+\S*$/, "")}…` : description };
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ProductPage key={id} initialData={await loadProduct(id)} />;
}
