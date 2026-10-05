"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import styles from "./mobileMenu.module.css";

type MenuItem = {
  label: string;
  href: string;
  highlight?: boolean;
};

export default function MobileMenu({ menuItems }: { menuItems: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { itemCount, isLoading } = useCart();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const trigger = triggerRef.current;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);

    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      dialog.close();
      if (!desktop.matches) trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={styles.trigger}
      >
        <Menu size={24} strokeWidth={1.75} />
      </button>

      <dialog
        id="mobile-menu"
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="mobile-menu-title"
        onCancel={event => { event.preventDefault(); closeMenu(); }}
        onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}
      >
        <div className={styles.panel}>
          <div className={styles.header}>
            <Link href="/" onClick={closeMenu} aria-label="UrbanForge home">
              <Image src="/logo.svg" alt="UrbanForge" width={150} height={40} />
            </Link>
            <button type="button" className={styles.close} aria-label="Close menu" onClick={closeMenu} autoFocus>
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>

          <div className={styles.content}>
            <Link href="/search" onClick={closeMenu} className={styles.search}><Search size={18} /><span>Search UrbanForge</span><ArrowRight size={16} /></Link>
            <div className={styles.intro}>
              <p>Made for your everyday.</p>
              <h2 id="mobile-menu-title">Find your next fit.</h2>
            </div>
            <nav aria-label="Mobile shopping navigation">
              <ul className={styles.links}>
                {[{ label: "Home", href: "/" }, ...menuItems, { label: "About UrbanForge", href: "/about" }].map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`${styles.link} ${item.highlight ? styles.sale : ""}`}
                    >
                      <span>{item.label}</span>
                      {item.highlight && <span className={styles.saleBadge}>The sale edit</span>}
                      <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link href="/new-in" onClick={closeMenu} className={styles.feature}>
              <span><small>The latest drop</small><strong>New season. Your rules.</strong></span>
              <ArrowRight size={22} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.footer}>
            <Link href="/account" onClick={closeMenu}><User size={19} strokeWidth={1.5} /><span>My account</span><ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/cart" onClick={closeMenu}><ShoppingBag size={19} strokeWidth={1.5} /><span>Your cart</span><span className={styles.count}>{isLoading ? <Skeleton width={14} height={12} /> : itemCount}</span></Link>
            <p>UrbanForge · Built for the streets</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
