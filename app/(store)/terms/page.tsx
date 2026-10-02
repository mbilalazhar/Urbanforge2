import type { Metadata } from "next";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = { title: "Terms & Conditions | UrbanForge", description: "Read the UrbanForge terms & conditions." };
export default function Page() { return <PolicyPage policyKey="terms" />; }
