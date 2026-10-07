import type { Metadata } from "next";
import SearchPage from "@/components/search/SearchPage";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = ((Array.isArray(q) ? q[0] : q) ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    robots: { index: false, follow: true },
    alternates: { canonical: "/search" },
    title: query ? `Search: ${query}` : "Search",
    description: query
      ? `Explore UrbanForge results for “${query}”. Find clothing, footwear, accessories and collections for your next fit.`
      : "Find your next fit. Search UrbanForge clothing, footwear, accessories and collections.",
  };
}

export default async function Page({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q) ?? "";
  return <SearchPage key={query} query={query} />;
}
