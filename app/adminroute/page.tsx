import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";
import AdminPortal from "@/components/admin/AdminPortal";
import { getCurrentAccount } from "@/lib/auth/session";
import ServiceUnavailable from "@/components/ServiceUnavailable";

export const metadata: Metadata = {
  title: "Admin Portal",
  description: "Manage the UrbanForge store, including products, inventory, orders, customers, discounts and promotions.",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  let account;
  try {
    account = await getCurrentAccount("admin");
  } catch {
    return <ServiceUnavailable title="The admin portal is temporarily unavailable" />;
  }
  return account ? <AdminPortal account={account} /> : <AdminLoginForm />;
}
