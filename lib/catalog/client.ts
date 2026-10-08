"use client";
import { useQuery } from "@tanstack/react-query";
import type { AdminProduct } from "@/lib/admin/types";
import type { CatalogProduct } from "@/lib/home-collections";
export type ProductResponse = { product: AdminProduct; related: AdminProduct[] };
export class CatalogError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new CatalogError(data?.message ?? "Unable to load products. Please try again.", response.status);
  return data as T;
}
export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: () => request<{ products: CatalogProduct[] }>("/api/catalog"), staleTime: 30_000, retry: false });
}
export function useProduct(id: string, initialData: ProductResponse) {
  return useQuery({ queryKey: ["catalog", id], queryFn: () => request<ProductResponse>(`/api/catalog/${encodeURIComponent(id)}`), initialData, staleTime: 30_000, retry: false });
}

export function useProductPreview(id: string) {
  return useQuery({ queryKey: ["catalog", id], queryFn: () => request<ProductResponse>(`/api/catalog/${encodeURIComponent(id)}`), staleTime: 0, retry: false });
}
