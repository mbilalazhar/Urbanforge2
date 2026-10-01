"use client";
import type { AdminProduct } from "@/lib/admin/types";
export type WishlistData = { accountId: string; productIds: string[]; products: AdminProduct[] };
export const WISHLIST_EVENT = "urbanforge:wishlist-changed";
export class WishlistError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function wishlistRequest(accountId: string, productId?: string, saved?: boolean, signal?: AbortSignal): Promise<WishlistData> {
  const response = await fetch(productId && !saved ? `/api/wishlist/${encodeURIComponent(productId)}` : "/api/wishlist", {
    method: !productId ? "GET" : saved ? "POST" : "DELETE", credentials: "same-origin", cache: "no-store", signal,
    ...(productId && saved ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new WishlistError(data?.message ?? "Unable to update your wishlist. Please try again.", response.status);
  if (data?.accountId !== accountId) throw new WishlistError("Your account changed. Please try again.", 409);
  return data;
}
