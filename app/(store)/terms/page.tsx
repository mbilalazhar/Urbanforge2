import type { Metadata } from "next";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = { title: "Terms & Conditions", description: "Read the UrbanForge terms for shopping, prices, placing orders, delivery, returns and using our website." };
export default function Page() { return <PolicyPage policyKey="terms" />; }
