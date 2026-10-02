"use client";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@/lib/user-profile";
import type { CartItem } from "@/lib/cart-data";
import type { CheckoutAddress, CheckoutContact, CheckoutItem, CustomerOrder } from "./types";

export class CheckoutRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function checkoutRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new CheckoutRequestError(data?.message ?? "Unable to complete checkout. Please try again.", response.status);
  return data;
}
export function checkoutDefaults(profile?: Pick<UserProfile, "name" | "email" | "contact" | "defaultAddress">) {
  const address = profile?.defaultAddress;
  const contact: CheckoutContact = { name: address?.recipient || profile?.name || "", email: profile?.email || "", phone: address?.contact || profile?.contact || "" };
  const delivery: CheckoutAddress = { line1: address?.line1 || "", apartment: address?.line2 || "", city: address?.city || "", province: address?.region || "", postalCode: address?.postalCode || "", country: address?.country || "", type: "home" };
  return { contact, address: delivery };
}
export function cartSelection(item: CartItem): CheckoutItem {
  // Previous carts encoded the selected options in their stable line-item ID.
  let options: unknown[] = [];
  try { const value = JSON.parse(item.id); if (Array.isArray(value) && value[0] === item.productId) options = value; } catch { /* Legacy item without encoded options. */ }
  return { productId: item.productId ?? "", ...(item.variantId ? { variantId: item.variantId } : {}),
    color: item.color ?? (typeof options[2] === "string" ? options[2] : ""),
    size: item.selectedSize ?? (typeof options[3] === "string" ? options[3] : item.size.startsWith("Size: ") ? item.size.slice(6) : ""), quantity: item.quantity };
}
export function useCustomerOrders(accountId: string) {
  return useQuery({ queryKey: ["customer-orders", accountId], queryFn: async ({ signal }) => {
    const data = await checkoutRequest<{ accountId: string; orders: CustomerOrder[] }>("/api/orders", undefined, signal);
    if (data.accountId !== accountId) throw new Error("Your account changed. Refresh this page to load your orders.");
    return data.orders;
  }, retry: false, staleTime: 0 });
}
// Retrying the same submission, including after a reload, uses the same key.
// Only a digest and random request ID are persisted, never contact/address data.
export async function checkoutRequestId(scope: string, payload: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const key = `urbanforge:checkout:${scope}`;
  try { const saved = JSON.parse(sessionStorage.getItem(key) ?? "null"); if (saved?.signature === signature && typeof saved.requestId === "string") return saved.requestId as string; } catch { /* Storage is optional. */ }
  const requestId = crypto.randomUUID();
  try { sessionStorage.setItem(key, JSON.stringify({ signature, requestId })); } catch { /* In-memory retry is handled by the form. */ }
  return requestId;
}
