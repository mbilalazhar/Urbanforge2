import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/session";
import User from "@/models/User";
import AccountPanel from "@/components/auth/AccountPanel";
import ServiceUnavailable from "@/components/ServiceUnavailable";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your UrbanForge profile, saved addresses and order history. Keep your account details ready for your next order.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  // Keep redirects outside the catch: Next.js implements them by throwing.
  let account;
  let profile;
  try {
    account = await getCurrentAccount("user");
    profile = account ? await User.getProfile(account.id) : null;
  } catch {
    return <ServiceUnavailable title="Your account is temporarily unavailable" />;
  }
  if (!account) redirect("/login");
  if (!profile) redirect("/login");
  return <AccountPanel account={account} profile={profile} />;
}
