"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Download, Mail, Package, Phone, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { useAdminMutation, useAdminQuery } from "@/lib/admin/client";
import { orderStatuses, type AdminOrder, type AdminProduct } from "@/lib/admin/types";
import { canRecordRefund, editableOrderStatuses } from "@/lib/admin/order-workflow";
import styles from "./operations.module.css";

const money = (amount: number) => `Rs. ${amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const date = (value: string) => new Date(value).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function Dialog({ title: heading, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={styles.dialog} onCancel={onClose} aria-label={heading}>
    <div className={styles.dialogHeader}><h3>{heading}</h3><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}

function invoiceHtml(order: AdminOrder) {
  const escape = (value: string | number) => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invoice ${escape(order.number)}</title><style>body{font:14px Arial,sans-serif;max-width:800px;margin:50px auto;padding:25px;color:#222}header{display:flex;justify-content:space-between;border-bottom:2px solid #e3263b;padding-bottom:20px}h1{font-size:24px}h2{font-size:17px}p{line-height:1.7}table{width:100%;border-collapse:collapse;margin:30px 0}td,th{padding:14px 8px;text-align:left;border-bottom:1px solid #ddd}.total{text-align:right;line-height:2}.address{white-space:pre-wrap}@media print{body{margin:0}}</style></head><body><header><h1>UrbanForge</h1><div><h2>Invoice ${escape(order.number)}</h2><p>${escape(date(order.createdAt))}</p></div></header><p><strong>Invoice — preview only</strong><br>This document uses sample data and is not a payment request.</p><h2>Bill to</h2><p class="address">${escape(order.customerName)}<br>${escape(order.email)}<br>${escape(order.phone)}<br>${escape(order.address)}</p><table><thead><tr><th>Item / SKU</th><th>Quantity</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${order.items.map(item => `<tr><td>${escape(item.name)}<br><small>${escape(item.sku)}</small></td><td>${item.quantity}</td><td>${escape(money(item.price))}</td><td>${escape(money(item.price * item.quantity))}</td></tr>`).join("")}</tbody></table><div class="total">Subtotal: ${escape(money(order.subtotal))}<br>Shipping: ${escape(money(order.shipping))}<br>Discount: −${escape(money(order.discount))}<br><strong>Total: ${escape(money(order.total))}</strong><br>Payment: ${escape(title(order.paymentStatus))}</div><p>Thank you for shopping with UrbanForge.</p></body></html>`;
}

