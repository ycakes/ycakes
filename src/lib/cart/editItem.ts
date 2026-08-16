import type { CartItem } from "@/types/cart";

const KEY = "ycakes_edit_cart_item";

/** Cart's Edit button stashes the item here before navigating to its Cake
 * Detail page; CakeCustomizer reads it once on mount to pre-fill the form.
 * The original cart item is left untouched — editing always adds a new
 * item rather than replacing it, per the owner's decision. */
export function setEditCartItem(item: CartItem) {
  sessionStorage.setItem(KEY, JSON.stringify(item));
}

export function getEditCartItem(): CartItem | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CartItem;
  } catch {
    return null;
  }
}

export function clearEditCartItem() {
  sessionStorage.removeItem(KEY);
}
