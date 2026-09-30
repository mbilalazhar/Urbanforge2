export type OrderItem = { name: string; image: string; crop: string; price: number };
export type Order = {
  id: string;
  date: string;
  status: "Delivered" | "Shipped" | "Processing" | "Cancelled";
  update: string;
  items: OrderItem[];
};

const sneakers = { name: "Urban High-Top Sneakers", image: "/shoes.png", crop: "shoes", price: 8990 };
const jacket = { name: "Urban Windbreaker Jacket", image: "/jacket.png", crop: "jacket", price: 5490 };
const watch = { name: "Urban Utility Watch", image: "/watch.png", crop: "watch", price: 5990 };

// Order data will be loaded using the user's currentOrderIds / pastOrderIds
// when the order-history APIs are implemented. Never display another user's samples.
export const currentOrders: Order[] = [];
export const pastOrders: Order[] = [];

export const wishlistItems = [jacket, sneakers, watch];
export const money = (amount: number) => `Rs. ${amount.toLocaleString("en-PK")}`;
export const orderTotal = (order: Order) => order.items.reduce((sum, item) => sum + item.price, 0);
