import type { Metadata } from "next";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = { title: "Privacy Policy | UrbanForge", description: "Read the UrbanForge privacy policy." };
export default function Page() { return <PolicyPage policyKey="privacy" />; }
