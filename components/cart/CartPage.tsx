"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, CircleHelp, Headset, LockKeyhole, Minus, Plus, RotateCcw, ShoppingBag, Trash2, Truck } from "lucide-react";
import { FaApplePay, FaCcVisa, FaGooglePay, FaPaypal } from "react-icons/fa";
import { useCart } from "./CartProvider";
import { formatCartPrice } from "@/lib/cart-data";
import styles from "./cart.module.css";

const benefits = [
  { icon: Truck, title: "Free shipping", description: "On orders over $100" },
  { icon: RotateCcw, title: "Easy returns", description: "30-day return policy" },
  { icon: LockKeyhole, title: "Secure payment", description: "100% encrypted" },
  { icon: Headset, title: "Premium support", description: "We’ve got you covered" },
];

export default function CartPage() {
  const { items, itemCount, subtotal, changeQuantity, removeItem, clearCart } = useCart();
  const [promoMessage, setPromoMessage] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  function applyPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPromoMessage("Promo codes are coming soon. Stay tuned for your next offer.");
  }

  return (
    <main className={styles.page}>
      <div className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Cart</span>
        </nav>
        <header className={styles.heading}>
          <div><h1>Your <span>Cart</span></h1><p>Style is a choice. Make it yours.</p></div>
          <span className={styles.itemCount} aria-live="polite">{String(itemCount).padStart(2, "0")} {itemCount === 1 ? "item" : "items"}</span>
        </header>

        <div className={styles.layout}>
          <div className={styles.cartColumn}>
            {items.length ? (
              <div className={styles.products}>
                <div className={styles.tableHeading} aria-hidden="true"><span>Product</span><span>Price</span><span>Quantity</span><span>Total</span></div>
                <ul>
                  {items.map(item => (
                    <li key={item.id} className={styles.product}>
                      <div className={styles.productInfo}>
                        <div className={`${styles.productImage} ${item.imageStyle ? styles[item.imageStyle] : ""}`}>
                          <Image src={item.image} alt={item.name} fill sizes={item.imageStyle === "sunglasses" ? "1300px" : item.imageStyle === "shoes" ? "260px" : "(max-width: 767px) 90px, 130px"} />
                        </div>
                        <div className={styles.productDetails}>
                          <h2>{item.name}</h2><p>{item.details}</p><p>{item.size}</p>
                          <button type="button" className={styles.remove} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={15} strokeWidth={1.5} />Remove</button>
                        </div>
                      </div>
                      <span className={styles.price}><span className={styles.mobileLabel}>Price </span>{formatCartPrice(item.price)}</span>
                      <div className={styles.quantityControl}>
                        <span className={styles.mobileLabel}>Quantity</span>
                        <div className={styles.quantity} role="group" aria-label={`Quantity for ${item.name}`}>
                        <button type="button" disabled={item.quantity === 1} onClick={() => changeQuantity(item.id, -1)} aria-label={`Decrease quantity of ${item.name}`}><Minus size={14} /></button>
                        <output aria-label={`${item.name} quantity`}>{item.quantity}</output>
                        <button type="button" disabled={item.quantity === 99} onClick={() => changeQuantity(item.id, 1)} aria-label={`Increase quantity of ${item.name}`}><Plus size={14} /></button>
                      </div>
                      </div>
                      <span className={styles.lineTotal}><span className={styles.mobileLabel}>Total </span>{formatCartPrice(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.empty}>
                <ShoppingBag size={38} strokeWidth={1} /><h2>Your next fit is waiting.</h2><p>Your cart is empty. Find something that feels like you.</p>
                <Link href="/new-in" className={styles.checkout}>Explore new arrivals <ArrowRight size={16} /></Link>
              </div>
            )}
            <div className={styles.cartActions}>
              <Link href="/new-in"><ArrowLeft size={15} />Continue shopping</Link>
              {items.length > 0 && <button type="button" onClick={clearCart}>Clear cart<Trash2 size={16} strokeWidth={1.5} /></button>}
            </div>
            <div className={styles.banner}>
              <Image src="/hero-bg.png" alt="" fill sizes="(min-width: 1200px) 55vw, 100vw" className={styles.bannerBackground} />
              <Image src="/MenSection.png" alt="" width={1086} height={1448} className={styles.bannerModel} />
              <p>Don’t just wear it.<br />Live it.</p>
              <span>Urbanforge <i /> <br />Streetwear <i /><br />Worldwide <i /></span>
            </div>
          </div>

          <aside className={styles.summaryColumn} aria-label="Order summary">
            <div className={styles.summaryCard}>
              <div className={styles.summary}>
                <h2>Order summary</h2>
                <dl className={styles.costs}>
                  <div><dt>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt><dd>{formatCartPrice(subtotal)}</dd></div>
                  <div><dt>Shipping</dt><dd className={styles.shipping}>Calculated at checkout</dd></div>
                  <div><dt>Estimated tax <span title="Final tax is calculated at checkout." aria-label="Final tax is calculated at checkout."><CircleHelp size={13} /></span></dt><dd>{formatCartPrice(0)}</dd></div>
                </dl>
                <div className={styles.total} aria-live="polite"><span>Total</span><strong>{formatCartPrice(subtotal)}</strong></div>
                <button type="button" className={styles.checkout} disabled={!items.length} onClick={() => setCheckoutMessage("Checkout is coming soon. Keep exploring your next fit.")}>Proceed to checkout<ArrowRight size={16} /></button>
                {checkoutMessage && <p className={styles.feedback} role="status">{checkoutMessage}</p>}
                <div className={styles.payments} aria-label="Payment methods: Visa, Mastercard, Apple Pay, Google Pay, PayPal">
                  <FaCcVisa size={31} aria-hidden="true" />
                  <span className={styles.mastercard} aria-hidden="true"><i /><i /></span>
                  <FaApplePay size={34} aria-hidden="true" /><FaGooglePay size={34} aria-hidden="true" />
                  <span className={styles.paypal}><FaPaypal size={14} aria-hidden="true" />PayPal</span>
                </div>
              </div>
              <details className={styles.promo} open>
                <summary>Apply promo code<ChevronDown size={14} /></summary>
                <form onSubmit={applyPromo}>
                  <label className={styles.srOnly} htmlFor="promo-code">Promo code</label>
                  <input id="promo-code" name="promo-code" placeholder="Enter code" required maxLength={40} disabled={!items.length} onChange={() => setPromoMessage("")} />
                  <button type="submit" disabled={!items.length}>Apply</button>
                </form>
                {promoMessage && <p className={styles.feedback} role="status">{promoMessage}</p>}
              </details>
            </div>
            <div className={styles.benefits}>
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title}><Icon size={22} strokeWidth={1.2} /><div><h3>{title}</h3><p>{description}</p></div></div>
              ))}
            </div>
          </aside>
        </div>
      </div>
      <aside className={styles.editorial} aria-label="UrbanForge: Built for the streets">
        <Image src="/hero-bg.png" alt="" fill sizes="18vw" className={styles.editorialBackground} />
        <Image src="/MenSection.png" alt="Model wearing a black UrbanForge utility outfit" fill sizes="45vw" priority className={styles.editorialModel} />
        <p>Built for<br />the streets.</p><span>More<br />than<br />fashion</span>
      </aside>
    </main>
  );
}
