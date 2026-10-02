"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, ChevronRight, MapPin, Minus, Package, Play, Plus, Share2, ShoppingBag, X, Zap, ZoomIn } from "lucide-react";
import { CatalogError, useProduct, type ProductResponse } from "@/lib/catalog/client";
import { colorHex, formatProductPrice, toProductCard } from "@/lib/products";
import { useCart } from "@/components/cart/CartProvider";
import WishlistButton from "@/components/wishlist/WishlistButton";
import ProductCard from "./ProductCard";
import styles from "./product-page.module.css";

const tabs = ["Description", "Specifications", "Reviews", "Shipping & Returns"] as const;
function ZoomImage({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} className={styles.zoomDialog} aria-label={`Enlarged image of ${name}`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><button type="button" className={styles.zoomClose} onClick={onClose} aria-label="Close enlarged image"><X /></button><Image src={src} alt={name} fill unoptimized sizes="90vw" className={styles.zoomImage} /></dialog>;
}

export default function ProductPage({ initialData }: { initialData: ProductResponse }) {
  const query = useProduct(initialData.product.id, initialData);
  const { product, related } = query.data;
  const router = useRouter();
  const cart = useCart();
  const initialVariant = initialData.product.variants.find(variant => variant.stock > 0) ?? initialData.product.variants[0];
  const [color, setColor] = useState(initialVariant?.color ?? product.colors[0] ?? "");
  const [size, setSize] = useState(initialVariant?.size ?? product.sizes[0] ?? "");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<typeof tabs[number]>("Description");
  const [zoom, setZoom] = useState(false);
  const [notice, setNotice] = useState("");
  const media = [...product.images.map(src => ({ src, video: false })), ...product.videos.map(src => ({ src, video: true }))];
  const activeIndex = Math.min(mediaIndex, Math.max(0, media.length - 1));
  const activeMedia = media[activeIndex];
  const colors = product.variants.length ? [...new Set(product.variants.map(variant => variant.color).filter(Boolean))] : product.colors;
  const sizes = product.variants.length ? [...new Set(product.variants.map(variant => variant.size).filter(Boolean))] : product.sizes;
  const variant = product.variants.find(variant => variant.color === color && variant.size === size);
  const stock = product.variants.length ? variant?.stock ?? 0 : product.stock;
  const cartQuantity = cart.items.filter(item => item.productId === product.id && item.variantId === variant?.id).reduce((sum, item) => sum + item.quantity, 0);
  const available = Math.max(0, Math.min(99, stock - cartQuantity));
  const purchaseQuantity = Math.min(quantity, Math.max(1, available));
  const validSelection = (!colors.length || colors.includes(color)) && (!sizes.length || sizes.includes(size));
  const canBuy = validSelection && available > 0 && !query.error && !cart.isLoading && !cart.error;
  const price = product.salePrice ?? product.price;
  const discount = product.price > price ? Math.round((1 - price / product.price) * 100) : 0;
  const specs = [
    ["Brand", product.brand], ["Category", product.category], ["Subcategory", product.subcategory],
    ["Product type", product.productType], ["Gender", product.gender], ["Material", product.material],
    ["Product code", variant?.sku ?? product.sku],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  useEffect(() => {
    try {
      let visitorId = localStorage.getItem("urbanforge-visitor");
      if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem("urbanforge-visitor", visitorId); }
      void fetch(`/api/catalog/${encodeURIComponent(product.id)}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId }) }).catch(() => undefined);
    } catch { /* Tracking is optional when browser storage is unavailable. */ }
  }, [product.id]);

  function selectColor(next: string) {
    setColor(next); setQuantity(1); setNotice("");
    if (product.variants.length && !product.variants.some(item => item.color === next && item.size === size && item.stock > 0)) {
      const nextVariant = product.variants.find(item => item.color === next && item.stock > 0) ?? product.variants.find(item => item.color === next);
      setSize(nextVariant?.size ?? "");
    }
  }
  function addToCart(buyNow = false) {
    if (buyNow) {
      if (!validSelection || stock < 1 || query.error) return;
      const params = new URLSearchParams({ productId: product.id, color, size, quantity: String(Math.min(quantity, stock, 99)) });
      if (variant) params.set("variantId", variant.id);
      router.push(`/checkout?${params}`);
      return;
    }
    if (!canBuy) return;
    const added = cart.addItem({ id: JSON.stringify([product.id, variant?.id ?? "", color, size]), productId: product.id, variantId: variant?.id, color, selectedSize: size,
      name: product.name, details: [product.category, product.subcategory, color].filter(Boolean).join(" / "), size: size ? `Size: ${size}` : "One size",
      price: Math.round(price * 100), image: product.images[0], quantity: purchaseQuantity, maxQuantity: stock,
    });
    if (!added) { setNotice("Unable to add this quantity. Check your cart and try again."); return; }
    setNotice(`${purchaseQuantity} ${purchaseQuantity === 1 ? "item" : "items"} added to your cart.`);

  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: product.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setNotice("Product link copied."); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("Copy this page’s URL to share the product."); }
  }

  if (query.error instanceof CatalogError && query.error.status === 404) return <main className={styles.page}><div className={styles.unavailable}><Package size={36} /><h1>This product is no longer available</h1><Link href="/search">Explore the collection <ArrowRight size={16} /></Link></div></main>;
  return <main className={styles.page}><div className={styles.container}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={12} /><Link href={`/search?q=${encodeURIComponent(product.category)}`}>{product.category}</Link><ChevronRight size={12} /><span aria-current="page">{product.name}</span></nav>
    {query.error && <div className={styles.error} role="alert">We couldn’t refresh this product. <button type="button" onClick={() => query.refetch()}>Try again</button></div>}
    <div className={styles.productLayout}>
      <section className={styles.gallery} aria-label="Product images and videos">
        <div className={styles.thumbnails}>{media.map((item, index) => <button type="button" key={`${item.src}-${index}`} className={index === activeIndex ? styles.selectedThumb : ""} aria-label={`View ${item.video ? "video" : "image"} ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => setMediaIndex(index)}>
          <Image src={item.video ? product.images[0] : item.src} alt="" fill unoptimized sizes="80px" />{item.video && <span className={styles.play}><Play size={18} fill="currentColor" /></span>}
        </button>)}</div>
        <div className={styles.mainMedia}>
          {activeMedia?.video ? <video key={activeMedia.src} src={activeMedia.src} controls playsInline preload="metadata" poster={product.images[0]} /> : activeMedia && <Image src={activeMedia.src} alt={`${product.name} — image ${activeIndex + 1}`} fill unoptimized priority sizes="(max-width: 767px) 100vw, 50vw" />}
          {media.length > 1 && <><span className={styles.mediaCount}>{activeIndex + 1}/{media.length}</span><div className={styles.galleryArrows}><button type="button" aria-label="Previous media" onClick={() => setMediaIndex((activeIndex + media.length - 1) % media.length)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next media" onClick={() => setMediaIndex((activeIndex + 1) % media.length)}><ChevronRight size={18} /></button></div></>}
          {activeMedia && !activeMedia.video && <button type="button" className={styles.zoom} aria-label="Enlarge product image" onClick={() => setZoom(true)}><ZoomIn size={20} /></button>}
        </div>
      </section>
      <section className={styles.details} aria-label="Product details">
        <div className={styles.titleRow}><div>{(product.bestseller || product.newArrival || product.featured) && <p className={styles.badge}>{product.bestseller ? "Bestseller" : product.newArrival ? "New arrival" : "Featured"}</p>}<h1>{product.name}</h1><p className={styles.subtitle}>{[product.category, product.subcategory].filter(Boolean).join(" / ")}</p></div><div className={styles.utilities}><WishlistButton productId={product.id} name={product.name} size={20} /><button type="button" aria-label="Share product" onClick={share}><Share2 size={18} /></button></div></div>
        {product.brand && <p className={styles.brand}>By <strong>{product.brand}</strong></p>}
        <div className={styles.price}><strong>{formatProductPrice(price)}</strong>{discount > 0 && <><del>{formatProductPrice(product.price)}</del><span>{discount}% OFF</span></>}</div>
        {product.shortDescription && <p className={styles.summary}>{product.shortDescription}</p>}
        {colors.length > 0 && <fieldset className={styles.options}><legend>Color: <span>{color}</span></legend><div className={styles.colorOptions}>{colors.map(option => <button type="button" key={option} aria-pressed={color === option} onClick={() => selectColor(option)}><span style={{ backgroundColor: colorHex(option) }} />{option}</button>)}</div></fieldset>}
        {sizes.length > 0 && <fieldset className={styles.options}><legend>Size: <span>{size || "Select a size"}</span></legend><div className={styles.sizeOptions}>{sizes.map(option => <button type="button" key={option} aria-pressed={size === option} disabled={product.variants.length > 0 && !product.variants.some(item => item.color === color && item.size === option && item.stock > 0)} onClick={() => { setSize(option); setQuantity(1); setNotice(""); }}>{option}</button>)}</div></fieldset>}
        <p className={`${styles.stock} ${stock === 0 ? styles.outOfStock : ""}`}>{stock > 0 ? <><Check size={14} />In stock · {stock} available{cartQuantity > 0 ? ` (${cartQuantity} in your cart)` : ""}</> : <><Package size={14} />Out of stock{product.variants.length ? " for this selection" : ""}</>}</p>
        <div className={styles.purchase}><div className={styles.quantity} role="group" aria-label="Quantity"><button type="button" disabled={purchaseQuantity <= 1} aria-label="Decrease quantity" onClick={() => setQuantity(purchaseQuantity - 1)}><Minus size={15} /></button><output aria-live="polite">{purchaseQuantity}</output><button type="button" disabled={!canBuy || purchaseQuantity >= available} aria-label="Increase quantity" onClick={() => setQuantity(purchaseQuantity + 1)}><Plus size={15} /></button></div><button type="button" className={styles.addToCart} disabled={!canBuy} onClick={() => addToCart()}><ShoppingBag size={17} />Add to Cart</button><button type="button" className={styles.buyNow} disabled={!validSelection || stock < 1 || !!query.error} onClick={() => addToCart(true)}><Zap size={16} />Buy Now</button></div>
        <p className={styles.notice} role="status">{cart.error ? <>Unable to load your cart. <button type="button" onClick={cart.retry}>Try again</button></> : cart.isLoading ? "Loading your cart…" : notice}{notice.includes("added to your cart") && <> <Link href="/cart">View cart <ArrowRight size={13} /></Link></>}</p>
        <div className={styles.benefits}><div><Package size={21} /><span>Product details<small>See materials & specifications</small></span></div><Link href="/account"><MapPin size={21} /><span>Saved addresses<small>Keep your delivery details ready</small></span></Link></div>
      </section>
    </div>
    <section className={styles.information} aria-label="More product information"><div className={styles.tabs} role="tablist" aria-label="Product information">{tabs.map((item, index) => <button type="button" role="tab" key={item} id={`product-tab-${index}`} aria-controls="product-tab-content" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1; if (next >= 0) { event.preventDefault(); setTab(tabs[next]); document.getElementById(`product-tab-${next}`)?.focus(); } }}>{item}</button>)}</div>
      <div className={styles.tabContent} role="tabpanel" id="product-tab-content" aria-labelledby={`product-tab-${tabs.indexOf(tab)}`} tabIndex={0}>
        {(tab === "Description" || tab === "Specifications") && <div className={styles.descriptionGrid}>{tab === "Description" && <div><p className={styles.description}>{product.description || product.shortDescription || "No description has been added for this product yet."}</p>{product.tags.length > 0 && <div className={styles.tags}>{product.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}</div>}<dl className={styles.specs}>{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>}
        {tab === "Reviews" && <div className={styles.tabEmpty}><h3>No reviews yet</h3><p>Customer reviews aren’t available for this product yet.</p></div>}
        {tab === "Shipping & Returns" && <div className={styles.tabEmpty}><h3>Delivery & returns</h3><p>Choose standard or express delivery at checkout. Standard shipping is free on orders of Rs. 5,000 or more.</p><Link href="/account">Save your delivery address <ArrowRight size={14} /></Link></div>}
      </div>
    </section>
    {related.length > 0 && <section className={styles.related}><div className={styles.relatedHeading}><h2>You May Also Like</h2><Link href={`/search?q=${encodeURIComponent(product.category)}`}>View all <ArrowRight size={14} /></Link></div><div className={styles.relatedGrid}>{related.map(item => <ProductCard key={item.id} product={toProductCard(item)} showColors={false} showArrow={false} />)}</div></section>}
    {zoom && activeMedia && !activeMedia.video && <ZoomImage src={activeMedia.src} name={product.name} onClose={() => setZoom(false)} />}
  </div></main>;
}
