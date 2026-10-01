"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "./WishlistProvider";
import ProductCard from "@/components/product/ProductCard";
import { toProductCard } from "@/lib/products";
import styles from "./wishlist.module.css";
export default function WishlistContents() {
  const wishlist = useWishlist();
  if (wishlist.isLoading) return <p className={styles.empty} role="status">Loading your wishlist…</p>;
  if (wishlist.error) return <div className={styles.empty} role="alert"><p>{wishlist.error}</p><button className={styles.primary} onClick={wishlist.retry}>Try again</button></div>;
  if (!wishlist.isSignedIn) return <div className={styles.empty}><Heart size={36} /><h2>Your wishlist belongs to you</h2><p>Create an account or sign in to save your favorite products.</p><Link href="/account" className={styles.primary}>Create your account</Link></div>;
  const products = wishlist.data?.products ?? [];
  const ids = wishlist.data?.productIds ?? [];
  const unavailable = ids.filter(id => !products.some(product => product.id === id));
  if (!ids.length) return <div className={styles.empty}><Heart size={36} /><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it here.</p><Link href="/search" className={styles.primary}>Explore the collection</Link></div>;
  return <><p className={styles.count}>{ids.length} saved {ids.length === 1 ? "product" : "products"}</p><div className={styles.grid}>{[...ids].reverse().flatMap(id => { const product = products.find(item => item.id === id); return product ? [<ProductCard key={id} product={toProductCard(product)} />] : []; })}</div>{unavailable.map(id => <div key={id} className={styles.unavailable}><p>A saved product is no longer available.</p><button disabled={wishlist.pending} onClick={() => wishlist.toggle(id)}>Remove from wishlist</button></div>)}</>;
}
