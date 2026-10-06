import type { Metadata } from "next";
import WishlistContents from "@/components/wishlist/WishlistContents";
import styles from "@/components/wishlist/wishlist.module.css";
export const metadata: Metadata = { title: "Your Wishlist", description: "Your favorite UrbanForge clothing, footwear and accessories, saved in one place. Revisit your picks and find your next fit.", robots: { index: false, follow: false } };
export default function WishlistPage() {
  return <main className={styles.page}><div className={styles.container}><header className={styles.heading}><h1>Your Wishlist</h1><p>The pieces you love, saved for later.</p></header><WishlistContents /></div></main>;
}
