"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Minus, Package, Plus, ShoppingBag, X } from "lucide-react";
import { useProductPreview } from "@/lib/catalog/client";
import type { AdminProduct } from "@/lib/admin/types";
import { colorHex, formatProductPrice } from "@/lib/products";
import { useCart } from "@/components/cart/CartProvider";
import type { Product } from "./ProductCard";
import styles from "./quick-view.module.css";

export default function ProductQuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const query = useProductPreview(String(product.id));
  const live = query.data?.product;
  const image = live?.images[0] ?? product.image;
  const name = live?.name ?? product.name;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${padding + scrollbarWidth}px`;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <button ref={closeRef} type="button" aria-label="Close product details" className={styles.close} onClick={onClose}><X size={20} strokeWidth={1.5} /></button>
    <div className={styles.photo}>
      {image ? <Image src={image} alt={name} fill unoptimized sizes="(min-width: 768px) 440px, 100vw" className={styles.image} /> : <Package size={40} />}
      <span className={styles.photoLabel}>{live?.brand || live?.category || product.category}</span>
      {product.tag && <span className={styles.tag}>{product.tag}</span>}
    </div>
    <div className={styles.content}>
      <p className={styles.eyebrow}>Quick view <span>/</span> {live?.category ?? product.category}</p>
      <h2 id={titleId}>{name}</h2>
      {query.isPending ? <p className={styles.feedback} role="status">Loading product details…</p> : query.error ? <div className={styles.feedback} role="alert"><p>{query.error.message}</p><button type="button" onClick={() => { void query.refetch(); }}>Try again</button></div> : live && <ProductOptions key={live.id} product={live} onClose={onClose} />}
      <Link href={`/products/${encodeURIComponent(product.id)}`} className={styles.fullDetails} onClick={onClose}>View full product details <ArrowRight size={15} /></Link>
    </div>
  </dialog>, document.body);
}

function ProductOptions({ product, onClose }: { product: AdminProduct; onClose: () => void }) {
  const cart = useCart();
  const initialVariant = product.variants.find(variant => variant.stock > 0) ?? product.variants[0];
  const [color, setColor] = useState(initialVariant?.color ?? product.colors[0] ?? "");
  const [size, setSize] = useState(initialVariant?.size ?? product.sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");
  const colors = product.variants.length ? [...new Set(product.variants.map(item => item.color).filter(Boolean))] : product.colors;
  const sizes = product.variants.length ? [...new Set(product.variants.map(item => item.size).filter(Boolean))] : product.sizes;
  const variant = product.variants.find(item => item.color === color && item.size === size);
  const stock = product.variants.length ? variant?.stock ?? 0 : product.stock;
  const inCart = cart.items.filter(item => item.productId === product.id && item.variantId === variant?.id).reduce((total, item) => total + item.quantity, 0);
  const available = Math.max(0, Math.min(99, stock - inCart));
  const purchaseQuantity = Math.min(quantity, Math.max(1, available));
  const canAdd = available > 0 && !cart.isLoading && !cart.error && (!colors.length || colors.includes(color)) && (!sizes.length || sizes.includes(size));
  const price = product.salePrice ?? product.price;
  const details = [product.brand && `Brand: ${product.brand}`, product.material && `Material: ${product.material}`, product.subcategory && `Category: ${product.subcategory}`, `SKU: ${variant?.sku ?? product.sku}`].filter(Boolean);

  function selectColor(next: string) {
    setColor(next); setQuantity(1); setFeedback("");
    if (product.variants.length && !product.variants.some(item => item.color === next && item.size === size && item.stock > 0)) {
      const nextVariant = product.variants.find(item => item.color === next && item.stock > 0) ?? product.variants.find(item => item.color === next);
      setSize(nextVariant?.size ?? "");
    }
  }
  function addToCart() {
    if (!canAdd) return;
    const added = cart.addItem({ id: JSON.stringify([product.id, variant?.id ?? "", color, size]), productId: product.id, variantId: variant?.id,
      name: product.name, details: [product.category, product.subcategory, color].filter(Boolean).join(" / "), size: size ? `Size: ${size}` : "One size",
      price: Math.round(price * 100), image: product.images[0], quantity: purchaseQuantity, maxQuantity: stock });
    setFeedback(added ? `${purchaseQuantity} ${purchaseQuantity === 1 ? "item" : "items"} added to your cart.` : "Unable to add this quantity. Check your cart and try again.");
  }

  return <>
    <div className={styles.priceRow}><span className={styles.price}>{formatProductPrice(price)}{price < product.price && <del>{formatProductPrice(product.price)}</del>}</span><span className={`${styles.stock} ${stock === 0 ? styles.outOfStock : ""}`}><span />{stock > 0 ? `${stock} in stock` : "Out of stock"}</span></div>
    <p className={styles.description}>{product.shortDescription || product.description || "No description has been added yet."}</p>
    <ul className={styles.details}>{details.map(detail => <li key={String(detail)}><Check size={13} />{detail}</li>)}</ul>
    {colors.length > 0 && <fieldset className={styles.options}><legend>Color <span>— {color}</span></legend><div className={styles.colors}>{colors.map(option => <button key={option} type="button" aria-label={option} title={option} aria-pressed={color === option} className={styles.color} onClick={() => selectColor(option)}><span style={{ backgroundColor: colorHex(option) }} /></button>)}</div></fieldset>}
    {sizes.length > 0 && <fieldset className={styles.options}><legend>Size <span>— {size}</span></legend><div className={styles.sizes}>{sizes.map(option => <button key={option} type="button" aria-label={`Size ${option}`} aria-pressed={size === option} disabled={product.variants.length > 0 && !product.variants.some(item => item.color === color && item.size === option && item.stock > 0)} onClick={() => { setSize(option); setQuantity(1); setFeedback(""); }}>{option}</button>)}</div></fieldset>}
    <div className={styles.quantityRow}><span>Quantity</span><div className={styles.quantity} role="group" aria-label="Quantity"><button type="button" aria-label="Decrease quantity" disabled={purchaseQuantity <= 1} onClick={() => { setQuantity(purchaseQuantity - 1); setFeedback(""); }}><Minus size={14} /></button><output aria-live="polite">{purchaseQuantity}</output><button type="button" aria-label="Increase quantity" disabled={!canAdd || purchaseQuantity >= available} onClick={() => { setQuantity(purchaseQuantity + 1); setFeedback(""); }}><Plus size={14} /></button></div></div>
    <div className={styles.actions}><button type="button" className={styles.add} disabled={!canAdd} onClick={addToCart}><ShoppingBag size={17} />Add to Cart</button><Link href="/cart" className={styles.shop} onClick={onClose}>View Cart<ArrowRight size={17} /></Link></div>
    <p className={styles.feedback} role="status">{cart.error ? <>Unable to load your cart. <button type="button" onClick={cart.retry}>Try again</button></> : cart.isLoading ? "Loading your cart…" : feedback || (available === 0 && inCart > 0 ? "All available units of this selection are already in your cart." : "")}</p>
  </>;
}
