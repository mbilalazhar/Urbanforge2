"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, BarChart3, Boxes, CalendarDays, ChevronRight, ExternalLink, LayoutDashboard, LogOut, Menu, Package, Percent, Search, ShoppingBag, Tag, Users, X } from "lucide-react";
import type { PublicAccount } from "@/lib/auth/types";
import { useLogout } from "@/lib/auth/client";
import { resetPreview } from "@/lib/admin/preview";
import { money, useAdminQuery } from "@/lib/admin/client";
import type { AdminCustomer } from "@/lib/admin/types";
import Dashboard from "./Dashboard";
import ProductsPanel from "./ProductsPanel";
import InventoryPanel from "./InventoryPanel";
import OrdersPanel from "./OrdersPanel";
import OffersPanel from "./OffersPanel";
import styles from "./portal.module.css";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "coupons", label: "Discounts & coupons", icon: Tag },
  { id: "promotions", label: "Sales & promotions", icon: Percent },
] as const;
export type Section = typeof navigation[number]["id"];

export default function AdminPortal({ account }: { account: PublicAccount }) {
  const [section, setSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  const logout = useLogout("admin");
  const router = useRouter();
  const client = useQueryClient();
  const current = navigation.find(item => item.id === section)!;
  function navigate(next: Section) { setSection(next); setSearch(""); setMenu(false); }

  return <div className={styles.portal}>
    {menu && <button className={styles.scrim} onClick={() => setMenu(false)} aria-label="Close navigation" />}
    <aside className={`${styles.sidebar} ${menu ? styles.sidebarOpen : ""}`}>
      <Link href="/adminroute" className={styles.logo}>URBAN<span>FORGE</span><small>ADMIN PORTAL</small></Link>
      <div className={styles.storeBadge}><div>UF</div><span>UrbanForge Store<small>Store management</small></span><ChevronRight size={15} /></div>
      <p className={styles.navLabel}>WORKSPACE</p>
      <nav aria-label="Admin navigation">{navigation.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={section === item.id ? styles.activeNav : undefined} aria-current={section === item.id ? "page" : undefined}><item.icon size={19} strokeWidth={1.7} />{item.label}{section === item.id && <span className={styles.navDot} />}</button>)}</nav>
      <div className={styles.sidebarBottom}><div className={styles.sidebarNote}><BarChart3 size={21} /><strong>A little insight.<br />A lot of possibility.</strong><p>Everything you need to keep your store moving.</p></div><a href="/" target="_blank" rel="noreferrer"><ExternalLink size={17} />Visit storefront<ArrowUpRight size={15} /></a></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <button className={styles.mobileMenu} aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu(!menu)}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
        <div className={styles.breadcrumb}>Workspace <ChevronRight size={13} /><span>{current.label}</span></div>
        <div className={styles.account}><div className={styles.avatar}>{account.name.slice(0, 2).toUpperCase()}</div><span>{account.name}<small>Administrator</small></span><button title="Sign out" aria-label="Sign out of admin account" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: () => { resetPreview(); client.removeQueries({ queryKey: ["admin"] }); router.refresh(); } })}><LogOut size={17} /></button></div>
      </header>
      <main className={styles.main}>
        <div className={styles.utility}><label className={styles.search}><Search size={17} /><input type="search" placeholder="Search products, orders, customers…" aria-label="Search admin records" value={search} onChange={event => setSearch(event.target.value)} />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><span className={styles.date}><CalendarDays size={15} />{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}</span></div>
        {!(["products", "inventory"] as string[]).includes(section) && <div className={styles.previewNotice}><span><strong>Preview mode</strong> This section uses sample data. Products and inventory are saved permanently.</span><button onClick={() => { resetPreview(); void client.invalidateQueries({ queryKey: ["admin"] }); }}>Reset preview</button></div>}
        {logout.error && <p className={styles.error} role="alert">{logout.error.message}</p>}
        {section === "overview" && <Dashboard name={account.name} navigate={navigate} search={search} />}
        {section === "products" && <ProductsPanel search={search} />}
        {section === "inventory" && <InventoryPanel search={search} />}
        {section === "orders" && <OrdersPanel search={search} />}
        {section === "customers" && <Customers search={search} />}
        {(section === "coupons" || section === "promotions") && <OffersPanel key={section} section={section} search={search} />}
      </main>
    </div>
  </div>;
}

function Customers({ search }: { search: string }) {
  const query = useAdminQuery<{ customers: AdminCustomer[] }>("customers");
  const customers = (query.data?.customers ?? []).filter(customer => `${customer.name} ${customer.email}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className={styles.heading}><div><p className={styles.eyebrow}>YOUR COMMUNITY</p><h1>Customers</h1><p>Get to know the people behind every order.</p></div></div><div className={styles.panel}>
    <div className={styles.panelTitle}><h2>Customer directory</h2><span>{customers.length} customers</span></div>
    {query.isPending ? <p className={styles.empty}>Loading customers…</p> : query.error ? <p className={styles.error} role="alert">{query.error.message} <button onClick={() => query.refetch()}>Try again</button></p> : <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Customer</th><th>Email address</th><th>Joined</th><th>Orders</th><th>Total spent</th><th /></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td><div className={styles.person}><span className={styles.avatar}>{customer.name.slice(0, 2).toUpperCase()}</span><strong>{customer.name}</strong></div></td><td>{customer.email}</td><td>{new Date(customer.createdAt).toLocaleDateString("en-GB")}</td><td>{customer.orders}</td><td>{money(customer.spent)}</td><td><a href={`mailto:${customer.email}`} aria-label={`Email ${customer.name}`}><ArrowUpRight size={17} /></a></td></tr>)}</tbody></table>{!customers.length && <div className={styles.empty}><Users size={28} /><h3>{search ? "No customers match your search" : "Your community starts here"}</h3><p>Registered customers and order contacts will appear here.</p></div>}</div>}
  </div></>;
}
