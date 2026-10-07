import type { Metadata } from "next";
import CartPage from "@/components/cart/CartPage";

export const metadata: Metadata = { robots: { index: false, follow: true },
  title: "Your Cart",
  description: "Your next rotation starts here. Review your UrbanForge cart.",
};

export default function Page() {
  return <CartPage />;
}
