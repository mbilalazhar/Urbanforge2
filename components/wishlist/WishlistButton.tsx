"use client";
import { useSyncExternalStore } from "react";
import { PendingContent } from "@/components/ui/Skeleton";
import { Heart } from "lucide-react";
import { useWishlist } from "./WishlistProvider";

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function WishlistButton({ productId, name, className, size = 16 }: { productId: string; name: string; className?: string; size?: number }) {
  const wishlist = useWishlist();
  // A streamed grid can hydrate after its parent has already fetched the session.
  // Match this button's server snapshot before showing live account state.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const saved = hydrated && (wishlist.data?.productIds.includes(productId) ?? false);
  const pending = !hydrated || wishlist.isLoading || wishlist.pending;
  return <button type="button" className={className} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} disabled={pending} onClick={event => { event.stopPropagation(); wishlist.toggle(productId); }}><PendingContent pending={pending}><Heart size={size} fill={saved ? "currentColor" : "none"} strokeWidth={1.5} /></PendingContent></button>;
}
