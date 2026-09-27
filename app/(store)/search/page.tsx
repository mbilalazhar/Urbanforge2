import type { Metadata } from "next";
import SearchPage from "@/components/search/SearchPage";

export const metadata: Metadata = {
  title: "Search | UrbanForge",
  description: "Find your next fit. Search UrbanForge clothing, footwear, and accessories.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q) ?? "";
  return <SearchPage key={query} query={query} />;
}
