import type { Product } from "./products";

export type StoredCartItem = {
  uid: string;
  product: Product;
  qty: number;
  extras: number;
  selections: Record<string, string[]>;
  notes: string;
};

const KEY = "amoacai_cart_v1";
const NOTES_KEY = "amoacai_cart_notes_v1";

export function saveCart(items: StoredCartItem[], notes: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    localStorage.setItem(NOTES_KEY, notes);
  } catch { /* ignore */ }
}

export function loadCart(): { items: StoredCartItem[]; notes: string } {
  if (typeof window === "undefined") return { items: [], notes: "" };
  try {
    const raw = localStorage.getItem(KEY);
    const items = raw ? (JSON.parse(raw) as StoredCartItem[]) : [];
    const notes = localStorage.getItem(NOTES_KEY) || "";
    return { items, notes };
  } catch {
    return { items: [], notes: "" };
  }
}

export function clearCart() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(NOTES_KEY);
  } catch { /* ignore */ }
}

export function currentSearchString(): string {
  if (typeof window === "undefined") return "";
  return window.location.search || "";
}