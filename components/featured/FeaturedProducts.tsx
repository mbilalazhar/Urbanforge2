"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { useCatalog } from "@/lib/catalog-client";

export default function FeaturedProducts({ category }: { category?: string }) {
  const catalog = useCatalog();
  const products = catalog.products.filter(product => {
    if (!catalog.managed || !category) return true;
    const record = catalog.data?.products.find(item => item.id === product.id);
    if (category === "men" || category === "women") return record?.gender.toLowerCase() === category || ["unisex", "all"].includes(record?.gender.toLowerCase() ?? "");
    if (category === "new-in") return record?.newArrival;
    if (category === "sale") return record?.salePrice !== null && (record?.salePrice ?? Infinity) < (record?.price ?? 0);
    if (category === "accessories") return ["accessories", "bags", "watches"].includes(product.category.toLowerCase());
    return product.category.toLowerCase() === category;
  });
  return (
    <section id="new-arrivals" className="w-full scroll-mt-24 bg-white py-16 sm:py-20 lg:py-24 px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[1700px]">
        {/* Section header */}
        <div className="mb-10 sm:mb-14 flex items-end justify-between gap-6">
          {/* Left: eyebrow + title + subtitle */}
          <div>
            {/* Eyebrow with red dash */}
            <div className="flex items-center gap-3 mb-3">
              <span className="block h-[2px] w-8 bg-[#e53e3e]" />
              <span className="text-[11px] sm:text-xs tracking-[0.3em] uppercase text-neutral-600 font-medium">
                Featured Products
              </span>
            </div>

            {/* Main headline */}
            <h2 className="text-4xl italic sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight uppercase leading-[0.9] text-black">
              New <span className="text-[#e53e3e]">Arrivals</span>
            </h2>

            {/* Subtitle */}
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-neutral-500 font-normal">
              Fresh drops. Bold fits. Built for what&apos;s next.
            </p>
          </div>

          {/* Right: pagination arrows */}
          <div className="hidden sm:flex items-center gap-4 shrink-0 pb-2">
            <button
              type="button"
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <span className="text-xs tracking-[0.2em] text-neutral-500 font-medium">
              01 / 04
            </span>

            <button
              type="button"
              aria-label="Next"
              className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:text-black transition-colors"
            >
              <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {catalog.data?.promotions.filter(promotion => promotion.banner).map(promotion => <Link key={promotion.id} href="/sale" className="relative mb-8 flex min-h-32 overflow-hidden rounded-lg bg-neutral-950 p-7 text-white"><img src={promotion.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /><span className="relative"><strong className="block text-2xl">{promotion.name}</strong><span className="mt-2 block text-sm">Up to {promotion.discountPercent}% off selected products</span></span></Link>)}
        {catalog.isPending && <p className="py-12 text-center text-sm text-neutral-500" role="status">Loading products…</p>}
        {catalog.error && <p className="py-12 text-center text-sm text-red-700" role="alert">{catalog.error.message} <button onClick={() => catalog.refetch()} className="underline">Try again</button></p>}
        {catalog.data && !products.length && <p className="py-12 text-center text-sm text-neutral-500">New products are on their way. Check back soon.</p>}
        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-10 sm:gap-x-5 lg:gap-x-6">
        {products.map((product) => (
            <div key={product.id} id={`featured-product-${product.id}`} className="scroll-mt-24">
              <ProductCard product={product} />
            </div>
        ))}
        </div>
      </div>
    </section>
  );
}
