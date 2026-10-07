import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { FeedbackProvider } from "@/components/ui/Feedback";
import CookieNotice from "@/components/cookies/CookieNotice";
import ScrollToTop from "@/components/ui/ScrollToTop";
import QueryProvider from "@/components/providers/QueryProvider";
import { siteUrl, siteDescription, jsonLd } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "UrbanForge",
  title: { default: "UrbanForge | Built for the Streets", template: "%s | UrbanForge" },
  description: siteDescription,
  openGraph: { siteName: "UrbanForge", type: "website", title: "UrbanForge | Built for the Streets", description: siteDescription, images: [{ url: "/social-preview.jpg", width: 1200, height: 630, alt: "UrbanForge streetwear collection" }] },
  twitter: { card: "summary_large_image", title: "UrbanForge | Built for the Streets", description: siteDescription, images: ["/social-preview.jpg"] },
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      {/* Browser extensions can inject attributes on body before React hydrates. */}
      <body suppressHydrationWarning className="bg-[#111111] text-white antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": [
          { "@type": "Organization", "@id": new URL("/#organization", siteUrl).href, name: "UrbanForge", url: siteUrl.href, logo: new URL("/logo.svg", siteUrl).href },
          { "@type": "WebSite", "@id": new URL("/#website", siteUrl).href, name: "UrbanForge", url: siteUrl.href },
        ] }) }} />
        <Suspense fallback={null}><ScrollToTop /></Suspense>
        <FeedbackProvider>
        <QueryProvider>
        <CartProvider>
          {children}
          <CookieNotice />
        </CartProvider>
        </QueryProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
