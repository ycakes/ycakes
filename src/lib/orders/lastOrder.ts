import type { OrderConfirmationSnapshot } from "@/types/orders";

const KEY = "ycakes_last_order";

export function setLastOrder(snapshot: OrderConfirmationSnapshot) {
  sessionStorage.setItem(KEY, JSON.stringify(snapshot));
}

export function getLastOrder(): OrderConfirmationSnapshot | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OrderConfirmationSnapshot;
  } catch {
    return null;
  }
}

export function clearLastOrder() {
  sessionStorage.removeItem(KEY);
}
