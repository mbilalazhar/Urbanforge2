import type { CustomerOrder } from "@/lib/checkout/types";
export type OrderItem = { name: string; image: string; price: number; quantity: number; details: string };
export type Order = { id: string; date: string; status: string; update: string; items: OrderItem[]; total: number; past: boolean; shipping: number; discount: number; address: string; paymentStatus: string };
export function accountOrder(order: CustomerOrder): Order {
  return { id: order.number, date: new Date(order.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
    status: order.status === "new" ? "Processing" : order.status.charAt(0).toUpperCase() + order.status.slice(1),
    update: order.trackingNumber ? [order.courier, order.trackingNumber].filter(Boolean).join(" · ") : order.status === "new" ? "Your order has been received." : `Order ${order.status}.`,
    items: order.items.map(item => ({ name: item.name, image: item.image, price: item.price, quantity: item.quantity, details: [item.color, item.size].filter(Boolean).join(" · ") })),
    total: order.total, past: ["delivered", "cancelled", "returned", "refunded"].includes(order.status), shipping: order.shipping, discount: order.discount, address: order.address, paymentStatus: order.paymentStatus,
  };
}
export const money = (amount: number) => `Rs. ${amount.toLocaleString("en-PK")}`;
export const orderTotal = (order: Order) => order.total;
export const orderQuantity = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0);
