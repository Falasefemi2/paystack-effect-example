"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type { CartItem } from "@/lib/api";

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; productId: string }
  | { type: "REMOVE"; productId: string }
  | { type: "CLEAR" };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find((i) => i.productId === action.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { productId: action.productId, quantity: 1 }] };
    }
    case "REMOVE": {
      return {
        items: state.items
          .map((i) =>
            i.productId === action.productId ? { ...i, quantity: i.quantity - 1 } : i,
          )
          .filter((i) => i.quantity > 0),
      };
    }
    case "CLEAR":
      return { items: [] };
  }
}

interface CartContextValue {
  items: CartItem[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      add: (productId) => dispatch({ type: "ADD", productId }),
      remove: (productId) => dispatch({ type: "REMOVE", productId }),
      clear: () => dispatch({ type: "CLEAR" }),
    }),
    [state.items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
