"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, Home, LockKeyhole, MapPin, Minus, Package, Plus, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { useCart } from "@/components/cart/CartProvider";
import type { UserProfile } from "@/lib/user-profile";
import { formatProductPrice as money } from "@/lib/products";
import { CheckoutRequestError, cartSelection, checkoutDefaults, checkoutRequest, checkoutRequestId } from "@/lib/checkout/client";
import { shippingCost, type CheckoutItem, type CheckoutQuote, type CustomerOrder, type DeliveryMethod, type PlaceOrderInput } from "@/lib/checkout/types";
import styles from "./checkout.module.css";

function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <main className={styles.page}><div className={styles.empty}><ShoppingBag size={40} strokeWidth={1.3} /><h1>{title}</h1>{children}<Link className={styles.primary} href="/search">Explore the collection <ArrowRight size={16} /></Link></div></main>;
}
export default function CheckoutPage({ direct, selection }: { direct: boolean; selection: CheckoutItem | null }) {
  const session = useSession("user");
  const account = session.data?.account;
  const profile = useQuery({ queryKey: ["user-profile", account?.id], enabled: !!account, retry: false, staleTime: 0,
    queryFn: async ({ signal }) => {
      const data = await checkoutRequest<{ profile: UserProfile }>("/api/account/profile", undefined, signal);
      if (data.profile.id !== account?.id) throw new Error("Your account changed. Please refresh checkout.");
      return data.profile;
    },
  });
  if (direct && !selection) return <Empty title="This checkout link is invalid"><p>Open the product and choose your options again.</p></Empty>;
  if (session.isPending || (account && profile.isPending)) return <main className={styles.page}><div className={styles.empty} role="status">Loading checkout…</div></main>;
  if (session.isError) return <main className={styles.page}><div className={styles.empty} role="alert"><h1>Unable to load checkout</h1><p>{session.error.message}</p><button className={styles.primary} onClick={() => void session.refetch()}>Try again</button></div></main>;
  return <CheckoutForm key={`${account?.id ?? "guest"}:${JSON.stringify(selection)}`} accountId={account?.id ?? null} profile={profile.data ?? (account ? { ...account, contact: "", defaultAddress: null } : undefined)} profileError={profile.error?.message} direct={direct} selection={selection} />;
}
function SuccessModal({ order, accountId, onClose }: { order: CustomerOrder; accountId: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby="order-success-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button autoFocus className={styles.close} type="button" onClick={onClose} aria-label="Close order confirmation"><X size={20} /></button>
    <CheckCircle2 className={styles.successIcon} size={54} strokeWidth={1.4} /><p className={styles.eyebrow}>Thank you for shopping with us</p><h2 id="order-success-title">Your order is placed!</h2><p>Order <strong>{order.number}</strong> has been received.</p><div className={styles.receipt}><span>Pay on delivery</span><strong>{money(order.total)}</strong></div><p>We’ll deliver to {order.shippingAddress?.city}. Keep your order number for reference.</p>
    {accountId && <Link className={styles.primary} href="/account">View my orders <ArrowRight size={16} /></Link>}<Link className={styles.secondary} href="/search">Continue shopping</Link>
  </dialog>;
}
function CheckoutForm({ accountId, profile, profileError, direct, selection }: { accountId: string | null; profile?: Pick<UserProfile, "name" | "email" | "contact" | "defaultAddress">; profileError?: string; direct: boolean; selection: CheckoutItem | null }) {
  const cart = useCart(), client = useQueryClient();
  const [form, setForm] = useState(() => checkoutDefaults(profile));
  const [single, setSingle] = useState(selection);
  const [deliveryMethod, setDelivery] = useState<DeliveryMethod>("standard");
  const [saveAddress, setSaveAddress] = useState(false), [code, setCode] = useState(""), [couponCode, setCoupon] = useState("");
  const [submitting, setSubmitting] = useState(false), [error, setError] = useState("");
  const [order, setOrder] = useState<CustomerOrder | null>(null), [showSuccess, setShowSuccess] = useState(false);
  const locked = useRef(false), alive = useRef(true), attempt = useRef<{ payload: string; requestId: string } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const items = direct ? (single ? [single] : []) : cart.items.map(cartSelection);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact.email.trim()) ? form.contact.email.trim().toLowerCase() : "";
  const ready = direct || (!cart.isLoading && !cart.error);
  const quote = useQuery({ queryKey: ["checkout-quote", accountId, items, deliveryMethod, couponCode, couponCode ? email : ""],
    queryFn: ({ signal }) => checkoutRequest<{ quote: CheckoutQuote }>("/api/checkout/quote", { items, deliveryMethod, couponCode, email: couponCode ? email : "" }, signal),
    enabled: ready && items.length > 0 && !order, retry: false, staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const summary = quote.data?.quote;
  function contact(name: keyof typeof form.contact, value: string) { setForm(current => ({ ...current, contact: { ...current.contact, [name]: value } })); }
  function address(name: keyof typeof form.address, value: string) { setForm(current => ({ ...current, address: { ...current.address, [name]: value } })); }
  function quantity(index: number, change: number) {
    if (submitting) return;
    if (direct) setSingle(current => current ? { ...current, quantity: Math.max(1, Math.min(99, current.quantity + change)) } : current);
    else cart.changeQuantity(cart.items[index].id, change);
  }
  function remove(index: number) { if (!submitting) { if (direct) setSingle(null); else cart.removeItem(cart.items[index].id); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !summary || quote.isFetching || quote.isError || order) return;
    locked.current = true; setSubmitting(true); setError("");
    const purchased = cart.items.map(({ id, quantity }) => ({ id, quantity }));
    const payload: Omit<PlaceOrderInput, "requestId"> = { items, deliveryMethod, couponCode, ...form, saveAddress, paymentMethod: "cod", quoteToken: summary.quoteToken, accountId };
    try {
      const serialized = JSON.stringify(payload);
      if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, requestId: await checkoutRequestId(accountId ?? "guest", payload) };
      const result = await checkoutRequest<{ order: CustomerOrder }>("/api/orders", { ...payload, requestId: attempt.current.requestId });
      // These callbacks refer to the submitting account's cart even if another tab signs out.
      if (!direct) cart.consumeItems(purchased);
      for (const key of ["customer-orders", "user-profile", "catalog", "admin"]) void client.invalidateQueries({ queryKey: [key] });
      if (alive.current) { setOrder(result.order); setShowSuccess(true); }
    } catch (reason) {
      if (alive.current) { setError(reason instanceof Error ? reason.message : "Unable to place your order. Please try again."); if (reason instanceof CheckoutRequestError && reason.status < 500) void quote.refetch(); }
    } finally { locked.current = false; if (alive.current) setSubmitting(false); }
  }
  if (order) return <main className={styles.page}><div className={styles.empty}><CheckCircle2 size={48} className={styles.successIcon} /><h1>Thank you for your order</h1><p>{order.number} · {money(order.total)} payable on delivery</p><p>Your order is saved. {accountId ? "Track its progress in your account." : "Keep your order number for reference."}</p>{accountId && <Link className={styles.primary} href="/account">View my orders</Link>}<Link href="/search" className={styles.secondary}>Continue shopping</Link></div>{showSuccess && <SuccessModal order={order} accountId={accountId} onClose={() => setShowSuccess(false)} />}</main>;
  if (!ready) return <main className={styles.page}><div className={styles.empty} role={cart.error ? "alert" : "status"}>{cart.error ? <><h1>Unable to load your cart</h1><p>{cart.error}</p><button className={styles.primary} onClick={cart.retry}>Try again</button></> : "Loading your cart…"}</div></main>;
  if (!items.length) return <Empty title="Nothing to check out yet"><p>Add a piece you love to your cart, then come back here.</p></Empty>;
  const displayItems = summary?.items ?? (direct ? [] : cart.items.map(item => ({ ...cartSelection(item), name: item.name, image: item.image, price: item.price / 100, stock: item.maxQuantity ?? 99 })));
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return <main className={styles.page}><div className={styles.container}>
    <Link className={styles.back} href={direct && selection ? `/products/${selection.productId}` : "/cart"}><ArrowLeft size={15} />{direct ? "Back to product" : "Back to cart"}</Link>
    <header className={styles.header}><div><h1>Checkout</h1><p>Complete your order and get ready to elevate your style.</p></div><ol className={styles.steps} aria-label="Checkout progress"><li className={styles.active}><span>1</span>Delivery</li><li><span>2</span>Review</li><li><span>3</span>Confirmation</li></ol></header>
    {profileError && <p className={styles.alert} role="alert">Saved details couldn’t be loaded. You can enter them below. {profileError}</p>}
    <form className={styles.layout} onSubmit={submit}>
      <fieldset className={styles.formColumn} disabled={submitting}>
        <section className={styles.card}><div className={styles.sectionHeading}><UserRound size={21} /><div><h2>Contact Information</h2><p>We’ll use this for order updates.</p></div></div><div className={styles.contactGrid}>
          <label>Full Name <b>*</b><input name="name" autoComplete="name" required maxLength={150} value={form.contact.name} onChange={e => contact("name", e.target.value)} /></label>
          <label>Email Address <b>*</b><input name="email" autoComplete="email" type="email" required maxLength={254} value={form.contact.email} onChange={e => contact("email", e.target.value)} /></label>
          <label>Phone Number <b>*</b><input name="phone" autoComplete="tel" type="tel" required minLength={6} maxLength={30} value={form.contact.phone} onChange={e => contact("phone", e.target.value)} /></label>
        </div></section>
        <section className={styles.card}><div className={styles.sectionHeading}><MapPin size={21} /><div><h2>Delivery Address</h2><p>Where should we deliver your order?</p></div>{accountId && <label className={styles.save}><input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} />Save as default address</label>}</div>
          <span className={styles.label}>Address Type</span><div className={styles.addressTypes}>{(["home", "work", "other"] as const).map(type => <label key={type} className={form.address.type === type ? styles.selected : ""}><input type="radio" name="addressType" value={type} checked={form.address.type === type} onChange={() => address("type", type)} /><Home size={14} />{type}</label>)}</div>
          <div className={styles.addressGrid}><label className={styles.full}>Street Address <b>*</b><input name="line1" autoComplete="address-line1" required maxLength={300} value={form.address.line1} onChange={e => address("line1", e.target.value)} /></label>
            <label className={styles.full}>Apartment, suite, etc. <span>(optional)</span><input name="apartment" autoComplete="address-line2" maxLength={150} value={form.address.apartment} onChange={e => address("apartment", e.target.value)} /></label>
            <label>City <b>*</b><input name="city" autoComplete="address-level2" required maxLength={150} value={form.address.city} onChange={e => address("city", e.target.value)} /></label>
            <label>State / Province <b>*</b><input name="province" autoComplete="address-level1" required maxLength={150} value={form.address.province} onChange={e => address("province", e.target.value)} /></label>
            <label>Postal Code <span>(optional)</span><input name="postalCode" autoComplete="postal-code" maxLength={30} value={form.address.postalCode} onChange={e => address("postalCode", e.target.value)} /></label>
            <label>Country <b>*</b><input name="country" autoComplete="country-name" required maxLength={150} value={form.address.country} onChange={e => address("country", e.target.value)} /></label>
          </div>
        </section>
        <section className={styles.card}><div className={styles.sectionHeading}><Truck size={22} /><div><h2>Delivery Method</h2><p>Choose a shipping option.</p></div></div><div className={styles.deliveryOptions}>{(["standard", "express"] as const).map(method => <label className={deliveryMethod === method ? styles.selected : ""} key={method}><input type="radio" name="deliveryMethod" value={method} checked={deliveryMethod === method} onChange={() => setDelivery(method)} /><Truck size={20} /><span><strong>{method === "standard" ? "Standard Delivery" : "Express Delivery"}</strong><small>{method === "standard" ? "3–5 business days · Free from Rs. 5,000" : "1–2 business days"}</small></span><strong>{money(shippingCost(method, summary?.subtotal ?? 0))}</strong></label>)}</div></section>
        <section className={styles.card}><div className={styles.sectionHeading}><Banknote size={22} /><div><h2>Payment Method</h2><p>Pay when your order arrives.</p></div></div><div className={`${styles.payment} ${styles.selected}`}><CheckCircle2 size={19} /><Banknote size={23} /><span><strong>Cash on Delivery</strong><small>No online payment is required to place your order.</small></span></div></section>
      </fieldset>
      <aside className={styles.summaryColumn} aria-label="Order summary"><section className={styles.card}><div className={styles.summaryHeading}><h2>Order Summary <span>({count} {count === 1 ? "item" : "items"})</span></h2>{!direct && <Link href="/cart">Edit Cart</Link>}</div>
        {quote.isPending && <p className={styles.loading} role="status">Checking prices and availability…</p>}
        <ul className={styles.items}>{displayItems.map((item, index) => <li key={`${item.productId}-${item.variantId}-${index}`}><div className={styles.image}><Image src={item.image} alt={item.name} fill unoptimized sizes="68px" /></div><div className={styles.itemInfo}><Link href={`/products/${item.productId}`}>{item.name}</Link><p>{[item.color, item.size].filter(Boolean).join(" · ") || "One size"}</p><div className={styles.itemBottom}><div className={styles.quantity}><button type="button" disabled={submitting || items[index].quantity <= 1} aria-label={`Decrease quantity of ${item.name}`} onClick={() => quantity(index, -1)}><Minus size={12} /></button><output>{items[index].quantity}</output><button type="button" disabled={submitting || items[index].quantity >= Math.min(item.stock, 99)} aria-label={`Increase quantity of ${item.name}`} onClick={() => quantity(index, 1)}><Plus size={12} /></button></div><strong>{money(item.price * items[index].quantity)}</strong></div></div><button type="button" disabled={submitting} className={styles.remove} aria-label={`Remove ${item.name}`} onClick={() => remove(index)}><X size={14} /></button></li>)}</ul>
        {direct && quote.isError && <div className={styles.recovery}><button type="button" className={styles.secondary} disabled={submitting || (single?.quantity ?? 1) <= 1} onClick={() => quantity(0, -1)}>Reduce quantity ({single?.quantity})</button><Link href={`/products/${selection?.productId}`}>Change product options</Link></div>}
        <label className={styles.discount}>Have a discount code?<span><input name="discountCode" maxLength={60} placeholder="Enter code" value={code} disabled={submitting} onChange={e => setCode(e.target.value)} /><button type="button" disabled={submitting || !code.trim()} onClick={() => { if (!email) { setError("Enter a valid email address before applying a discount code."); return; } setError(""); setCoupon(code.trim().toUpperCase()); }}>Apply</button></span></label>
        {couponCode && <p className={styles.coupon}>{couponCode}<button type="button" disabled={submitting} onClick={() => { setCoupon(""); setCode(""); }}>Remove code</button></p>}
        {quote.isError && <div className={styles.alert} role="alert">{quote.error.message} <button type="button" disabled={submitting} onClick={() => void quote.refetch()}>Retry</button></div>}
        <dl className={styles.costs}><div><dt>Subtotal</dt><dd>{summary ? money(summary.subtotal) : "—"}</dd></div><div><dt>Shipping</dt><dd>{summary ? summary.shipping ? money(summary.shipping) : "Free" : "—"}</dd></div>{!!summary?.discount && <div className={styles.savings}><dt>You Save</dt><dd>− {money(summary.discount)}</dd></div>}<div className={styles.total}><dt>Total</dt><dd>{summary ? money(summary.total) : "—"}</dd></div></dl>
        {error && <p role="alert" className={styles.alert}>{error}</p>}
        <button className={styles.primary} type="submit" disabled={submitting || !summary || quote.isFetching || quote.isError}><LockKeyhole size={17} />{submitting ? "Placing your order…" : quote.isFetching ? "Updating summary…" : "Place Order"}</button><p className={styles.fineprint}>Review your details before placing your order. Payment is collected on delivery.</p>
      </section><div className={styles.trust}><span><LockKeyhole size={21} /><strong>Secure Checkout</strong><small>Your details stay private</small></span><span><Banknote size={21} /><strong>Pay on Delivery</strong><small>No advance payment</small></span><span><Package size={21} /><strong>Order Updates</strong><small>In your account</small></span></div></aside>
    </form>
  </div></main>;
}
