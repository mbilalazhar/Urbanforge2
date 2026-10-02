"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, Hourglass, LogOut, Pencil, Phone, Truck, X } from "lucide-react";
import { accountOrder, money, orderTotal, orderQuantity, type Order, type OrderItem } from "./account-data";
import type { UserProfile } from "@/lib/user-profile";
import { useProfile, useSaveProfile } from "@/lib/account/client";
import WishlistContents from "@/components/wishlist/WishlistContents";
import { useCustomerOrders } from "@/lib/checkout/client";
import SavedAddress from "./SavedAddress";
import styles from "./account.module.css";

const tabs = ["My Orders", "Addresses", "Wishlist", "Settings"] as const;
type Tab = typeof tabs[number];

function ProductImage({ item }: { item: OrderItem }) {
  return <span className={styles.productImage}><Image src={item.image} alt={item.name} fill unoptimized sizes="80px" /></span>;
}

function Status({ status }: { status: Order["status"] }) {
  const Icon = status === "Cancelled" ? X : status === "Processing" ? Hourglass : Truck;
  return <span className={`${styles.status} ${styles[status.toLowerCase()]}`}><Icon size={14} strokeWidth={1.7} />{status}</span>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="account-dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialogBody}>
      <div className={styles.dialogHeading}><h2 id="account-dialog-title">{title}</h2><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
      {children}
    </div>
  </dialog>;
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: (order: Order) => void }) {
  return <article className={`${styles.orderCard} ${order.items.length === 1 ? styles.singleItem : ""}`}>
    <div className={styles.orderImages}>{order.items.slice(0, 3).map((item, index) => <ProductImage key={`${item.name}-${index}`} item={item} />)}{order.items.length > 3 && <span className={styles.moreItems}>+{order.items.length - 3}</span>}</div>
    <div className={styles.orderInfo}><h3>Order #{order.id}</h3><p><span>{order.date}</span><span>{orderQuantity(order)} {orderQuantity(order) === 1 ? "item" : "items"}</span><span>{money(orderTotal(order))}</span></p></div>
    <div className={styles.orderStatus}><Status status={order.status} /><p>{order.update}</p></div>
    <button type="button" className={styles.orderAction} onClick={() => onOpen(order)} aria-label={`${order.status === "Shipped" ? "Track" : "View"} order ${order.id}`}><span>{order.status === "Shipped" ? "Track Order" : "View Details"}</span><ChevronRight size={18} /></button>
  </article>;
}

