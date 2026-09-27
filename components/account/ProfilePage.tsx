"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, CreditCard, Heart, Hourglass, LogOut, MapPin, Pencil, Phone, Truck, X } from "lucide-react";
import { currentOrders, initialProfile, money, orderTotal, pastOrders, wishlistItems, type Order, type OrderItem } from "./account-data";
import styles from "./account.module.css";

const tabs = ["My Orders", "Addresses", "Payment Methods", "Wishlist", "Settings"] as const;
type Tab = typeof tabs[number];

function ProductImage({ item }: { item: OrderItem }) {
  return <span className={`${styles.productImage} ${styles[item.crop]}`}><Image src={item.image} alt={item.name} fill sizes="80px" /></span>;
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
    <div className={styles.orderInfo}><h3>Order #{order.id}</h3><p><span>{order.date}</span><span>{order.items.length} {order.items.length === 1 ? "item" : "items"}</span><span>{money(orderTotal(order))}</span></p></div>
    <div className={styles.orderStatus}><Status status={order.status} /><p>{order.update}</p></div>
    <button type="button" className={styles.orderAction} onClick={() => onOpen(order)} aria-label={`${order.status === "Shipped" ? "Track" : "View"} order ${order.id}`}><span>{order.status === "Shipped" ? "Track Order" : "View Details"}</span><ChevronRight size={18} /></button>
  </article>;
}

