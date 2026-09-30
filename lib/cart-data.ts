export type CartItem = {
  id: string; productId?: string; variantId?: string;
  name: string; details: string; size: string;
  /** Price in paisa (PKR / 100). */
  price: number; image: string; imageStyle?: "shoes" | "sunglasses";
  quantity: number; maxQuantity?: number;
};
export function formatCartPrice(paisa: number) {
  return `Rs. ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(paisa / 100)}`;
}

const sameStock = (a: CartItem, b: CartItem) => a.productId && b.productId ? a.productId === b.productId && a.variantId === b.variantId : a.id === b.id;
export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find(entry => entry.id === item.id);
  const otherQuantity = items.filter(entry => entry.id !== item.id && sameStock(entry, item)).reduce((sum, entry) => sum + entry.quantity, 0);
  const limit = Math.max(0, Math.min(99, (item.maxQuantity ?? 99) - otherQuantity));
  const quantity = Math.min(limit, (existing?.quantity ?? 0) + item.quantity);
  if (quantity <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0) return items;
  const next = { ...item, quantity };
  return existing ? items.map(entry => entry.id === item.id ? next : entry) : [...items, next];
}
export function changeCartQuantity(items: CartItem[], id: string, change: number): CartItem[] {
  if (!Number.isInteger(change)) return items;
  return items.map(item => {
    if (item.id !== id) return item;
    const otherQuantity = items.filter(entry => entry.id !== id && sameStock(entry, item)).reduce((sum, entry) => sum + entry.quantity, 0);
    return { ...item, quantity: Math.max(1, Math.min(99, (item.maxQuantity ?? 99) - otherQuantity, item.quantity + change)) };
  });
}
