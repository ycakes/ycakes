import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/cart";

export type FulfillmentMethod = "pickup" | "delivery";

/** Phase 4 checkout page exists now — flipped on. */
export const CHECKOUT_ENABLED = true;

type CartState = {
  items: CartItem[];
  fulfillmentMethod: FulfillmentMethod | null;
  deliveryAreaId: string | null;
  /** ISO date, 'YYYY-MM-DD'. */
  fulfillmentDate: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  setFulfillmentMethod: (method: FulfillmentMethod | null) => void;
  setDeliveryAreaId: (id: string | null) => void;
  setFulfillmentDate: (date: string | null) => void;
  clear: () => void;
};

const emptyFulfillment = {
  fulfillmentMethod: null as FulfillmentMethod | null,
  deliveryAreaId: null as string | null,
  fulfillmentDate: null as string | null,
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ...emptyFulfillment,
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
      setFulfillmentMethod: (method) =>
        set({ fulfillmentMethod: method, deliveryAreaId: null }),
      setDeliveryAreaId: (id) => set({ deliveryAreaId: id }),
      setFulfillmentDate: (date) => set({ fulfillmentDate: date }),
      clear: () => set({ items: [], ...emptyFulfillment }),
    }),
    {
      name: "ycakes-cart",
      version: 2,
      // v0 carts predate colorIds/colorNames (were colorId/colorName) —
      // incompatible shape. v1 carts predate fulfillment method/area/date.
      // No real order data exists yet, so old carts reset rather than
      // attempting a real migration.
      migrate: (persisted, version) => {
        if (version < 1) return { items: [], ...emptyFulfillment };
        if (version < 2) return { ...(persisted as CartState), ...emptyFulfillment };
        return persisted as CartState;
      },
    },
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

/** Date always required; delivery additionally requires an area. Pickup needs no area. */
export function useFulfillmentComplete() {
  return useCartStore((state) => {
    if (!state.fulfillmentDate || !state.fulfillmentMethod) return false;
    if (state.fulfillmentMethod === "delivery" && !state.deliveryAreaId) return false;
    return true;
  });
}
