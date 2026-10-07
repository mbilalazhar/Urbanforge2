import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogProduct } from "@/lib/admin/server";
import type { ProductResponse } from "@/lib/catalog/client";
import ProductPage from "@/components/product/ProductPage";
import { pageMetadata, jsonLd, siteUrl } from "@/lib/seo";

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
  const metadata = pageMetadata(`/products/${encodeURIComponent(product.id)}`, title, description.length > 160 ? `${description.slice(0, 157).replace(/\s+\S*$/, "")}…` : description);
  if (product.images[0]) {
    metadata.openGraph = { ...metadata.openGraph, images: [{ url: product.images[0], alt: product.name }] };
    metadata.twitter = { ...metadata.twitter, images: [product.images[0]] };
  }
  return metadata;
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  const initialData = await loadProduct(id);
  const { product } = initialData;
  const url = new URL(`/products/${encodeURIComponent(id)}`, siteUrl).href;
  const stock = product.variants.length ? product.variants.reduce((total, variant) => total + variant.stock, 0) : product.stock;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": "Product", name: product.name, description: product.description || product.shortDescription, sku: product.sku,
      image: product.images.map(image => new URL(image, siteUrl).href),
      ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
      offers: { "@type": "Offer", url, priceCurrency: "PKR", price: product.salePrice ?? product.price, availability: `https://schema.org/${stock > 0 ? "InStock" : "OutOfStock"}` } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl.href },
      { "@type": "ListItem", position: 2, name: product.name, item: url },
    ] },
  ] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} /><ProductPage key={id} initialData={initialData} /></>;
}
