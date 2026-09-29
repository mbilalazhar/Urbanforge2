"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowRight, Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import type { Product } from "./ProductCard";
import { getProductPreview } from "./preview-data";
import styles from "./quick-view.module.css";

export default function ProductQuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const preview = getProductPreview(product.category);
  const colors = product.colors?.length ? product.colors : [{ name: "Black", hex: "#111111" }];
  const [color, setColor] = useState(colors[0].name);
  const [size, setSize] = useState(preview.sizes.includes("M") ? "M" : preview.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!previousFocus.current && document.activeElement instanceof HTMLElement) {
      previousFocus.current = document.activeElement;
    }
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
      if (previousFocus.current?.isConnected) {
        previousFocus.current.focus({ preventScroll: true });
      }
    };
  }, []);

  function clearFeedback() {
    setFeedback("");
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
    >
      <button ref={closeRef} type="button" aria-label="Close product details" className={styles.close} onClick={onClose}><X size={20} strokeWidth={1.5} /></button>
      <div className={styles.photo}>
        <Image src={product.image} alt={product.name} fill sizes="(min-width: 768px) 440px, 100vw" className={styles.image} />
        <span className={styles.photoLabel}>UrbanForge / Everyday Utility</span>
        {product.tag && <span className={styles.tag}>{product.tag}</span>}
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Product Preview <span>/</span> {product.category}</p>
        <h2 id={titleId}>{product.name}</h2>
        <div className={styles.priceRow}><span className={styles.price}>{product.price}</span><span className={styles.stock}><span />In stock</span></div>
        <p className={styles.description}>{preview.description}</p>
        <ul className={styles.details}>{preview.details.map(detail => <li key={detail}><Check size={13} />{detail}</li>)}</ul>

        <fieldset className={styles.options}>
          <legend>Color <span>— {color}</span></legend>
          <div className={styles.colors}>
            {colors.map(option => (
              <button key={option.name} type="button" aria-label={option.name} aria-pressed={color === option.name} className={styles.color} onClick={() => { setColor(option.name); clearFeedback(); }}>
                <span style={{ backgroundColor: option.hex }} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.options}>
          <legend>Size <span>— {size}</span></legend>
          <div className={styles.sizes}>
            {preview.sizes.map(option => <button key={option} type="button" aria-label={`Size ${option}`} aria-pressed={size === option} onClick={() => { setSize(option); clearFeedback(); }}>{option}</button>)}
          </div>
        </fieldset>
        <div className={styles.quantityRow}>
          <span id={`${titleId}-quantity`}>Quantity</span>
          <div className={styles.quantity} role="group" aria-labelledby={`${titleId}-quantity`}>
            <button type="button" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => { setQuantity(quantity - 1); clearFeedback(); }}><Minus size={14} /></button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" aria-label="Increase quantity" disabled={quantity === 9} onClick={() => { setQuantity(quantity + 1); clearFeedback(); }}><Plus size={14} /></button>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.add} onClick={() => setFeedback(`Cart preview: ${quantity} × ${product.name}, ${color}, size ${size}.`)}><ShoppingBag size={17} strokeWidth={1.5} />Add to Cart</button>
          <button type="button" className={styles.shop} onClick={() => setFeedback("Your selection is ready. Checkout will be available soon.")}>Shop Now<ArrowRight size={17} strokeWidth={1.5} /></button>
        </div>
        <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>
        <p className={styles.note}>Made for your everyday. Built for the streets.</p>
      </div>
    </dialog>,
    document.body,
  );
}
