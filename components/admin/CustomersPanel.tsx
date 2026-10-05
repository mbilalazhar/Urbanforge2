"use client";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { money, useAdminQuery } from "@/lib/admin/client";
import type { AdminCustomer } from "@/lib/admin/types";
import styles from "./operations.module.css";

const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }) : "—";

export default function CustomersPanel({ search }: { search: string }) {
  const query = useAdminQuery<{ customers: AdminCustomer[] }>("customers", "api", { refetchInterval: 30_000 });
  const [localSearch, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const all = query.data?.customers ?? [];
  const terms = `${search} ${localSearch}`.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const customers = all.filter(customer => (filter === "all" || customer.registered === (filter === "registered")) && terms.every(term => `${customer.name} ${customer.email} ${customer.contact} ${customer.address}`.toLowerCase().includes(term)));

  return <section className={styles.panel}>
    <div className={styles.heading}><div><h2>Customers</h2><p>All registered website users, including those without orders, and guest order contacts.</p></div></div>
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={15} /><input type="search" aria-label="Search customers" placeholder="Search name, email, phone or address…" value={localSearch} onChange={event => setSearch(event.target.value)} /></label>
        <select className={styles.select} aria-label="Filter customers" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All customers</option><option value="registered">Registered users</option><option value="guest">Guest customers</option></select>
        <span className={styles.muted}>{all.filter(customer => customer.registered).length} registered · {customers.length} shown</span>
      </div>
      {query.isPending ? <TableSkeleton /> : query.error ? <div className={styles.empty}><p className={styles.error} role="alert">{query.error.message}</p><button className={styles.secondary} onClick={() => void query.refetch()}>Try again</button></div> : customers.length ? <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr><th>Customer</th><th>Contact details</th><th>Address</th><th>Joined / first order</th><th>Orders</th><th>Last order</th><th>Total spent</th></tr></thead>
          <tbody>{customers.map(customer => <tr key={customer.id}>
            <td><strong>{customer.name}</strong><small>{customer.registered ? "Registered user" : "Guest customer"}</small></td>
            <td><a className={styles.link} href={`mailto:${customer.email}`}>{customer.email}</a><small>{customer.contact || "No phone provided"}</small></td>
            <td className={styles.customerAddress}>{customer.address || "No address provided"}<small>{customer.address ? customer.registered ? "Saved address" : "Order address" : ""}</small></td>
            <td>{date(customer.createdAt)}</td><td>{customer.orders}</td><td>{date(customer.lastOrderAt)}</td><td>{money(customer.spent)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className={styles.empty}><Users size={28} /><h3>{terms.length || filter !== "all" ? "No customers match your filters" : "No customers yet"}</h3><p>Registered users appear here as soon as they sign up.</p></div>}
    </div>
    <p className={styles.muted}>Total spent includes paid orders, excluding cancelled, returned and refunded orders.</p>
  </section>;
}
