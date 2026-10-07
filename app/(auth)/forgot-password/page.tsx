import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = { robots: { index: false, follow: true }, title: "Reset Password", description: "Get help restoring access to your UrbanForge account and returning to your saved streetwear favorites." };

export default function ForgotPasswordPage() {
  return <AuthScreen mode="reset" />;
}
