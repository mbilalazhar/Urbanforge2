import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import User from "@/models/User";
import AccountPanel from "@/components/auth/AccountPanel";

export const metadata: Metadata = {
  title: "My Account | UrbanForge",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const account = await getCurrentAccount("user");
  if (!account) redirect("/login");
  const profile = await User.getProfile(account.id);
  if (!profile) redirect("/login");
  return <AccountPanel account={account} profile={profile} />;
}
