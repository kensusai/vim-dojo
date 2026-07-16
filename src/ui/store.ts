/**
 * App store (zustand): the single Profile shared across screens, plus
 * navigation. Persistence and all rule math stay in core/storage; this store
 * only holds the current Profile in memory and forwards saves. Screens read
 * the profile and dispatch intents — they never compute rules (docs/frontend.md).
 */
import { create } from "zustand";
import type { Difficulty } from "../core/difficulty";
import type { Clock, ProgressStore } from "../core/ports";
import type { Profile } from "../core/profile";
import {
  evaluateAchievements,
  type AchievementDef,
} from "../core/progression/achievements";

export type Route =
  | { screen: "home" }
  | { screen: "lesson"; stageIndex: number; lessonIndex: number }
  | { screen: "daily" }
  | { screen: "drill" }
  | { screen: "quiz" };

const DIFFICULTY_KEY = "vim-dojo-difficulty";
function loadDifficulty(): Difficulty {
  const v =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(DIFFICULTY_KEY)
      : null;
  return v === "easy" || v === "hard" ? v : "normal";
}

interface AppState {
  store: ProgressStore;
  clock: Clock;
  profile: Profile;
  route: Route;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  /** Achievements unlocked by the latest profile change, for the toast. */
  unlockedToast: AchievementDef[];
  /**
   * Replace the profile, run achievement evaluation (R18) and persist the
   * result (fire-and-forget save).
   */
  setProfile: (profile: Profile) => void;
  dismissToast: () => void;
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
    difficulty: loadDifficulty(),
    setDifficulty: (difficulty) => {
      localStorage.setItem(DIFFICULTY_KEY, difficulty);
      set({ difficulty });
    },
    unlockedToast: [],
    setProfile: (profile) => {
      const { profile: withAchievements, newlyUnlocked } = evaluateAchievements(
        profile,
        get().clock.now(),
      );
      set((state) => ({
        profile: withAchievements,
        unlockedToast: newlyUnlocked.length
          ? [...state.unlockedToast, ...newlyUnlocked]
          : state.unlockedToast,
      }));
      void get().store.saveProfile(withAchievements);
    },
    dismissToast: () => set({ unlockedToast: [] }),
    navigate: (route) => set({ route }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
