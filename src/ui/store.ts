/**
 * App store (zustand): the single Profile shared across screens, plus
 * navigation. Persistence and all rule math stay in core/storage; this store
 * only holds the current Profile in memory and forwards saves. Screens read
 * the profile and dispatch intents — they never compute rules (docs/frontend.md).
 */
import { create } from "zustand";
import type { Difficulty } from "../core/difficulty";
import { isBackupConfigured, pushBackup } from "../backup/gistBackup";
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

/**
 * Debounced cloud backup (ADR-0008): after progress changes settle, push the
 * whole export to the configured gist. Best-effort — failures are logged, not
 * surfaced (the local save already succeeded).
 */
let backupTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleBackup(store: ProgressStore) {
  if (!isBackupConfigured()) return;
  clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    void store
      .exportJson()
      .then((json) => pushBackup(json))
      .catch((error) => console.warn("[backup] push failed:", error));
  }, 4000);
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
      scheduleBackup(get().store);
    },
    dismissToast: () => set({ unlockedToast: [] }),
    navigate: (route) => set({ route }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
