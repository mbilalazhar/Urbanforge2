import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";
import AdminPortal from "@/components/admin/AdminPortal";
import { getCurrentAccount } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin Portal | UrbanForge",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const account = await getCurrentAccount("admin");
  return account ? <AdminPortal account={account} /> : <AdminLoginForm />;
}
