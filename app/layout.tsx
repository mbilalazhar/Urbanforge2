import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { FeedbackProvider } from "@/components/ui/Feedback";
import CookieNotice from "@/components/cookies/CookieNotice";
import ScrollToTop from "@/components/ui/ScrollToTop";
import QueryProvider from "@/components/providers/QueryProvider";
import { Inter } from 'next/font/google';
export const metadata: Metadata = {
  applicationName: "UrbanForge",
  title: { default: "UrbanForge | Built for the Streets", template: "%s | UrbanForge" },
  description: "Discover UrbanForge streetwear, clothing, footwear and accessories. Explore everyday essentials, new arrivals and bold fits built for the streets.",
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      {/* Browser extensions can inject attributes on body before React hydrates. */}
      <body suppressHydrationWarning className="bg-[#111111] text-white antialiased">
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
