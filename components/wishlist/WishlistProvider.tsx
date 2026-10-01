"use client";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import type { SessionResponse } from "@/lib/auth/types";
import { wishlistRequest, WishlistError, WISHLIST_EVENT, type WishlistData } from "@/lib/wishlist/client";
import styles from "./wishlist.module.css";

type WishlistContextValue = {
  data: WishlistData | undefined; isSignedIn: boolean; isLoading: boolean;
  pending: boolean; error: string | null; retry: () => void;
  toggle: (productId: string) => void;
};
const WishlistContext = createContext<WishlistContextValue | null>(null);
export function WishlistProvider({ children }: { children: ReactNode }) {
  const session = useSession("user");
  const client = useQueryClient();
  const accountId = !session.isError && session.data?.account?.role === "user" ? session.data.account.id : null;
  const [prompt, setPrompt] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ accountId: string | null; text: string } | null>(null);
  const busy = useRef(false);
  const query = useQuery({ queryKey: ["wishlist", accountId], queryFn: ({ signal }) => wishlistRequest(accountId!, undefined, undefined, signal), enabled: Boolean(accountId), staleTime: 0, retry: false });
  const data = accountId && query.data?.accountId === accountId ? query.data : undefined;
  const error = session.error?.message ?? (accountId ? query.error?.message : null) ?? null;

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === WISHLIST_EVENT || event.key === null) void client.invalidateQueries({ queryKey: ["wishlist"] });
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [client]);

  async function toggle(productId: string) {
    if (busy.current || session.isPending) return;
    if (session.error) { setNotice({ accountId, text: "Unable to check your account. Please try again." }); void session.refetch(); return; }
    if (!accountId) { setPrompt(true); return; }
    if (query.error) { setNotice({ accountId, text: query.error.message }); void query.refetch(); return; }
    if (!data) return;
    busy.current = true; setPending(true); setNotice(null);
    try {
      const result = await wishlistRequest(accountId, productId, !data.productIds.includes(productId));
      await client.cancelQueries({ queryKey: ["wishlist", accountId] });
      client.setQueryData(["wishlist", accountId], result);
      try { localStorage.setItem(WISHLIST_EVENT, crypto.randomUUID()); } catch { /* Focus also refreshes saved products. */ }
    } catch (caught) {
      const currentId = client.getQueryData<SessionResponse>(["session", "user"])?.account?.id;
      if (currentId === accountId) {
        if (caught instanceof WishlistError && caught.status === 401) {
          client.setQueryData(["session", "user"], { account: null }); setPrompt(true);
        } else {
          setNotice({ accountId, text: caught instanceof Error ? caught.message : "Unable to save your wishlist." });
          if (caught instanceof WishlistError && caught.status === 409) void client.invalidateQueries({ queryKey: ["session", "user"] });
        }
      }
    } finally { busy.current = false; setPending(false); }
  }

  return <WishlistContext.Provider value={{ data, isSignedIn: Boolean(accountId), isLoading: session.isPending || Boolean(accountId && query.isPending), pending, error, retry: () => { void session.refetch(); if (accountId) void query.refetch(); }, toggle: id => { void toggle(id); } }}>
    {children}
    {prompt && !accountId && <AccountRequiredModal onClose={() => setPrompt(false)} />}
    {notice && notice.accountId === accountId && <div className={styles.toast} role="alert"><p>{notice.text}</p><button type="button" aria-label="Dismiss wishlist message" onClick={() => setNotice(null)}><X size={16} /></button></div>}
  </WishlistContext.Provider>;
}
export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error("useWishlist must be used within WishlistProvider");
  return value;
}
function AccountRequiredModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }}><button className={styles.close} aria-label="Close account prompt" onClick={onClose}><X size={20} /></button><Heart size={36} className={styles.heart} /><h2 id={titleId}>Save the pieces you love</h2><p>Create an account first to add products to your personal wishlist.</p><Link href="/account" className={styles.primary} onClick={onClose}>Create your account <span aria-hidden="true">→</span></Link></dialog>, document.body);
}
