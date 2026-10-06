import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Sign Up", description: "Create your UrbanForge account to save your favorite streetwear, manage orders and keep your delivery details ready." };

export default function SignupPage() {
  return <AuthScreen mode="signup" />;
}
