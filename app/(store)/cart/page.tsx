import type { Metadata } from "next";
import CartPage from "@/components/cart/CartPage";

export const metadata: Metadata = {
  title: "Your Cart | UrbanForge",
  description: "Your next rotation starts here. Review your UrbanForge cart.",
};

export default function Page() {
  return <CartPage />;
}
