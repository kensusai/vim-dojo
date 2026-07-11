/**
 * Provides the app's zustand store to the component tree. The store is created
 * once at boot (App) with the opened ProgressStore and loaded Profile, then
 * shared via context so screens can subscribe with useAppStore(selector).
 */
import { createContext, useContext, type ReactNode } from "react";
import { useStore } from "zustand";
import type { AppStore } from "./store";

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({
  store,
  children,
}: {
  store: AppStore;
  children: ReactNode;
}) {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useAppStore<T>(
  selector: (state: ReturnType<AppStore["getState"]>) => T,
): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAppStore must be used within StoreProvider");
  return useStore(store, selector);
}
