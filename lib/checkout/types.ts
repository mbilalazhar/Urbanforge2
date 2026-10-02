import type { AdminOrder, OrderItem } from "@/lib/admin/types";
export type CheckoutItem = { productId: string; variantId?: string; color?: string; size?: string; quantity: number };
export type DeliveryMethod = "standard" | "express";
export type CheckoutContact = { name: string; email: string; phone: string };
export type CheckoutAddress = { line1: string; apartment: string; city: string; province: string; postalCode: string; country: string; type: "home" | "work" | "other" };
export type QuoteItem = OrderItem & { stock: number };
export type CheckoutQuote = { items: QuoteItem[]; subtotal: number; shipping: number; discount: number; total: number; quoteToken: string };
export type CheckoutInput = { items: CheckoutItem[]; deliveryMethod: DeliveryMethod; email: string; couponCode?: string };
export type PlaceOrderInput = Omit<CheckoutInput, "email"> & { contact: CheckoutContact; address: CheckoutAddress; saveAddress: boolean; paymentMethod: "cod"; requestId: string; quoteToken: string; accountId: string | null };
export type CustomerOrder = Pick<AdminOrder, "id" | "number" | "customerName" | "email" | "phone" | "address" | "items" | "subtotal" | "shipping" | "discount" | "total" | "status" | "paymentStatus" | "courier" | "trackingNumber" | "createdAt"> & { shippingAddress?: CheckoutAddress; deliveryMethod?: DeliveryMethod; paymentMethod?: "cod" };
export function shippingCost(method: DeliveryMethod, subtotal: number) { return method === "express" ? 500 : subtotal >= 5000 ? 0 : 250; }
