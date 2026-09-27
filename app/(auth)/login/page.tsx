import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Log In | UrbanForge" };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
