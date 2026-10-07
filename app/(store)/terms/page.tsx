import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = pageMetadata("/terms", "Terms & Conditions", "Read the UrbanForge terms for shopping, prices, placing orders, delivery, returns and using our website.");
export default function Page() { return <PolicyPage policyKey="terms" />; }
