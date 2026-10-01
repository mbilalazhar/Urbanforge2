"use client";
import { Heart } from "lucide-react";
import { useWishlist } from "./WishlistProvider";
export default function WishlistButton({ productId, name, className, size = 16 }: { productId: string; name: string; className?: string; size?: number }) {
  const wishlist = useWishlist();
  const saved = wishlist.data?.productIds.includes(productId) ?? false;
  return <button type="button" className={className} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} disabled={wishlist.isLoading || wishlist.pending} onClick={event => { event.stopPropagation(); wishlist.toggle(productId); }}><Heart size={size} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></button>;
}
