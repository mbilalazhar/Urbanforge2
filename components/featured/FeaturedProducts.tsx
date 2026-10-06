"use client";
import { FeedbackNotice } from "@/components/ui/Feedback";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { ArrowRight, Package } from "lucide-react";
import { useCatalog } from "@/lib/catalog/client";
import { toProductCard } from "@/lib/products";

export default function FeaturedProducts({ category }: { category?: string }) {
  const query = useCatalog();
  const products = (query.data?.products ?? []).filter(product => !category ? true : category === "new-in" ? product.newArrival : category === "sale" ? product.salePrice !== null && product.salePrice < product.price : product.category.toLowerCase() === category);
  return <section id="new-arrivals" className="w-full scroll-mt-24 bg-white px-6 py-16 text-black sm:px-10 sm:py-20 lg:px-16">
    <div className="mx-auto max-w-[1700px]">
      <div className="mb-10 flex items-end justify-between gap-6 sm:mb-14">
        <div><div className="mb-3 flex items-center gap-3"><span className="block h-[2px] w-8 bg-[#e53e3e]" /><span className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-600">The UrbanForge collection</span></div>
          <h2 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">{category ? "Shop the " : "New "}<span className="text-[#e53e3e]">{category ? "collection" : "Arrivals"}</span></h2>
          <p className="mt-4 text-sm text-neutral-500">Fresh drops. Bold fits. Built for what&apos;s next.</p></div>
        <Link href="/search" className="hidden shrink-0 items-center gap-2 text-sm sm:flex">View all <ArrowRight size={16} /></Link>
      </div>
      {query.isPending ? <ProductGridSkeleton count={5} className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5" />
        : query.error ? <FeedbackNotice><p>{query.error.message}</p><button type="button" className="mt-4 underline" onClick={() => query.refetch()}>Try again</button></FeedbackNotice>
        : !products.length ? <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 py-16 text-center"><Package size={32} strokeWidth={1.3} /><h3 className="text-xl font-semibold">No products yet</h3><p className="text-sm text-neutral-500">New pieces will appear here when they’re available.</p></div>
        : <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.map(product => <ProductCard key={product.id} product={toProductCard(product)} />)}</div>}
    </div>
  </section>;
}
