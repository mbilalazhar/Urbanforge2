import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Reset Password | UrbanForge" };

export default function ForgotPasswordPage() {
  return <AuthScreen mode="reset" />;
}
