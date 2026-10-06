import type { Metadata } from "next";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = { title: "Privacy Policy", description: "Learn how UrbanForge handles your account information, order details and browser storage, and how to contact us about your privacy." };
export default function Page() { return <PolicyPage policyKey="privacy" />; }
