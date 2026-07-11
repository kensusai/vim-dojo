/**
 * App store (zustand): the single Profile shared across screens, plus
 * navigation. Persistence and all rule math stay in core/storage; this store
 * only holds the current Profile in memory and forwards saves. Screens read
 * the profile and dispatch intents — they never compute rules (docs/frontend.md).
 */
import { create } from "zustand";
import type { Clock, ProgressStore } from "../core/ports";
import type { Profile } from "../core/profile";

export type Route =
  | { screen: "home" }
  | { screen: "lesson"; stageIndex: number; lessonIndex: number }
  | { screen: "daily" }
  | { screen: "drill" };

interface AppState {
  store: ProgressStore;
  clock: Clock;
  profile: Profile;
  route: Route;
  /** Replace the profile and persist it (fire-and-forget save). */
  setProfile: (profile: Profile) => void;
  navigate: (route: Route) => void;
}

export function createAppStore(
  store: ProgressStore,
  clock: Clock,
  profile: Profile,
) {
  return create<AppState>((set, get) => ({
    store,
    clock,
    profile,
    route: { screen: "home" },
    setProfile: (profile) => {
      set({ profile });
      void get().store.saveProfile(profile);
    },
    navigate: (route) => set({ route }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
