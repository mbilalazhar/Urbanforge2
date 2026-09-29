import ProductCard from "@/components/product/ProductCard";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { featuredProducts as products } from "@/lib/products";

export default function FeaturedProducts() {
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
