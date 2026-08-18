import type { CartItem } from "@/types/cart";

const KEY = "ycakes_edit_cart_item";

/** Cart's Edit button stashes the item here before navigating to its Cake
 * Detail page; CakeCustomizer reads it once on mount to pre-fill the form
 * and remembers the item's id so "Save Changes" updates that same cart row
 * in place instead of appending a new one. */
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
