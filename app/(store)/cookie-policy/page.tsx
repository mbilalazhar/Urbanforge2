import type { Metadata } from "next";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = { title: "Cookie Policy", description: "Learn how UrbanForge uses essential cookies and browser storage for sign-in and shopping, and how your cookie choices control optional analytics." };
export default function Page() { return <PolicyPage policyKey="cookies" />; }
