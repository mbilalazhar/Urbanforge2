import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Log In", description: "Log in to your UrbanForge account to access your wishlist, saved addresses and order history." };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
