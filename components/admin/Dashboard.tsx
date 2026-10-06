"use client";
import { FeedbackNotice, useFeedback } from "@/components/ui/Feedback";
/* eslint-disable @next/next/no-img-element */

import { Skeleton, DashboardSkeleton, PendingContent } from "@/components/ui/Skeleton";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, Package, Plus, ShoppingBag, Tag, TrendingUp, Users } from "lucide-react";
import type { LiveAdminDashboard } from "@/lib/admin/analytics";
import { money, useAdminQuery } from "@/lib/admin/client";
import type { Section } from "./AdminPortal";
import styles from "./portal.module.css";

const palette = ["#cc2338", "#25272c", "#f18c94", "#b2b5bd", "#f7bec3", "#e2e4e9"];
export default function Dashboard({ name, navigate, search }: { name: string; navigate: (section: Section) => void; search: string }) {
  const query = useAdminQuery<LiveAdminDashboard>("dashboard", "api", { refetchInterval: 30_000 });
  const [chart, setChart] = useState<"revenue" | "orders">("revenue");
  const feedback = useFeedback();
  if (query.isPending) return <DashboardSkeleton />;
  if (query.error || !query.data) return <FeedbackNotice>{query.error?.message || "Unable to load the dashboard."}<button onClick={() => query.refetch()}>Try again</button></FeedbackNotice>;
  const data = query.data;
  const metrics = data.metrics;
  const match = (value: string) => value.toLowerCase().includes(search.toLowerCase());
  const orders = [...data.orders].filter(order => match(`${order.number} ${order.customerName} ${order.email}`)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const customers = [...data.customers].filter(customer => match(`${customer.name} ${customer.email}`)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const topProducts = metrics.bestsellers.filter(product => match(`${product.name} ${product.category}`));
  const viewedProducts = [...data.products].filter(product => product.views > 0 && match(`${product.name} ${product.category}`)).sort((a, b) => b.views - a.views);
  const units = metrics.categories.reduce((sum, [, value]) => sum + value, 0);
  const categories = metrics.categories.length > 6 ? [...metrics.categories.slice(0, 5), ["Others", metrics.categories.slice(5).reduce((sum, [, count]) => sum + count, 0)] as [string, number]] : metrics.categories;
  const segments = categories.map(([, count], index) => { const start = categories.slice(0, index).reduce((sum, [, value]) => sum + value, 0) / units * 100; return `${palette[index]} ${start}% ${start + count / units * 100}%`; });
  const max = Math.max(1, ...metrics.months.map(month => month[chart]));
  const stats = [
    { label: "Total revenue", value: money(metrics.revenue), note: "Paid orders, excluding cancelled / returned / refunded", icon: CircleDollarSign, values: metrics.months.map(month => month.revenue) },
    { label: "Total orders", value: data.orders.length.toLocaleString(), note: `${metrics.pending} awaiting completion`, icon: ShoppingBag, values: metrics.months.map(month => month.orders) },
    { label: "Total customers", value: data.customers.length.toLocaleString(), note: `${metrics.newCustomers} new this month`, icon: Users, values: metrics.months.map(month => month.customers) },
    { label: "Total products", value: data.products.length.toLocaleString(), note: `${data.products.filter(product => product.status === "active").length} active in your store`, icon: Package, values: [] },
  ];
  const quick = [
    { label: "Add product", icon: Plus, section: "products" }, { label: "View inventory", icon: Boxes, section: "inventory" },
    { label: "View orders", icon: ShoppingBag, section: "orders" }, { label: "Manage discounts", icon: Tag, section: "coupons" },
    { label: "Create promotion", icon: TrendingUp, section: "promotions" }, { label: "View customers", icon: Users, section: "customers" },
  ] as const;

  return <>
    <div className={styles.heading}><div><p className={styles.eyebrow}>LET’S MAKE TODAY A GOOD ONE</p><h1>Welcome back, {name.split(" ")[0]} <span aria-hidden="true">👋</span></h1><p>Here’s what’s happening with your store today.</p></div><button className={styles.primary} onClick={() => navigate("products")}><Plus size={15} />Add product</button></div>
    <div className={styles.overviewStatus}><span role="status">{query.isFetching ? <Skeleton width={220} /> : `Live store data · Updated ${new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })} PKT · Refreshes every 30 seconds`}</span><button type="button" onClick={async () => { const result = await query.refetch(); if (result.isSuccess) feedback.success("Store overview refreshed."); }} disabled={query.isFetching}><PendingContent pending={query.isFetching}>Refresh</PendingContent></button></div>
    <div className={styles.stats}>{stats.map(stat => <article className={styles.stat} key={stat.label}><div className={styles.statTop}><span className={styles.statIcon}><stat.icon size={17} strokeWidth={1.7} /></span>{stat.label}</div><strong>{stat.value}</strong><small>{stat.note}</small>{stat.values.some(value => value > 0) && <Sparkline values={stat.values} compact />}</article>)}</div>
    <div className={styles.dashboardGrid}>
      <div className={styles.dashboardMain}>
        <div className={styles.chartRow}>
          <section className={styles.panel}><div className={styles.panelTitle}><h2>{chart === "revenue" ? "Revenue" : "Orders"} overview</h2><select aria-label="Chart metric" value={chart} onChange={event => setChart(event.target.value as typeof chart)}><option value="revenue">Revenue · 12 months</option><option value="orders">Orders · 12 months</option></select></div><div className={styles.chartTotal}><strong>{chart === "revenue" ? money(metrics.month) : metrics.months.at(-1)!.orders}</strong>{chart === "revenue" && metrics.growth !== null ? <span className={metrics.growth >= 0 ? styles.positive : styles.negative}>{metrics.growth >= 0 ? "↗ +" : "↘ "}{metrics.growth.toFixed(1)}% from last month</span> : <span>{chart === "revenue" ? "Revenue this month" : "Orders this month"}</span>}</div><div className={styles.bars} role="img" aria-label={`${chart} by month: ${metrics.months.map(month => `${month.label} ${chart === "revenue" ? money(month.revenue) : month.orders}`).join(", ")}`}>{metrics.months.map((month, index) => <div className={styles.barColumn} key={month.key} title={`${month.label}: ${chart === "revenue" ? money(month.revenue) : month.orders}`}><div data-current={index === 11} style={{ height: `${month[chart] / max * 125}px` }} /><span>{month.label}</span></div>)}</div><p className={styles.chartNote}>Totals by order date · Pakistan Standard Time</p></section>
          <section className={styles.panel}><div className={styles.panelTitle}><h2>Sales by category</h2></div><div className={styles.donutBody}><div className={styles.donut} style={{ background: segments.length ? `conic-gradient(${segments.join(",")})` : "#eeeef2" }} role="img" aria-label={`Sales by category: ${categories.map(([label, count]) => `${label}: ${count} items`).join(", ") || "No sales yet"}`}><div><small>Total</small><strong>{units.toLocaleString()}</strong><small>Items sold</small></div></div><div className={styles.legend}>{categories.map(([label, count], index) => <div key={label}><i style={{ background: palette[index] }} /><span>{label}</span><b>{(count / units * 100).toFixed(0)}%</b></div>)}{!categories.length && <p className={styles.chartNote}>Your category breakdown will appear after your first paid order.</p>}</div></div></section>
        </div>
        <div className={styles.periods}>{[{ label: "Revenue today", value: metrics.today, note: "Since midnight" }, { label: "Revenue this week", value: metrics.week, note: "Monday to today" }, { label: "Average order value", value: metrics.average, note: "Across paid orders" }].map(item => <div className={styles.period} key={item.label}><span>{item.label}</span><strong>{money(item.value)}</strong><small>{item.note}</small></div>)}</div>
        <section className={styles.panel}><div className={styles.panelTitle}><h2>Recent orders</h2><button onClick={() => navigate("orders")}>View all <ArrowRight size={12} /></button></div>{orders.length ? <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.slice(0, 5).map(order => <tr key={order.id}><td><strong>{order.number}</strong></td><td><div className={styles.person}><span className={styles.avatar}>{order.customerName.slice(0, 2).toUpperCase()}</span><span><strong>{order.customerName}</strong><small>{order.email}</small></span></div></td><td><strong>{money(order.total)}</strong></td><td><span className={styles.status} data-state={order.status}>{order.status}</span></td><td>{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" })}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><ShoppingBag size={27} /><h3>{search ? "No matching orders" : "Ready for your first order"}</h3><p>Your latest orders will appear right here.</p><button className={styles.primary} onClick={() => navigate("orders")}>Manage orders <ArrowRight size={13} /></button></div>}</section>
        <div className={styles.panel}><div className={styles.orderCounts}>{[{ label: "Pending", value: metrics.pending }, { label: "Completed", value: metrics.completed }, { label: "Cancelled", value: metrics.cancelled }, { label: "Returned / refunded", value: metrics.returned }, { label: "New customers", value: metrics.newCustomers }].map(item => <button key={item.label} onClick={() => navigate(item.label === "New customers" ? "customers" : "orders")}><strong>{item.value}</strong><span>{item.label}</span></button>)}</div></div>
        <div className={styles.miniCharts}>{[{ label: "Sales", value: units, values: metrics.months.map(month => month.sales), note: "Items in paid orders" }, { label: "Orders", value: data.orders.length, values: metrics.months.map(month => month.orders), note: "All orders placed" }, { label: "Customer growth", value: data.customers.length, values: metrics.months.map(month => month.customers), note: "New customers per month" }].map(item => <article key={item.label} className={`${styles.panel} ${styles.miniChart}`}><h2>{item.label}</h2><strong>{item.value.toLocaleString()}</strong><small>{item.note}</small><Sparkline values={item.values} label={`${item.label} over the last 12 months: ${item.values.join(", ")}`} /><div><span>{metrics.months[0].label}</span><span>{metrics.months.at(-1)!.label}</span></div></article>)}</div>
      </div>
      <aside className={styles.rail} aria-label="Store highlights">
        <div className={styles.campaign}><img src="/home-models.png" alt="" /><span>MAKE YOUR NEXT MOVE</span><h2>Your next<br />big promotion.</h2><p>Give your latest collection the spotlight it deserves.</p><button onClick={() => navigate("promotions")}>Create a campaign <ArrowUpRight size={12} /></button></div>
        <section className={styles.panel}><div className={styles.panelTitle}><h2>Quick actions</h2></div><div className={styles.quickActions}>{quick.map(action => <button key={action.label} onClick={() => navigate(action.section)}><action.icon size={14} />{action.label}</button>)}</div></section>
        <section className={styles.panel}><div className={styles.panelTitle}><h2>Inventory status (SKUs)</h2><button onClick={() => navigate("inventory")}>View all <ArrowRight size={12} /></button></div><div className={styles.inventory}><div><span><i />In stock (&gt;5)</span><b>{data.inventory.trackedSkus - data.inventory.lowStockSkus - data.inventory.outOfStockSkus}</b></div><div><span><i className={styles.low} />Low stock (1–5)</span><b>{data.inventory.lowStockSkus}</b></div><div><span><i className={styles.out} />Out of stock</span><b>{data.inventory.outOfStockSkus}</b></div></div></section>
        <section className={styles.panel}><div className={styles.panelTitle}><h2>Top selling products</h2><button onClick={() => navigate("products")}>View all <ArrowRight size={12} /></button></div><div className={styles.list}>{topProducts.slice(0, 5).map((product, index) => <div className={styles.listRow} key={product.id}><span className={styles.rank}>{index + 1}</span><img src={product.image || "/tee.png"} alt="" /><div><strong>{product.name}</strong><small>{product.category} · {product.units} sold</small></div><span>{money(product.revenue)}</span></div>)}</div>{!topProducts.length && <p className={styles.empty}>{search ? "No matching products." : "Best sellers will appear as orders come in."}</p>}</section>
        <section className={styles.panel}><div className={styles.panelTitle}><h2>Recent customers</h2><button onClick={() => navigate("customers")}>View all <ArrowRight size={12} /></button></div><div className={styles.list}>{customers.slice(0, 4).map(customer => <div className={styles.listRow} key={customer.id}><div className={styles.avatar}>{customer.name.slice(0, 2).toUpperCase()}</div><div><strong>{customer.name}</strong><small>{customer.email}</small></div><span>{customer.orders} orders</span></div>)}</div>{!customers.length && <p className={styles.empty}>{search ? "No matching customers." : "Your newest customers will appear here."}</p>}</section>
        <section className={styles.panel}><div className={styles.panelTitle}><h2>Most viewed products</h2></div><div className={styles.list}>{viewedProducts.slice(0, 3).map(product => <div className={styles.listRow} key={product.id}><img src={product.images[0] || "/tee.png"} alt="" /><div><strong>{product.name}</strong><small>{product.category}</small></div><span>{product.views} views</span></div>)}</div>{!viewedProducts.length && <p className={styles.empty}>Product views will appear as shoppers explore your catalog.</p>}</section>
      </aside>
    </div>
  </>;
}

function Sparkline({ values, compact, label }: { values: number[]; compact?: boolean; label?: string }) {
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => `${index / Math.max(1, values.length - 1) * 200},${48 - value / max * 42}`).join(" ");
  return <svg className={compact ? styles.spark : undefined} viewBox="0 0 200 52" preserveAspectRatio="none" role={label ? "img" : undefined} aria-label={label} aria-hidden={!label}><polygon points={`0,52 ${points} 200,52`} fill="#fcebed" /><polyline points={points} fill="none" stroke="#e3263b" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}
