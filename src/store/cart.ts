import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/cart";

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      setQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  quantity,
                  lineEstimate:
                    (i.unitBasePrice + i.priceModifiersTotal) * quantity,
                }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "ycakes-cart" },
  ),
);

export function useCartCount() {
  return useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
}

export function useCartSubtotal() {
  return useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.lineEstimate, 0),
  );
}
