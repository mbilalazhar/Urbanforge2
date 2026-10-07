import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import PolicyPage from "@/components/policies/PolicyPage";
export const metadata: Metadata = pageMetadata("/cookie-policy", "Cookie Policy", "Learn how UrbanForge uses essential cookies and browser storage for sign-in and shopping, and how your cookie choices control optional analytics.");
export default function Page() { return <PolicyPage policyKey="cookies" />; }
