import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { z } from "zod";
import { addCartItem, changeCartQuantity, type CartItem } from "./cart-data";

export const guestCartStorageKey = "urbanforge:cart:v1:guest";
export const cartStorageKey = (accountId: string) => `urbanforge:cart:v1:user:${encodeURIComponent(accountId)}`;
const itemSchema = z.object({
  id: z.string().min(1).max(1000), productId: z.string().min(1).max(100).optional(), variantId: z.string().max(100).optional(),
  name: z.string().min(1).max(500), details: z.string().max(2000), size: z.string().max(200),
  price: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  image: z.string().min(1).max(2048).refine(value => /^\/(?!\/)/.test(value) || /^https?:\/\//.test(value)),
  imageStyle: z.enum(["shoes", "sunglasses"]).optional(),
  quantity: z.number().int().min(1).max(99), maxQuantity: z.number().int().nonnegative().max(1_000_000).optional(),
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
