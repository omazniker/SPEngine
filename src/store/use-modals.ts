import { create, type StoreApi, type UseBoundStore } from "zustand";

/**
 * Zustand-Stores für Sheets und Dialoge, die aus mehreren Stellen geöffnet werden
 * müssen (Cross-Component). Für einfache lokale Fälle (ein Trigger) reicht
 * `useState` direkt — siehe AGENTS.md §"State Management".
 */

export interface SheetStoreState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

export interface SheetStoreStateWithPayload<T> extends SheetStoreState {
  payload: T | null;
  openWith: (payload: T) => void;
}

export function createSheetStore(): UseBoundStore<StoreApi<SheetStoreState>> {
  return create<SheetStoreState>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
    close: () => set({ open: false }),
  }));
}

export function createSheetStoreWithPayload<T>(): UseBoundStore<
  StoreApi<SheetStoreStateWithPayload<T>>
> {
  return create<SheetStoreStateWithPayload<T>>((set) => ({
    open: false,
    payload: null,
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
    close: () => set({ open: false, payload: null }),
    openWith: (payload) => set({ open: true, payload }),
  }));
}
