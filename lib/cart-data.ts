export type CartItem = {
  id: string;
  name: string;
  details: string;
  size: string;
  price: number;
  image: string;
  imageStyle?: "shoes" | "sunglasses";
  quantity: number;
};

// Prices are in cents. Replace these sample items with the cart API later.
export const initialCartItems: CartItem[] = [
  { id: "utility-hoodie-black-l", name: "Oversized Utility Hoodie", details: "Men / Hoodies / Black", size: "Size: L", price: 7900, image: "/hoodie.png", quantity: 1 },
  { id: "high-top-phantom-9", name: "Urban High-Top Sneakers", details: "Men / Shoes / Phantom", size: "Size: 9 (US)", price: 12000, image: "/shoes.png", imageStyle: "shoes", quantity: 1 },
  { id: "stealth-sunglasses-black", name: "Stealth Sunglasses", details: "Accessories / Eyewear / Black", size: "One Size", price: 4500, image: "/footer.png", imageStyle: "sunglasses", quantity: 1 },
];

export function formatCartPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
