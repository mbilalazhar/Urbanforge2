import type { Metadata } from "next";
import CheckoutPage from "@/components/checkout/CheckoutPage";
import { checkoutItemSchema } from "@/lib/checkout/schema";
export const metadata: Metadata = { title: "Checkout | UrbanForge", description: "Complete your UrbanForge order." };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const direct = "productId" in params;
  const parsed = direct ? checkoutItemSchema.safeParse({ productId: params.productId, variantId: params.variantId, color: params.color, size: params.size, quantity: params.quantity === undefined ? 1 : typeof params.quantity === "string" ? Number(params.quantity) : NaN }) : null;
  return <CheckoutPage direct={direct} selection={parsed?.success ? parsed.data : null} />;
}
