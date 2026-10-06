import type { Metadata } from "next";
import FeaturedProducts from "@/components/featured/FeaturedProducts";
import HeroSection from "@/components/hero/page";

export const metadata: Metadata = {
  title: "Streetwear, Clothing & Accessories",
  description: "Shop UrbanForge streetwear for men and women. Discover jackets, cargos, hoodies, sneakers and accessories, plus the latest arrivals and sale styles.",
};

export default function Home() {
  return (
    <div>
     <HeroSection/>
    <FeaturedProducts/>
    </div>
  );
}
