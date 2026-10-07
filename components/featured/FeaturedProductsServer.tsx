import { Suspense } from "react";
import { connection } from "next/server";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { catalog } from "@/lib/admin/server";
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
    client.setQueryData(["catalog"], { products });
  }
  // On outages the existing client query offers its normal retry UI.
  return <HydrationBoundary state={dehydrate(client)}>
    <FeaturedProducts category={category} />
  </HydrationBoundary>;
}

export default function FeaturedProductsServer({ category }: { category?: string }) {
  return <Suspense fallback={<FeaturedProductsLayout category={category}><ProductGridSkeleton count={5} className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5" /></FeaturedProductsLayout>}>
    <CatalogContents category={category} />
  </Suspense>;
}
