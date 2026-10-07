import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import HeroSection from "@/components/hero/page";
import FeaturedProducts from "@/components/featured/FeaturedProductsServer";
import { catalogSections, getCatalogSection } from "@/lib/catalog-sections";

type Props = { params: Promise<{ category: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return catalogSections.map(section => ({ category: section.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = getCatalogSection((await params).category);
  if (!section) notFound();
  return pageMetadata(`/${section.slug}`, section.label, section.hero.description.join(" "));
}

export default async function CategoryPage({ params }: Props) {
  const section = getCatalogSection((await params).category);
  if (!section) notFound();

  return (
    <main>
      <HeroSection content={section.hero} />
      <FeaturedProducts category={section.slug} />
    </main>
  );
}
