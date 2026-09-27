import type { Product } from "@/components/product/ProductCard";

export const featuredProducts: Product[] = [
  {
    id: 1,
    name: "Urban Windbreaker Jacket",
    category: "Outerwear",
    price: "$129.00",
    image: "/jacket.png",
    tag: "NEW",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Charcoal", hex: "#4a4a4a" },
      { name: "Off-white", hex: "#d9d9d9" },
    ],
  },
  {
    id: 2,
    name: "Oversized Crop Hoodie",
    category: "Hoodies",
    price: "$89.00",
    image: "/hoodie.png",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Red", hex: "#e53e3e" },
      { name: "Grey", hex: "#8a8a8a" },
    ],
  },
  {
    id: 3,
    name: "Shadow Graphic Tee",
    category: "T-Shirts",
    price: "$49.00",
    image: "/tee.png",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Charcoal", hex: "#5a5a5a" },
      { name: "Bone", hex: "#d5cdbf" },
    ],
  },
  {
    id: 4,
    name: "Tactical Cargo Pants",
    category: "Bottoms",
    price: "$109.00",
    image: "/bottoms.png",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Olive", hex: "#4a4a35" },
      { name: "Khaki", hex: "#8b8060" },
    ],
  },
    {
    id: 5,
    name: "Tactical Cargo Watches",
    category: "Watches",
    price: "$159.00",
    image: "/watch.png",
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Olive", hex: "#4a4a35" },
      { name: "Khaki", hex: "#8b8060" },
    ],
  },
];

export const products: Product[] = [
  ...featuredProducts,
  { id: "high-top-sneakers", name: "Urban High-Top Sneakers", category: "Shoes", price: "$120.00", image: "/shoes.png", tag: "NEW", colors: [{ name: "Black", hex: "#111111" }, { name: "Off-white", hex: "#d9d9d9" }] },
  { id: "utility-hoodie", name: "Oversized Utility Hoodie", category: "Hoodies", price: "$79.00", image: "/hoodie.png", colors: [{ name: "Black", hex: "#111111" }, { name: "Grey", hex: "#8a8a8a" }] },
  { id: "crossbody-bag", name: "Everyday Crossbody Bag", category: "Bags", price: "$65.00", image: "/accessories.png", colors: [{ name: "Black", hex: "#111111" }] },
];

export function productPrice(product: Product) {
  return Number(product.price.replace(/^[^0-9]*/, "").replace(/[^0-9.]/g, ""));
}
