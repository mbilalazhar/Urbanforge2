import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import FeaturedProducts from "@/components/featured/FeaturedProductsServer";
import HeroSection from "@/components/hero/page";

export const metadata: Metadata = pageMetadata("/", "Streetwear, Clothing & Accessories", "Shop UrbanForge streetwear for men and women. Discover jackets, cargos, hoodies, sneakers and accessories, plus the latest arrivals and sale styles.");

export default function Home() {
  return (
    <main>
     <HeroSection/>
    <FeaturedProducts/>
    </main>
  );
}
