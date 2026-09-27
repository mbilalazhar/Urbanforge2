import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Sign Up | UrbanForge" };

export default function SignupPage() {
  return <AuthScreen mode="signup" />;
}