export default function ProfilePage({ onLogout, loggingOut, error }: { onLogout: () => void; loggingOut: boolean; error?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("My Orders");
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [wishlist, setWishlist] = useState(wishlistItems);
  const [notice, setNotice] = useState("");
  const [preferences, setPreferences] = useState({ orders: true, news: false });
  const historyRef = useRef<HTMLElement>(null);

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
          <div className={styles.profileDetails}><h2>{profile.name}</h2><p>{profile.email}</p><p className={styles.phone}><Phone size={13} />{profile.phone}</p></div>
        </div>
        <button type="button" className={styles.editProfile} onClick={() => setEditing(true)} aria-label="Edit profile"><Pencil size={14} /><span>Edit Profile</span><ChevronRight className={styles.mobileChevron} size={20} /></button>
      </section>

      <nav className={styles.tabs} aria-label="Account sections">{tabs.map(tab => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => { setActiveTab(tab); setNotice(""); }}><span className={styles.fullTab}>{tab}</span><span className={styles.shortTab}>{tab === "My Orders" ? "Orders" : tab === "Payment Methods" ? "Payments" : tab}</span></button>)}</nav>

      {activeTab === "My Orders" && <div className={styles.orders}>
        <section aria-labelledby="current-orders-title">
          <div className={styles.sectionHeading}><div><h2 id="current-orders-title">{showAll ? "All Orders" : "Current Orders"}</h2><p>Track, return or buy again from your recent orders.</p></div><button type="button" className={styles.textButton} onClick={() => setShowAll(!showAll)}>{showAll ? "Show Recent" : <><span className={styles.desktopLabel}>View All Orders</span><span className={styles.mobileLabel}>View All</span></>}<ArrowRight size={14} /></button></div>
          <div className={styles.orderList}>{(showAll ? [...currentOrders, ...pastOrders] : currentOrders).map(order => <OrderCard key={order.id} order={order} onOpen={setSelectedOrder} />)}</div>
        </section>
        {!showAll && <section ref={historyRef} className={`${styles.pastOrders} ${showPast ? styles.expandedHistory : ""}`} aria-labelledby="past-orders-title">
          <div className={styles.sectionHeading}><div><h2 id="past-orders-title">Past Orders</h2><p>Your previous purchases.</p></div><button type="button" className={styles.textButton} onClick={() => setShowPast(!showPast)}>{showPast ? "Show Less" : "View All"}<ArrowRight size={14} /></button></div>
          <div className={styles.pastGrid}>{pastOrders.slice(0, showPast ? pastOrders.length : 4).map(order => <button type="button" className={styles.pastCard} key={order.id} onClick={() => setSelectedOrder(order)} aria-label={`View order ${order.id}`}><ProductImage item={order.items[0]} /><span><strong>Order #{order.id}</strong><small>{order.date} <i>·</i> {order.items.length} {order.items.length === 1 ? "item" : "items"}</small><small>{money(orderTotal(order))}</small></span><ChevronRight size={20} /></button>)}</div>
        </section>}
        {!showAll && !showPast && <button type="button" className={styles.mobilePastButton} onClick={revealHistory}>View Past Orders <ArrowRight size={16} /></button>}
      </div>}

      {activeTab === "Addresses" && <section className={styles.tabContent}><div className={styles.sectionHeading}><div><h2>Saved Addresses</h2><p>Your delivery details, all in one place.</p></div></div><article className={styles.detailCard}><MapPin size={22} /><div><div className={styles.cardTitle}><h3>Home</h3><span className={styles.defaultBadge}>Default</span></div><strong>{profile.name}</strong><p>House 24, Street 8, DHA Phase 6<br />Lahore, Punjab 54000<br />Pakistan</p><p>{profile.phone}</p></div></article><p className={styles.demoNote}>Sample address for this preview.</p></section>}
      {activeTab === "Payment Methods" && <section className={styles.tabContent}><div className={styles.sectionHeading}><div><h2>Payment Methods</h2><p>A little less time at checkout.</p></div></div><article className={styles.detailCard}><CreditCard size={24} /><div><div className={styles.cardTitle}><h3>Visa ending in 4242</h3><span className={styles.defaultBadge}>Default</span></div><p>{profile.name}</p><p>Expires 12/2028</p></div></article><p className={styles.demoNote}>Sample payment method. No payment information is stored.</p></section>}
      {activeTab === "Wishlist" && <section className={styles.tabContent}><div className={styles.sectionHeading}><div><h2>Your Wishlist</h2><p>The pieces you have your eye on.</p></div><span className={styles.itemCount}>{wishlist.length} items</span></div>{wishlist.length ? <div className={styles.wishlist}>{wishlist.map(item => <article key={item.name} className={styles.wishlistCard}><ProductImage item={item} /><div><h3>{item.name}</h3><p>{money(item.price)}</p><Link href="/search">Explore the collection <ArrowRight size={14} /></Link></div><button type="button" className={styles.iconButton} onClick={() => setWishlist(wishlist.filter(saved => saved.name !== item.name))} aria-label={`Remove ${item.name} from wishlist`}><Heart size={19} fill="currentColor" /></button></article>)}</div> : <div className={styles.emptyState}><Heart size={30} /><h3>Your wishlist is ready for a fresh start.</h3><Link href="/search">Explore the collection <ArrowRight size={16} /></Link></div>}</section>}
      {activeTab === "Settings" && <section className={styles.tabContent}><div className={styles.sectionHeading}><div><h2>Account Settings</h2><p>Make yourself at home.</p></div></div><div className={styles.settingsCard}><div className={styles.settingRow}><div><h3>Profile details</h3><p>Update your name and contact information.</p></div><button type="button" className={styles.outlineButton} onClick={() => setEditing(true)}>Edit Profile</button></div><label className={styles.settingRow}><span><strong>Order updates</strong><small>Keep me posted on my deliveries.</small></span><input type="checkbox" checked={preferences.orders} onChange={event => { setPreferences({ ...preferences, orders: event.target.checked }); setNotice("Preferences updated for this preview."); }} /></label><label className={styles.settingRow}><span><strong>New drops & offers</strong><small>Send me the latest from UrbanForge.</small></span><input type="checkbox" checked={preferences.news} onChange={event => { setPreferences({ ...preferences, news: event.target.checked }); setNotice("Preferences updated for this preview."); }} /></label><div className={styles.settingRow}><div><h3>Sign out</h3><p>See you on your next visit.</p></div><button type="button" className={styles.outlineButton} onClick={onLogout} disabled={loggingOut}><LogOut size={15} />{loggingOut ? "Logging out…" : "Log Out"}</button></div></div><p className={styles.demoNote}>Profile and preference changes last for this preview only.</p></section>}
      <p className={styles.feedback} role="status">{error || notice}</p>
    </div>

    {editing && <Modal title="Edit Profile" onClose={() => setEditing(false)}><form className={styles.editForm} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name")).trim(); if (!name) return; setProfile({ name, email: String(data.get("email")).trim(), phone: String(data.get("phone")).trim() }); setNotice("Profile updated for this preview."); setEditing(false); }}><p>Make it yours. Changes apply to this preview only.</p><label>Full name<input name="name" defaultValue={profile.name} required maxLength={100} /></label><label>Email address<input name="email" type="email" defaultValue={profile.email} required /></label><label>Phone number<input name="phone" type="tel" defaultValue={profile.phone} required maxLength={30} /></label><div className={styles.formActions}><button className={styles.outlineButton} type="button" onClick={() => setEditing(false)}>Cancel</button><button className={styles.primaryButton} type="submit">Save Changes</button></div></form></Modal>}
    {selectedOrder && <Modal title={`Order #${selectedOrder.id}`} onClose={() => setSelectedOrder(null)}><div className={styles.orderSummary}><Status status={selectedOrder.status} /><p>{selectedOrder.update}</p><p>Placed on {selectedOrder.date}</p></div>{selectedOrder.status === "Shipped" && <ol className={styles.tracking}><li><Check size={16} />Order confirmed</li><li><Check size={16} />Packed & dispatched</li><li><Truck size={16} />On its way to you</li></ol>}<div className={styles.modalItems}>{selectedOrder.items.map((item, index) => <div key={`${item.name}-${index}`}><ProductImage item={item} /><span>{item.name}<small>Quantity: 1</small></span><strong>{money(item.price)}</strong></div>)}</div><div className={styles.total}><span>Order total</span><strong>{money(orderTotal(selectedOrder))}</strong></div><p className={styles.demoNote}>Sample order details for this preview.</p></Modal>}
  </main>;
}
