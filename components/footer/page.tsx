import Link from "next/link";
import Image from "next/image";
import Newsletter from "./NewsLetter";
import { FaInstagram, FaFacebookF, FaWhatsapp, FaTiktok  } from "react-icons/fa";
import { BiLogoGmail } from "react-icons/bi";
import { LiaTelegram } from "react-icons/lia";
import { FaPinterestP } from "react-icons/fa6";
// ---------- Data ----------
const contactInfo = [
  { label: "E", value: "info@urbanforge.com", href: "mailto:info@urbanforge.com" },
  { label: "P", value: "02 9756 0388", href: "tel:0297560388" },
];
const socials = [
  { label: "Instagram", href: "https://instagram.com",  icon: FaInstagram },
  { label: "Facebook",  href: "https://facebook.com",   icon: FaFacebookF },
  { label: "WhatsApp",  href: "https://wa.me/",         icon: FaWhatsapp },
  { label: "Telegram",  href: "https://t.me/",          icon: LiaTelegram },
  { label: "TikTok",    href: "https://tiktok.com",     icon: FaTiktok },
  { label: "Pinterest", href: "https://pinterest.com",  icon: FaPinterestP },
  { label: "Email",     href: "mailto:info@urbanforge.com", icon: BiLogoGmail },
];
const warehouseInfo = [
  "Unit 11/6-8 Allen Place,",
  "Wetherill Park NSW 2164",
];

const openingHours = ["Monday - Friday", "10am - 4pm"];

const linkGroups = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "/" },
      { label: "New Arrivals", href: "/new-in" },
      { label: "Search Products", href: "/search" },
    ],
  },
  {
    title: "Shop",
    links: [
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "Shoes", href: "/shoes" },
      { label: "Accessories", href: "/accessories" },
      { label: "Sale", href: "/sale" },
      { label: "All Products", href: "/search" },
    ],
  },
  {
    title: "Assistance",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "FAQs", href: "/faqs" },
      { label: "My Account & Orders", href: "/account" },
      { label: "Your Cart", href: "/cart" },
      { label: "Log In", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Cookie Policy", href: "/cookie-policy" },
    ],
  },
];


// ---------- Component ----------
export default function Footer() {
  return (
    <footer className="w-full bg-neutral-950 text-neutral-300">
      {/* ============ Newsletter ============ */}
      <Newsletter />

      {/* ============ Middle: Contact / Warehouse / Hours ============ */}
      <div className="border-t border-neutral-800">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-3 lg:px-8">
          {/* Contact us */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-600">
              <Link href="/contact" className="transition-colors hover:text-white">Contact us</Link>
            </h3>
            <ul className="space-y-2 text-sm text-neutral-200">
              {contactInfo.map((item) => (
                <li key={item.label}>
                  <span className="font-medium">{item.label} : </span>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-rose-500"
                  >
                    {item.value}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Warehouse */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-600">
              Warehouse address:
            </h3>
            <address className="not-italic text-sm text-neutral-200">
              {warehouseInfo.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </address>
          </div>

          {/* Opening hours */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-600">
              Warehouse Opening Times:
            </h3>
            <div className="text-sm text-neutral-200">
              {openingHours.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Bottom: Links (left) + Brand (right) ============ */}
      <div className="border-t border-neutral-800">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[2fr_1fr] lg:gap-20 lg:px-8">
          {/* LEFT — 4 link groups */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {linkGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-rose-600">
                  {group.title}
                </h3>
                <ul className="space-y-3 text-sm">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-neutral-400 transition-colors duration-200 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* RIGHT — Brand block */}
          <div className="flex flex-col lg:items-end lg:text-right">
            <Image
              src="/dark-bg-logo.svg"
              alt="UrbanForge"
              width={480}
              height={160}
              className="h-40 w-auto object-contain"
            />
            <p className="text-lg font-bold uppercase leading-tight tracking-[0.08em] text-white sm:text-xl lg:text-2xl">
              Forged for the
              <br />
              Modern Generation.
            </p>
          </div>
        </div>
      </div>

   {/* ============ Copyright ============ */}
<div className="border-t border-neutral-800">
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-6 sm:flex-row lg:px-8">
    {/* Left — copyright */}
    <p className="order-2 text-center text-xs text-neutral-500 sm:order-1 sm:text-left">
      © {new Date().getFullYear()} UrbanForge. All rights reserved.
    </p>

    {/* Center — social icons */}
    <ul className="order-1 flex items-center gap-5 sm:order-2">
      {socials.map((social) => (
        <li key={social.label}>
          <Link
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className="block text-neutral-500 transition-all duration-200 hover:scale-110 hover:text-white"
          >
            <social.icon className="h-5 w-5" />
          </Link>
        </li>
      ))}
    </ul>

    {/* Right — credit */}
    <p className="order-3 text-center text-xs text-neutral-500 sm:text-right">
      Designed &amp; Developed by{" "}
      <Link
        href="https://urbandesigns.com.au"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-300 transition-colors hover:text-white"
      >
        Urban Designs Studio
      </Link>
    </p>
  </div>
</div>
      <div className="h-3 w-full bg-[#B22222]"></div>
    </footer>
  );
}
