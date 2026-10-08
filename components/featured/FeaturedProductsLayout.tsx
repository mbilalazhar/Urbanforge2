import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FeaturedProductsLayout({ category, children }: { category?: string; children: ReactNode }) {
  return <section id="new-arrivals" className="w-full scroll-mt-24 bg-white px-6 py-16 text-black sm:px-10 sm:py-20 lg:px-16">
    <div className="mx-auto max-w-[1700px]">
      <div className="mb-10 flex items-end justify-between gap-6 sm:mb-14">
        <div className="min-w-0 flex-1"><div className="mb-5 flex items-center gap-3"><span className="block h-[2px] w-8 bg-[#e53e3e]" /><span className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-600">The UrbanForge collection</span></div>
          <h2 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">{category ? <>Shop the <span className="text-[#e53e3e]">collection</span></> : <>All <span className="text-[#e53e3e]">products</span></>}</h2>
          <p className="mt-4 text-sm text-neutral-500">{category ? "Fresh drops. Bold fits. Built for what's next." : "Explore the complete UrbanForge collection."}</p></div>
        <Link href="/search" className="hidden shrink-0 items-center gap-2 text-sm sm:flex">View all <ArrowRight size={16} /></Link>
      </div>
      {children}
    </div>
  </section>;
}