function downloadInvoice(order: AdminOrder) {
  const url = URL.createObjectURL(new Blob([invoiceHtml(order)], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `UrbanForge-Invoice-${order.number.replace(/[^a-zA-Z0-9-]/g, "")}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printInvoice(order: AdminOrder) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-10000px;width:1px;height:1px;border:0";
  frame.title = `Invoice ${order.number}`;
  frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 60000); };
  frame.srcdoc = invoiceHtml(order);
  document.body.appendChild(frame);
}

function OrderDetails({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const mutation = useAdminMutation("orders", "api");
  const [feedback, setFeedback] = useState("");
  const [refund, setRefund] = useState(false);
  const [refundNote, setRefundNote] = useState("");

  async function update(body: Record<string, unknown>) {
    setFeedback("");
    try {
      await mutation.mutateAsync({ path: `orders/${order.id}`, method: "PATCH", body });
      setFeedback(body.paymentStatus === "paid" ? "Order updated. Paid orders are included in the customer’s total spent unless cancelled, returned or refunded." : "Order updated.");
      setRefund(false);
      setRefundNote("");
    } catch { /* The mutation error is displayed below. */ }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void update({ status: form.get("status"), paymentStatus: form.get("paymentStatus"), courier: form.get("courier"), trackingNumber: form.get("trackingNumber"), notes: form.get("notes") });
  }

  return <Dialog title={`Order ${order.number}`} onClose={onClose}>
    <div className={styles.actions}><div className={styles.actions}><span className={styles.badge} data-status={order.status}>{order.status}</span><span className={styles.muted}>{date(order.createdAt)}</span></div><div className={styles.actions}><button className={styles.secondary} onClick={() => printInvoice(order)}><Printer size={14} />Print invoice</button><button className={styles.secondary} onClick={() => downloadInvoice(order)}><Download size={14} />Invoice HTML</button></div></div>
    <div className={styles.details}>
      <section><h4>Customer</h4><p>{order.customerName}</p><p>{order.email}</p><p>{order.phone || "No phone provided"}</p><div className={styles.actions}><a className={styles.link} href={`mailto:${encodeURIComponent(order.email)}`}><Mail size={13} /> Email customer</a>{order.phone && <a className={styles.link} href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}><Phone size={13} /> Call</a>}</div></section>
      <section><h4>Delivery address</h4><p>{order.address || "No delivery address provided"}</p></section>
    </div>
    <section><h4 className={styles.sectionTitle}>Order items</h4><div className={styles.lineItems}>{order.items.map((item, index) => <div className={styles.lineItem} key={`${item.productId}-${item.variantId}-${index}`}><div>{item.name}<small>{[item.sku, item.color, item.size].filter(Boolean).join(" · ")} · {item.quantity} × {money(item.price)}</small></div><strong>{money(item.quantity * item.price)}</strong></div>)}</div><div className={styles.summary}><div className={styles.summaryRow}><span>Subtotal</span><span>{money(order.subtotal)}</span></div><div className={styles.summaryRow}><span>Shipping</span><span>{money(order.shipping)}</span></div><div className={styles.summaryRow}><span>Discount</span><span>−{money(order.discount)}</span></div><div className={styles.summaryRow}><span>Total</span><span>{money(order.total)}</span></div></div></section>
    <form className={styles.form} onSubmit={submit} key={order.updatedAt}>
      <h4 className={styles.sectionTitle}>Fulfilment & payment</h4>
      <div className={styles.grid}>
        <label className={styles.field}>Order status<select name="status" className={styles.select} defaultValue={order.status} disabled={mutation.isPending}>{editableOrderStatuses(order).map(status => <option value={status} key={status}>{title(status)}</option>)}</select></label>
        <label className={styles.field}>Payment status<select name="paymentStatus" className={styles.select} defaultValue={order.paymentStatus} disabled={mutation.isPending || order.paymentStatus === "refunded"}><option value="pending" disabled={order.paymentStatus === "paid"}>Pending</option><option value="paid">Paid</option>{order.paymentStatus === "refunded" && <option value="refunded">Refunded</option>}</select>{order.paymentStatus === "refunded" && <input type="hidden" name="paymentStatus" value="refunded" />}</label>
        <label className={styles.field}>Courier<input name="courier" className={styles.input} defaultValue={order.courier} placeholder="e.g. TCS, Leopards, DHL" maxLength={150} /></label>
        <label className={styles.field}>Tracking number<input name="trackingNumber" className={styles.input} defaultValue={order.trackingNumber} placeholder="Enter tracking number" maxLength={150} /></label>
        <label className={`${styles.field} ${styles.full}`}>Internal notes<textarea name="notes" className={styles.textarea} defaultValue={order.notes} placeholder="Delivery instructions, payment reference, or updates…" maxLength={2000} /></label>
      </div>
    {mutation.error && <div role="alert" className={styles.error}>{mutation.error.message}</div>}{feedback && <p role="status" className={styles.muted}>{feedback}</p>}
      <div className={styles.actions}><p className={styles.muted}>Select the current fulfilment stage and save. Cancellation and approved returns restore inventory automatically.</p><button className={styles.button} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save changes"}</button></div>
    </form>
    <section className={styles.form}><h4 className={styles.sectionTitle}>Returns & refunds</h4><p className={styles.muted}>Return status: {title(order.returnStatus)}. Approve a return after delivery; mark the order returned once items are received.</p><div className={styles.actions}><div className={styles.actions}>
      {order.status === "delivered" && order.returnStatus !== "requested" && order.returnStatus !== "approved" && <button className={styles.secondary} disabled={mutation.isPending} onClick={() => void update({ returnStatus: "requested" })}>Record return request</button>}
      {order.returnStatus === "requested" && <><button className={styles.secondary} disabled={mutation.isPending || order.status !== "delivered"} onClick={() => void update({ returnStatus: "approved" })}>Approve return</button><button className={styles.danger} disabled={mutation.isPending} onClick={() => void update({ returnStatus: "rejected" })}>Reject return</button></>}
    </div>{canRecordRefund(order) && <button className={styles.danger} onClick={() => setRefund(!refund)} disabled={mutation.isPending}>Record manual refund</button>}</div>
      {refund && <form className={styles.form} onSubmit={event => { event.preventDefault(); void update({ status: "refunded", paymentStatus: "refunded", notes: [order.notes, `Manual refund: ${refundNote.trim()}`].filter(Boolean).join("\n") }); }}><div className={styles.notice}>Record a refund you have already completed outside the store. This action records the reference; it does not transfer money.</div><label className={styles.field}>Refund reference and reason<textarea required minLength={3} maxLength={2000} className={styles.textarea} value={refundNote} onChange={event => setRefundNote(event.target.value)} placeholder="Refund transaction reference and reason" /></label><div className={styles.dialogFooter}><button type="button" className={styles.secondary} onClick={() => setRefund(false)}>Cancel</button><button className={styles.danger} disabled={mutation.isPending}>Confirm manual refund · {money(order.total)}</button></div></form>}
    </section>
  </Dialog>;
}

type DraftItem = { key: number; productId: string; variantId: string; quantity: number };

function CreateOrder({ products, onClose }: { products: AdminProduct[]; onClose: () => void }) {
  const mutation = useAdminMutation("orders", "api");
  const counter = useRef(1);
  const [items, setItems] = useState<DraftItem[]>([{ key: 0, productId: "", variantId: "", quantity: 1 }]);
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");
  function patchItem(key: number, patch: Partial<DraftItem>) { setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item)); }
  const subtotal = items.reduce((sum, item) => { const product = products.find(product => product.id === item.productId); return sum + (product ? product.salePrice ?? product.price : 0) * item.quantity; }, 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (items.some(item => !item.productId || (products.find(product => product.id === item.productId)?.variants.length && !item.variantId))) { setError("Choose a product and its variant for every line item."); return; }
    const form = new FormData(event.currentTarget);
    try { await mutation.mutateAsync({ method: "POST", body: { customerName: form.get("customerName"), email: form.get("email"), phone: form.get("phone"), address: form.get("address"), notes: form.get("notes"), paymentStatus: form.get("paymentStatus"), shipping, discount, items: items.map(({ productId, variantId, quantity }) => ({ productId, ...(variantId ? { variantId } : {}), quantity })) } }); onClose(); } catch { /* Shown below. */ }
  }
  return <Dialog title="Create order" onClose={onClose}><form className={styles.form} onSubmit={submit}>
    <p className={styles.muted}>Create a phone, social, or in-store order. Prices and stock are checked when the order is saved.</p>
    <div className={styles.grid}><label className={styles.field}>Customer name<input required name="customerName" autoComplete="name" className={styles.input} maxLength={150} /></label><label className={styles.field}>Email address<input required name="email" type="email" autoComplete="email" className={styles.input} /></label><label className={styles.field}>Phone number<input required name="phone" type="tel" autoComplete="tel" className={styles.input} /></label><label className={styles.field}>Payment status<select name="paymentStatus" className={styles.select}><option value="pending">Pending</option><option value="paid">Paid manually</option></select></label><label className={`${styles.field} ${styles.full}`}>Delivery address<textarea required name="address" autoComplete="street-address" className={styles.textarea} /></label></div>
    <h4 className={styles.sectionTitle}>Products</h4>
    {items.map(item => { const product = products.find(product => product.id === item.productId); return <div className={styles.productRow} key={item.key}><label className={styles.field}>Product<select required className={styles.select} value={item.productId} onChange={event => patchItem(item.key, { productId: event.target.value, variantId: "" })}><option value="">Select a product</option>{products.filter(product => product.status === "active").map(product => <option key={product.id} value={product.id}>{product.name} · {money(product.salePrice ?? product.price)}</option>)}</select></label><label className={styles.field}>Variant<select className={styles.select} required={!!product?.variants.length} disabled={!product?.variants.length} value={item.variantId} onChange={event => patchItem(item.key, { variantId: event.target.value })}><option value="">{product?.variants.length ? "Select variant" : "Standard"}</option>{product?.variants.map(variant => <option value={variant.id} key={variant.id}>{[variant.color, variant.size].filter(Boolean).join(" / ") || variant.sku} · {variant.stock} left</option>)}</select></label><label className={styles.field}>Qty<input type="number" required min={1} max={9999} className={styles.input} value={item.quantity} onChange={event => patchItem(item.key, { quantity: Number(event.target.value) })} /></label><button type="button" className={styles.iconButton} disabled={items.length === 1} aria-label="Remove product" onClick={() => setItems(items.filter(row => row.key !== item.key))}><Trash2 size={14} /></button></div>; })}
    <div><button type="button" className={styles.secondary} onClick={() => setItems([...items, { key: counter.current++, productId: "", variantId: "", quantity: 1 }])}><Plus size={14} />Add item</button></div>
    <div className={styles.grid}><label className={styles.field}>Shipping (Rs.)<input type="number" min={0} step="0.01" required className={styles.input} value={shipping} onChange={event => setShipping(Number(event.target.value))} /></label><label className={styles.field}>Discount (Rs.)<input type="number" min={0} max={subtotal} step="0.01" required className={styles.input} value={discount} onChange={event => setDiscount(Number(event.target.value))} /></label><label className={`${styles.field} ${styles.full}`}>Internal notes<textarea name="notes" className={styles.textarea} maxLength={2000} /></label></div>
    <div className={styles.summary}><div className={styles.summaryRow}><span>Subtotal</span><span>{money(subtotal)}</span></div><div className={styles.summaryRow}><span>Order total</span><span>{money(Math.max(0, subtotal + shipping - discount))}</span></div></div>
    {(error || mutation.error) && <p role="alert" className={styles.error}>{error || mutation.error?.message}</p>}
    <div className={styles.dialogFooter}><button type="button" className={styles.secondary} onClick={onClose}>Cancel</button><button className={styles.button} disabled={mutation.isPending || !products.length}>{mutation.isPending ? "Creating…" : "Create order"}</button></div>
  </form></Dialog>;
}

export default function OrdersPanel({ search = "" }: { search?: string }) {
  const query = useAdminQuery<{ orders: AdminOrder[] }>("orders", "api", { refetchInterval: 30_000 });
  const products = useAdminQuery<{ products: AdminProduct[] }>("products", "api");
  const [localSearch, setLocalSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const terms = `${search} ${localSearch}`.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const orders = (query.data?.orders ?? []).filter(order => (status === "all" || order.status === status) && terms.every(term => `${order.number} ${order.customerName} ${order.email} ${order.phone} ${order.trackingNumber}`.toLowerCase().includes(term)));
  const selectedOrder = query.data?.orders.find(order => order.id === selected);
  return <section className={styles.panel}>
    <div className={styles.heading}><div><h2>Orders</h2><p>Every order, from first confirmation to final delivery.</p></div><button className={styles.button} onClick={() => setCreating(true)} disabled={!products.data}><Plus size={15} />Create order</button></div>
    {products.error && <div className={styles.error} role="alert">Product catalog could not be loaded: {products.error.message} <button className={styles.textButton} onClick={() => void products.refetch()}>Retry</button></div>}
    <div className={styles.card}><div className={styles.toolbar}><label className={styles.search}><Search size={15} /><input aria-label="Search orders" placeholder="Search order, customer, tracking…" value={localSearch} onChange={event => setLocalSearch(event.target.value)} /></label><select aria-label="Filter order status" className={styles.select} value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{orderStatuses.map(status => <option value={status} key={status}>{title(status)}</option>)}</select><span className={styles.muted}>{orders.length} orders</span></div>
      {query.isPending ? <div className={styles.loading} role="status">Loading orders…</div> : query.error ? <div className={styles.empty}><p className={styles.error} role="alert">{query.error.message}</p><button className={styles.secondary} onClick={() => void query.refetch()}>Try again</button></div> : orders.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><button className={styles.textButton} onClick={() => setSelected(order.id)}>{order.number}</button></td><td>{order.customerName}<small>{order.email}</small></td><td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td><strong>{money(order.total)}</strong></td><td><span className={styles.badge} data-status={order.paymentStatus}>{order.paymentStatus}</span></td><td><span className={styles.badge} data-status={order.status}>{order.status}</span></td><td>{date(order.createdAt)}</td><td><button className={styles.secondary} aria-label={`View order ${order.number}`} onClick={() => setSelected(order.id)}>View</button></td></tr>)}</tbody></table></div> : <div className={styles.empty}><Package size={32} strokeWidth={1.4} /><h3>{terms.length || status !== "all" ? "No matching orders" : "Your orders start here"}</h3><p>{terms.length || status !== "all" ? "Try another search or order status." : "Create your first order to track sales, delivery, and customer activity."}</p></div>}
    </div>
    {selectedOrder && <OrderDetails order={selectedOrder} onClose={() => setSelected(null)} />}
    {creating && <CreateOrder products={products.data?.products ?? []} onClose={() => setCreating(false)} />}
  </section>;
}
