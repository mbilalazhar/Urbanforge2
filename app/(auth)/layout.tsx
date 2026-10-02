import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import Navbar from "@/components/navbar/page";
import Footer from "@/components/footer/page";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <WishlistProvider><Navbar />{children}<Footer /></WishlistProvider>;
}
