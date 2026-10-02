// components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, ShoppingBag, Heart } from "lucide-react";
import MobileMenu from "./mobileMenu";
import { menuItems } from "@/lib/catalog-sections";
import { useCart } from "@/components/cart/CartProvider";
import styles from "./navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const isCart = pathname === "/cart";
  const isLightPage = pathname.startsWith("/products/") || ["/search", "/cart", "/checkout", "/wishlist", "/account", "/login", "/signup", "/forgot-password"].includes(pathname);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`${styles.header} fixed top-0 z-50 w-full transition-all duration-500 ease-out ${
        isScrolled ? "flex justify-center py-3" : "py-4"
      }`}
    >
      <nav className={styles.mobileNav} aria-label="Main navigation">
        <MobileMenu menuItems={menuItems} />
        <Link href="/" className={styles.mobileLogo} aria-label="UrbanForge home">
          <Image src="/logo.svg" alt="UrbanForge" width={160} height={40} priority />
        </Link>
        <Link href="/cart" className={styles.mobileCart} aria-label={`Cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`} aria-current={isCart ? "page" : undefined}>
          <ShoppingBag size={22} strokeWidth={1.75} />
          <span>{itemCount}</span>
        </Link>
      </nav>
<nav
  aria-label="Main navigation"
  className={`${styles.desktopNav} transition-all duration-500 ease-out ${
    isScrolled
      ? "flex w-fit items-center gap-8 rounded-full bg-white/85 px-6 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] ring-1 ring-inset ring-black/10 backdrop-blur-md lg:gap-10 lg:px-8"
      : "relative mx-auto flex w-full max-w-325 items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-24"
  }`}
>
        {/* LEFT — Hamburger (mobile) / Logo (desktop) */}
        <div className="flex items-center">
          <Link
            href="/"
            className="hidden items-center transition-all duration-500 ease-out md:flex"
          >
            <Image
              src="/logo.svg"
              alt="Urbanforge"
              width={isScrolled ? 120 : 200}
              height={isScrolled ? 24 : 40}
              priority
              className={`w-auto transition-all duration-500 ease-out ${
                isScrolled ? "h-7 lg:h-8" : "h-10 lg:h-14"
              } ${isScrolled || isLightPage ? "" : "brightness-0 invert"}`}
            />
          </Link>
        </div>

        {/* CENTER — Logo (mobile) / Menu (desktop) */}
        {/* Absolutely centered in unscrolled state for true optical centering */}
        <div
          className={`${
            isScrolled
              ? "flex items-center"
              : "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
          }`}
        >
          {/* Desktop menu */}
          <ul
            className={`hidden items-center whitespace-nowrap transition-all duration-500 ease-out md:flex ${
              isScrolled ? "gap-6 lg:gap-8" : "gap-12 lg:gap-10"
            }`}
          >
            {menuItems.map((item) => (
              <li key={item.label} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`group relative inline-block whitespace-nowrap uppercase transition-all duration-500 ease-out ${
                    isScrolled
                      ? "text-[11px] tracking-[0.14em]"
                      : "text-[14px] tracking-[0.2em]"
                  } ${
                    item.highlight || pathname === item.href
                      ? "font-semibold text-rose-600 hover:text-[#B22222]"
                      : isScrolled || isLightPage
                        ? "font-medium text-neutral-700 hover:text-black"
                        : "font-medium text-white/90 hover:text-white"
                  }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className={`absolute -bottom-1 left-0 h-[1.5px] bg-[#B22222] transition-all duration-300 ease-out group-hover:w-full ${pathname === item.href ? "w-full" : "w-0"}`} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — Icons */}
        <div
          className={`flex items-center ${
            isScrolled ? "gap-3 sm:gap-4" : "gap-6 sm:gap-8"
          }`}
        >
          <Link
            href="/search"
            aria-label="Search"
            className={`transition-all duration-500 ease-out hover:scale-110 ${
              isScrolled || isLightPage
                ? "text-neutral-700 hover:text-black"
                : "text-white/90 hover:text-white"
            }`}
          >
            <Search
              className={`transition-all duration-500 ease-out ${
                isScrolled ? "h-4 w-4" : "h-5.5 w-5.5"
              }`}
              strokeWidth={1.75}
            />
          </Link>

          <Link href="/wishlist" aria-label="Your wishlist" className={`transition-opacity hover:opacity-70 ${isScrolled || isLightPage ? "text-neutral-700" : "text-white/90"}`}><Heart size={21} strokeWidth={1.75} /></Link>
          <Link
            href="/account"
            aria-label="Account"
            className={`transition-all duration-500 ease-out hover:scale-110 ${
              isScrolled || isLightPage
                ? "text-neutral-700 hover:text-black"
                : "text-white/90 hover:text-white"
            }`}
          >
            <User
              className={`transition-all duration-500 ease-out ${
                isScrolled ? "h-4 w-4" : "h-5.5 w-5.5"
              }`}
              strokeWidth={1.75}
            />
          </Link>

          <Link
            href="/cart"
            aria-label={`Cart (${itemCount} ${itemCount === 1 ? "item" : "items"})`}
            aria-current={isCart ? "page" : undefined}
            className={`relative transition-all duration-500 ease-out hover:scale-110 ${
              isScrolled || isLightPage
                ? "text-neutral-700 hover:text-black"
                : "text-white/90 hover:text-white"
            }`}
          >
            <ShoppingBag
              className={`transition-all duration-500 ease-out ${
                isScrolled ? "h-4 w-4" : "h-5.5 w-5.5"
              }`}
              strokeWidth={1.75}
            />
            <span
              className={`absolute -right-2 -top-2 flex items-center justify-center rounded-full font-semibold transition-all duration-500 ease-out ${
                isScrolled
                  ? "h-3.5 min-w-3.5 px-0.5 bg-[#c82032] text-[9px] text-white"
                  : "h-4 min-w-4 px-1 bg-[#c82032] text-[10px] text-white"
              }`}
            >
              {itemCount}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
