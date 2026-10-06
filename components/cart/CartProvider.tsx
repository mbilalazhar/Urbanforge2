"use client";
import { useFeedback } from "@/components/ui/Feedback";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import { useSession } from "@/lib/auth/client";
import { USER_SESSION_EVENT } from "@/lib/auth/events";
import { cartStorageKey, guestCartStorageKey, mergeGuestCart, createCartStore, type CartState } from "@/lib/cart-store";

type CartContextValue = Omit<CartState, "hydrated"> & {
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  isSignedIn: boolean;
  error: string | null;
  retry: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const session = useSession("user");
  const client = useQueryClient();
  const accountId = !session.isError && session.data?.account?.role === "user" ? session.data.account.id : null;

  useEffect(() => {
    function syncSession(event: StorageEvent) {
      if (event.key !== USER_SESSION_EVENT && event.key !== null) return;
      // Cookies are shared across tabs. Hide the previous account immediately,
      // then ask the server which account is now signed in.
      void client.cancelQueries({ queryKey: ["session", "user"] });
      client.setQueryData(["session", "user"], { account: null });
      client.removeQueries({ queryKey: ["user-profile"] });
      void client.invalidateQueries({ queryKey: ["session", "user"] });
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [client]);

  return <AccountCart accountId={accountId} loading={session.isPending || (session.isFetching && !accountId)} error={session.error?.message ?? null} retry={() => { void session.refetch(); }}>{children}</AccountCart>;
}

function AccountCart({ accountId, loading, error, retry, children }: { accountId: string | null; loading: boolean; error: string | null; retry: () => void; children: ReactNode }) {
  const store = useMemo(() => createCartStore(accountId), [accountId]);
  const state = useStore(store);
  const feedback = useFeedback();
  useEffect(() => {
    if (loading || error) return;
    let active = true;
    async function hydrate() {
      if (accountId) await mergeGuestCart(accountId);
      if (!active) return;
      await store.persist.rehydrate();
      // Persistence deliberately starts after mount to match the server HTML.
      if (active) store.setState({ hydrated: true });
    }
    void hydrate();
    function syncCart(event: StorageEvent) {
      if (event.key === (accountId ? cartStorageKey(accountId) : guestCartStorageKey) || event.key === null) void store.persist.rehydrate();
    }
    window.addEventListener("storage", syncCart);
    return () => { active = false; window.removeEventListener("storage", syncCart); };
  }, [accountId, store, loading, error]);
  return <CartContext.Provider value={{ ...state,
    addItem: item => { const added = state.addItem(item); if (added) feedback.success(`${item.quantity ?? 1} ${(item.quantity ?? 1) === 1 ? "item" : "items"} added to your cart.`); else feedback.warning("Unable to add this quantity. Check your cart and try again."); return added; },
    removeItem: id => { state.removeItem(id); feedback.success("Item removed from your cart."); },
    clearCart: () => { state.clearCart(); feedback.success("Your cart has been cleared."); },
    changeQuantity: (id, change) => { const before = store.getState().items.find(item => item.id === id)?.quantity; state.changeQuantity(id, change); if (store.getState().items.find(item => item.id === id)?.quantity !== before) feedback.success("Cart quantity updated."); else feedback.warning("This quantity is not available."); },
    itemCount: state.items.reduce((total, item) => total + item.quantity, 0),
    subtotal: state.items.reduce((total, item) => total + item.price * item.quantity, 0),
    isLoading: !error && (loading || !state.hydrated), isSignedIn: Boolean(accountId), error, retry,
  }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}
