export type ProductVariant = { id: string; sku: string; color: string; size: string; stock: number };
export type AdminProduct = {
  id: string; name: string; description: string; shortDescription: string;
  category: string; subcategory: string; productType?: string; brand: string; gender: string;
  price: number; salePrice: number | null; sku: string; images: string[]; videos: string[];
  colors: string[]; sizes: string[]; material: string; stock: number; tags: string[];
  status: "active" | "inactive"; featured: boolean; newArrival: boolean; bestseller: boolean;
  seoTitle: string; seoDescription: string; variants: ProductVariant[];
  views: number; createdAt: string; updatedAt: string;
};
export const orderStatuses = ["new", "processing", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned", "refunded"] as const;
export type OrderStatus = typeof orderStatuses[number];
export type OrderItem = { productId: string; variantId?: string; name: string; sku: string; quantity: number; price: number; image: string };
export type AdminOrder = {
  id: string; number: string; customerName: string; email: string; phone: string; address: string;
  items: OrderItem[]; subtotal: number; shipping: number; discount: number; total: number;
  status: OrderStatus; paymentStatus: "pending" | "paid" | "refunded";
  courier: string; trackingNumber: string; notes: string;
  returnStatus: "none" | "requested" | "approved" | "rejected";
  createdAt: string; updatedAt: string;
};
export type AdminCustomer = { id: string; name: string; email: string; createdAt: string; orders: number; spent: number };
export type InventorySummary = { units: number; trackedSkus: number; lowStockSkus: number; outOfStockSkus: number };
export type InventoryData = { products: AdminProduct[]; summary: InventorySummary };
export type InventoryHistory = { movements: StockMovement[]; products: { id: string; name: string }[]; total: number; page: number; pages: number; limit: number };
export type StockMovement = { sku?: string; variantLabel?: string; id: string; productId: string; productName: string; variantId: string; type: "added" | "sold" | "returned" | "adjustment"; quantity: number; before: number; after: number; reason: string; createdAt: string };
export type AdminCoupon = {
  id: string; code: string; type: "percentage" | "fixed" | "free_shipping"; value: number;
  minimumPurchase: number; maximumDiscount: number | null; startsAt: string; endsAt: string;
  usageLimit: number; usedCount: number; productIds: string[]; categories: string[];
  customerEmails: string[]; firstOrderOnly: boolean; active: boolean; createdAt: string;
};
export type AdminPromotion = {
  id: string; name: string; banner: string; startsAt: string; endsAt: string;
  productIds: string[]; discountPercent: number; active: boolean;
  state: "scheduled" | "active" | "ended" | "inactive"; createdAt: string;
};
export type AdminDashboard = {
  products: AdminProduct[]; orders: AdminOrder[]; customers: AdminCustomer[];
};