export default function ProfilePage({ initialProfile, onLogout, loggingOut, error }: { initialProfile: UserProfile; onLogout: () => void; loggingOut: boolean; error?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("My Orders");
  const profileQuery = useProfile(initialProfile);
  const profile = profileQuery.data;
  const save = useSaveProfile(profile.id);
  const [editing, setEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [notice, setNotice] = useState("");
  const preferences = profile.preferences;
  const historyRef = useRef<HTMLElement>(null);
  const ordersQuery = useCustomerOrders(profile.id);
  const orders = (ordersQuery.data ?? []).map(accountOrder);
  const currentOrders = orders.filter(order => !order.past), pastOrders = orders.filter(order => order.past);
  const hasOrders = currentOrders.length > 0 || pastOrders.length > 0;

  function revealHistory() {
    setShowPast(true);
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className={styles.page}>
    <div className={styles.container}>
      <div className={styles.mobileHeading}><h1>My account</h1><p>Manage your orders and account details.</p></div>
      <section className={styles.profile} aria-label="Your profile">
        <Image className={styles.cover} src="/hero-bg.png" alt="" fill sizes="(max-width: 767px) 1px, 1240px" priority />
        <Image className={styles.coverModel} src="/MenSection.png" alt="" width={1086} height={1448} priority />
        <div className={styles.identity}>
          <div className={styles.avatar}><Image src="/MenSection.png" alt="Profile avatar" fill sizes="(max-width: 767px) 64px, 104px" priority /></div>
          <div className={styles.profileDetails}><h2>{profile.name}</h2><p>{profile.email}</p><p className={styles.phone}><Phone size={13} />{profile.contact || "Add a contact number"}</p></div>
        </div>
        <button type="button" className={styles.editProfile} onClick={() => { save.reset(); setEditing(true); }} aria-label="Edit profile"><Pencil size={14} /><span>Edit Profile</span><ChevronRight className={styles.mobileChevron} size={20} /></button>
      </section>

      <nav className={styles.tabs} aria-label="Account sections">{tabs.map(tab => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => { setActiveTab(tab); setNotice(""); }}><span className={styles.fullTab}>{tab}</span><span className={styles.shortTab}>{tab === "My Orders" ? "Orders" : tab}</span></button>)}</nav>

      {activeTab === "My Orders" && <div className={styles.orders}>
        {ordersQuery.isPending ? <div className={styles.emptyState} role="status">Loading your orders…</div> : ordersQuery.isError ? <div className={styles.emptyState} role="alert"><h3>Unable to load your orders</h3><p>{ordersQuery.error.message}</p><button className={styles.outlineButton} onClick={() => void ordersQuery.refetch()}>Try again</button></div> : !hasOrders ? <div className={styles.emptyState}><Truck size={30} /><h3>No orders yet</h3><p>Your orders will appear here after you make a purchase.</p><Link href="/search">Explore the collection <ArrowRight size={16} /></Link></div> : <>
        <section aria-labelledby="current-orders-title">
          <div className={styles.sectionHeading}><div><h2 id="current-orders-title">{showAll ? "All Orders" : "Current Orders"}</h2><p>Track, return or buy again from your recent orders.</p></div><button type="button" className={styles.textButton} onClick={() => setShowAll(!showAll)}>{showAll ? "Show Recent" : <><span className={styles.desktopLabel}>View All Orders</span><span className={styles.mobileLabel}>View All</span></>}<ArrowRight size={14} /></button></div>
          <div className={styles.orderList}>{!showAll && !currentOrders.length && <div className={styles.emptyState}><Truck size={30} /><h3>No current orders</h3><p>Your active orders will appear here.</p></div>}{(showAll ? [...currentOrders, ...pastOrders] : currentOrders).map(order => <OrderCard key={order.id} order={order} onOpen={setSelectedOrder} />)}</div>
        </section>
        {!showAll && <section ref={historyRef} className={`${styles.pastOrders} ${showPast ? styles.expandedHistory : ""}`} aria-labelledby="past-orders-title">
          <div className={styles.sectionHeading}><div><h2 id="past-orders-title">Past Orders</h2><p>Your previous purchases.</p></div><button type="button" className={styles.textButton} onClick={() => setShowPast(!showPast)}>{showPast ? "Show Less" : "View All"}<ArrowRight size={14} /></button></div>
          {!pastOrders.length && <div className={styles.emptyState}><Truck size={30} /><h3>No past orders yet</h3><p>Your completed orders will appear here.</p></div>}
          <div className={styles.pastGrid}>{pastOrders.slice(0, showPast ? pastOrders.length : 4).map(order => <button type="button" className={styles.pastCard} key={order.id} onClick={() => setSelectedOrder(order)} aria-label={`View order ${order.id}`}><ProductImage item={order.items[0]} /><span><strong>Order #{order.id}</strong><small>{order.date} <i>·</i> {orderQuantity(order)} {orderQuantity(order) === 1 ? "item" : "items"}</small><small>{money(orderTotal(order))}</small></span><ChevronRight size={20} /></button>)}</div>
        </section>}
        {!showAll && !showPast && <button type="button" className={styles.mobilePastButton} onClick={revealHistory}>View Past Orders <ArrowRight size={16} /></button>}
        </>}
      </div>}

      {activeTab === "Addresses" && <SavedAddress profile={profile} pending={save.isPending} save={async defaultAddress => { await save.mutateAsync({ defaultAddress }); setNotice(defaultAddress ? "Delivery address saved." : "Delivery address removed."); }} />}

      {activeTab === "Wishlist" && <section className={styles.tabContent}><div className={styles.sectionHeading}><div><h2>Your Wishlist</h2><p>The pieces you have your eye on.</p></div><Link href="/wishlist">View wishlist <ArrowRight size={14} /></Link></div><WishlistContents /></section>}
      {activeTab === "Settings" && <section className={styles.tabContent}><div className={styles.sectionHeading}><div><h2>Account Settings</h2><p>Make yourself at home.</p></div></div><div className={styles.settingsCard}><div className={styles.settingRow}><div><h3>Profile details</h3><p>Update your name and contact information.</p></div><button type="button" className={styles.outlineButton} onClick={() => { save.reset(); setEditing(true); }}>Edit Profile</button></div><label className={styles.settingRow}><span><strong>Order updates</strong><small>Keep me posted on my deliveries.</small></span><input type="checkbox" checked={preferences.orders} disabled={save.isPending} onChange={event => save.mutate({ preferences: { ...preferences, orders: event.target.checked } }, { onSuccess: () => setNotice("Preferences saved.") })} /></label><label className={styles.settingRow}><span><strong>New drops & offers</strong><small>Send me the latest from UrbanForge.</small></span><input type="checkbox" checked={preferences.news} disabled={save.isPending} onChange={event => save.mutate({ preferences: { ...preferences, news: event.target.checked } }, { onSuccess: () => setNotice("Preferences saved.") })} /></label><div className={styles.settingRow}><div><h3>Sign out</h3><p>See you on your next visit.</p></div><button type="button" className={styles.outlineButton} onClick={onLogout} disabled={loggingOut}><LogOut size={15} />{loggingOut ? "Logging out…" : "Log Out"}</button></div></div><p className={styles.demoNote}>Your profile and preferences are saved to your account.</p></section>}
      <p className={styles.feedback} role="status">{error || profileQuery.error?.message || save.error?.message || notice}</p>
    </div>

    {editing && <Modal title="Edit Profile" onClose={() => { if (!save.isPending) setEditing(false); }}><form className={styles.editForm} aria-busy={save.isPending} onSubmit={async event => {
      event.preventDefault(); if (save.isPending) return;
      const data = new FormData(event.currentTarget);
      try {
        await save.mutateAsync({ name: String(data.get("name") ?? "").trim(), contact: String(data.get("contact") ?? "").trim() });
        setNotice("Profile saved."); setEditing(false);
      } catch { /* The mutation error is displayed below without discarding the form. */ }
    }}><p>Your details are saved to your account.</p><label>Full name<input name="name" autoComplete="name" defaultValue={profile.name} required maxLength={100} disabled={save.isPending} /></label><label>Sign-in email<input type="email" value={profile.email} readOnly /></label><label>Contact number (optional)<input name="contact" type="tel" autoComplete="tel" defaultValue={profile.contact} maxLength={30} disabled={save.isPending} /></label>{save.error && <p role="alert">{save.error.message}</p>}<div className={styles.formActions}><button className={styles.outlineButton} type="button" disabled={save.isPending} onClick={() => setEditing(false)}>Cancel</button><button className={styles.primaryButton} type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Changes"}</button></div></form></Modal>}
    {selectedOrder && <Modal title={`Order #${selectedOrder.id}`} onClose={() => setSelectedOrder(null)}><div className={styles.orderSummary}><Status status={selectedOrder.status} /><p>{selectedOrder.update}</p><p>Placed on {selectedOrder.date}</p></div>{selectedOrder.status === "Shipped" && <ol className={styles.tracking}><li><Check size={16} />Order confirmed</li><li><Check size={16} />Packed & dispatched</li><li><Truck size={16} />On its way to you</li></ol>}<div className={styles.modalItems}>{selectedOrder.items.map((item, index) => <div key={`${item.name}-${index}`}><ProductImage item={item} /><span>{item.name}<small>Quantity: {item.quantity}{item.details ? ` · ${item.details}` : ""}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className={styles.total}><span>Order total</span><strong>{money(orderTotal(selectedOrder))}</strong></div><p className={styles.demoNote}>Shipping: {money(selectedOrder.shipping)} · Discount: {money(selectedOrder.discount)}<br />Payment: {selectedOrder.paymentStatus}<br />Delivery: {selectedOrder.address}</p></Modal>}
  </main>;
}
