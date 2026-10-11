import { Suspense } from "react";
import { connection } from "next/server";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { catalog } from "@/lib/admin/server";
import { toCatalogListing } from "@/lib/catalog/listing";
import FeaturedProducts from "./FeaturedProducts";
import FeaturedProductsLayout from "./FeaturedProductsLayout";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";

async function CatalogContents({ category }: { category?: string }) {
  // Read live inventory at request time, never from the build environment.
  await connection();
  const response = await catalog();
  const client = new QueryClient();
  if (response.ok) {
    const { products } = await response.json();
    client.setQueryData(["catalog"], { products: products.map(toCatalogListing) });
  }
  // On outages the existing client query offers its normal retry UI.
  return <HydrationBoundary state={dehydrate(client)}>
    <FeaturedProducts key={category ?? "home"} category={category} />
  </HydrationBoundary>;
}

export default function FeaturedProductsServer({ category }: { category?: string }) {
  return <Suspense fallback={<FeaturedProductsLayout category={category}><ProductGridSkeleton count={20} className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" /></FeaturedProductsLayout>}>
    <CatalogContents category={category} />
  </Suspense>;
}
