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
  return { title: `${product.seoTitle || product.name} | UrbanForge`, description: product.seoDescription || product.shortDescription || product.description };
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <ProductPage key={id} initialData={await loadProduct(id)} />;
}
