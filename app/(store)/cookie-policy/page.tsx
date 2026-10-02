import type { Metadata } from "next";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = { title: "Cookie Policy | UrbanForge", description: "Read the UrbanForge cookie policy." };
export default function Page() { return <PolicyPage policyKey="cookies" />; }
