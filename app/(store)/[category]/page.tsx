import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroSection from "@/components/hero/page";
import FeaturedProducts from "@/components/featured/FeaturedProducts";
import { catalogSections, getCatalogSection } from "@/lib/catalog-sections";

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return catalogSections.map(section => ({ category: section.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = getCatalogSection((await params).category);
  if (!section) notFound();
  return { title: `${section.label} | UrbanForge`, description: section.hero.description.join(" ") };
}

export default async function CategoryPage({ params }: Props) {
  const section = getCatalogSection((await params).category);
  if (!section) notFound();

  return (
    <main>
      <HeroSection content={section.hero} />
      <FeaturedProducts />
    </main>
  );
}
