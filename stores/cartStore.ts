import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
  size?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    const existing = get().items.find((i) => i.id === item.id);
    if (existing) {
      set((state) => ({
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        ),
      }));
    } else {
      set((state) => ({ items: [...state.items, { ...item, qty: 1 }] }));
    }
  },

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  updateQty: (id, qty) => {
    if (qty <= 0) {
      get().removeItem(id);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
    }));
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}));
