"use client";
import { useState } from "react";
import { FeedbackNotice } from "@/components/ui/Feedback";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import FeaturedProductsLayout from "./FeaturedProductsLayout";
import ProductCard from "@/components/product/ProductCard";
import { Package } from "lucide-react";
import { useCatalog } from "@/lib/catalog/client";
import { toProductCard } from "@/lib/products";

export default function FeaturedProducts({ category }: { category?: string }) {
  const [visibleCount, setVisibleCount] = useState(20);
  const query = useCatalog();
  const catalog = query.data?.products ?? [];
  const products = category ? catalog.filter(product => category === "new-in" ? product.newArrival : category === "sale" ? product.salePrice !== null && product.salePrice < product.price : product.category.toLowerCase() === category) : catalog;
  return <FeaturedProductsLayout category={category}>
    <div id={category ? undefined : "home-collection-panel"}>
      {query.isPending ? <ProductGridSkeleton count={20} className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
        : query.error ? <FeedbackNotice><p>{query.error.message}</p><button type="button" className="mt-4 underline" onClick={() => query.refetch()}>Try again</button></FeedbackNotice>
        : !products.length ? <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 py-16 text-center"><Package size={32} strokeWidth={1.3} /><h3 className="text-xl font-semibold">More pieces are on the way</h3><p className="text-sm text-neutral-500">Check back soon for new additions to this collection.</p></div>
        : <><div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.slice(0, visibleCount).map(product => <ProductCard key={product.id} product={toProductCard(product)} />)}</div>
          {visibleCount < products.length && <div className="mt-10 text-center"><p className="mb-4 text-sm text-neutral-500" role="status">Showing {visibleCount} of {products.length} products</p><button type="button" onClick={() => setVisibleCount(count => count + 20)} className="border border-neutral-300 px-8 py-3 text-sm font-medium hover:border-black">Load more products</button></div>}</>}
    </div>
  </FeaturedProductsLayout>;
}
