"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { initialCartItems, type CartItem } from "@/lib/cart-data";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  changeQuantity: (id: string, change: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(initialCartItems);

  function changeQuantity(id: string, change: number) {
    setItems(current => current.map(item => item.id === id
      ? { ...item, quantity: Math.max(1, Math.min(99, item.quantity + change)) }
      : item));
  }

  return (
    <CartContext.Provider value={{
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
      changeQuantity,
      removeItem: id => setItems(current => current.filter(item => item.id !== id)),
      clearCart: () => setItems([]),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}
