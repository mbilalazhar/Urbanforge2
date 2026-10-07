import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import * as z from "zod/mini";
import { addCartItem, changeCartQuantity, type CartItem } from "./cart-data";

export const guestCartStorageKey = "urbanforge:cart:v1:guest";
export const cartStorageKey = (accountId: string) => `urbanforge:cart:v1:user:${encodeURIComponent(accountId)}`;
const itemSchema = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(1000)), productId: z.optional(z.string().check(z.minLength(1), z.maxLength(100))), variantId: z.optional(z.string().check(z.maxLength(100))),
  name: z.string().check(z.minLength(1), z.maxLength(500)), details: z.string().check(z.maxLength(2000)), size: z.string().check(z.maxLength(200)),
  color: z.optional(z.string().check(z.maxLength(150))), selectedSize: z.optional(z.string().check(z.maxLength(150))),
  price: z.int().check(z.minimum(0), z.maximum(Number.MAX_SAFE_INTEGER)),
  image: z.string().check(z.minLength(1), z.maxLength(2048), z.refine(value => /^\/(?!\/)/.test(value) || /^https?:\/\//.test(value))),
  imageStyle: z.optional(z.enum(["shoes", "sunglasses"])),
  quantity: z.int().check(z.minimum(1), z.maximum(99)), maxQuantity: z.optional(z.int().check(z.minimum(0), z.maximum(1_000_000))),
});

function restoredItems(value: unknown): CartItem[] {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  return value.items.reduce<CartItem[]>((items, input) => {
    const parsed = itemSchema.safeParse(input);
    return parsed.success ? addCartItem(items, parsed.data) : items;
  }, []);
}

// Browsers may disable storage or run out of space. Keep the current cart usable.
const browserStorage: StateStorage = {
  getItem: name => { try { return window.localStorage.getItem(name); } catch { return null; } },
  setItem: (name, value) => { try { window.localStorage.setItem(name, value); } catch { /* In-memory fallback. */ } },
  removeItem: name => { try { window.localStorage.removeItem(name); } catch { /* Storage unavailable. */ } },
};
export type CartState = {
  items: CartItem[];
  hydrated: boolean;
  addItem: (item: CartItem) => boolean;
  changeQuantity: (id: string, change: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  consumeItems: (purchased: { id: string; quantity: number }[]) => void;
};

// A fresh store per account prevents state from being copied between storage keys.
// Null is the browser guest cart, isolated from every account cart.
export function createCartStore(accountId: string | null, storage: StateStorage = browserStorage) {
  return createStore<CartState>()(persist((set, get) => ({
    items: [], hydrated: false,
    addItem: item => {
      if (!get().hydrated) return false;
      const parsed = itemSchema.safeParse(item);
      if (!parsed.success) return false;
      const before = get().items;
      const items = addCartItem(before, parsed.data);
      const added = items.reduce((sum, entry) => sum + entry.quantity, 0) > before.reduce((sum, entry) => sum + entry.quantity, 0);
      if (added) set({ items });
      return added;
    },
    changeQuantity: (id, change) => { if (get().hydrated) set({ items: changeCartQuantity(get().items, id, change) }); },
    removeItem: id => { if (get().hydrated) set({ items: get().items.filter(item => item.id !== id) }); },
    consumeItems: purchased => {
      if (!get().hydrated) return;
      set({ items: get().items.map(item => ({ ...item, quantity: item.quantity - purchased.filter(entry => entry.id === item.id).reduce((sum, entry) => sum + entry.quantity, 0) })).filter(item => item.quantity > 0) });
    },
    clearCart: () => { if (get().hydrated) set({ items: [] }); },
  }), {
    name: accountId ? cartStorageKey(accountId) : guestCartStorageKey,
    storage: createJSONStorage(() => storage),
    version: 1,
    partialize: state => ({ items: state.items }),
    merge: (persisted, current) => ({ ...current, items: restoredItems(persisted) }),
    skipHydration: true,
  }));
}


function readStoredItems(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const persisted = JSON.parse(raw);
    return persisted?.version === 1 ? restoredItems(persisted.state) : [];
  } catch { return []; }
}

// Commit the destination before consuming the guest cart. Web Locks serialize
// login/hydration in multiple tabs so a guest cart is not merged twice.
let guestMergeQueue: Promise<void> = Promise.resolve();
export async function mergeGuestCart(accountId: string, storage: StateStorage = browserStorage): Promise<void> {
  async function merge() {
    const guestRaw = await storage.getItem(guestCartStorageKey);
    const guestItems = readStoredItems(guestRaw);
    if (!guestItems.length) return;
    const destination = cartStorageKey(accountId);
    const accountItems = readStoredItems(await storage.getItem(destination));
    const items = guestItems.reduce((current, item) => addCartItem(current, item), accountItems);
    const saved = JSON.stringify({ state: { items }, version: 1 });
    await storage.setItem(destination, saved);
    // Preserve guest data if persistence failed (e.g. browser quota exceeded).
    if (await storage.getItem(destination) !== saved) return;
    if (await storage.getItem(guestCartStorageKey) === guestRaw) await storage.removeItem(guestCartStorageKey);
  }
  try {
    if (typeof navigator !== "undefined" && navigator.locks) await navigator.locks.request("urbanforge:merge-guest-cart", merge);
    else {
      const pending = guestMergeQueue.then(merge);
      guestMergeQueue = pending.catch(() => undefined);
      await pending;
    }
  } catch { /* Keep the guest cart for a later retry when storage is available. */ }
}
