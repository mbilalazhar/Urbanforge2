"use client";
import { FeedbackNotice } from "@/components/ui/Feedback";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import FeaturedProductsLayout from "./FeaturedProductsLayout";
import ProductCard from "@/components/product/ProductCard";
import { Package } from "lucide-react";
import { useCatalog } from "@/lib/catalog/client";
import { toProductCard } from "@/lib/products";

export default function FeaturedProducts({ category }: { category?: string }) {
  const query = useCatalog();
  const products = (query.data?.products ?? []).filter(product => !category ? true : category === "new-in" ? product.newArrival : category === "sale" ? product.salePrice !== null && product.salePrice < product.price : product.category.toLowerCase() === category);
  return <FeaturedProductsLayout category={category}>
      {query.isPending ? <ProductGridSkeleton count={5} className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5" />
        : query.error ? <FeedbackNotice><p>{query.error.message}</p><button type="button" className="mt-4 underline" onClick={() => query.refetch()}>Try again</button></FeedbackNotice>
        : !products.length ? <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 py-16 text-center"><Package size={32} strokeWidth={1.3} /><h3 className="text-xl font-semibold">No products yet</h3><p className="text-sm text-neutral-500">New pieces will appear here when they’re available.</p></div>
        : <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.map(product => <ProductCard key={product.id} product={toProductCard(product)} />)}</div>}
  </FeaturedProductsLayout>;
}
