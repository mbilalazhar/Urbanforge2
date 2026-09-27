export const initialProfile = {
  name: "Bilal Azhar",
  email: "bilalazharx@gmail.com",
  phone: "+92 300 1234567",
};

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
const pants = { name: "Tactical Cargo Pants", image: "/bottoms.png", crop: "pants", price: 4480 };
const tee = { name: "Shadow Graphic Tee", image: "/tee.png", crop: "tee", price: 2490 };
const watch = { name: "Urban Utility Watch", image: "/watch.png", crop: "watch", price: 5990 };
const bag = { name: "Everyday Crossbody Bag", image: "/accessories.png", crop: "bag", price: 3820 };

export const currentOrders: Order[] = [
  { id: "UF1024", date: "Sep 24, 2026", status: "Delivered", update: "Delivered on Sep 27, 2026", items: [sneakers, jacket, pants, tee] },
  { id: "UF1023", date: "Sep 18, 2026", status: "Shipped", update: "Expected by Sep 22, 2026", items: [sneakers] },
  { id: "UF1022", date: "Sep 12, 2026", status: "Processing", update: "Estimated by Sep 16, 2026", items: [tee, bag, watch] },
  { id: "UF1021", date: "Aug 28, 2026", status: "Cancelled", update: "Cancelled on Aug 29, 2026", items: [{ ...sneakers, price: 15990 }] },
];

export const pastOrders: Order[] = [
  { id: "UF1019", date: "Jul 12, 2026", status: "Delivered", update: "Delivered on Jul 16, 2026", items: [jacket, { ...tee, price: 4310 }] },
  { id: "UF1018", date: "Jun 28, 2026", status: "Delivered", update: "Delivered on Jul 2, 2026", items: [sneakers] },
  { id: "UF1017", date: "May 16, 2026", status: "Delivered", update: "Delivered on May 20, 2026", items: [bag, tee, watch] },
  { id: "UF1016", date: "Apr 2, 2026", status: "Delivered", update: "Delivered on Apr 6, 2026", items: [tee] },
  { id: "UF1015", date: "Mar 14, 2026", status: "Delivered", update: "Delivered on Mar 18, 2026", items: [pants] },
  { id: "UF1014", date: "Feb 6, 2026", status: "Delivered", update: "Delivered on Feb 10, 2026", items: [jacket, sneakers] },
];

export const wishlistItems = [jacket, sneakers, watch];
export const money = (amount: number) => `Rs. ${amount.toLocaleString("en-PK")}`;
export const orderTotal = (order: Order) => order.items.reduce((sum, item) => sum + item.price, 0);
