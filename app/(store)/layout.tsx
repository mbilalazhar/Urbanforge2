import Navbar from "@/components/navbar/page";
import Footer from "@/components/footer/page";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <><Navbar />{children}<Footer /></>;
}
