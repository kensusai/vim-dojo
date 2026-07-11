/**
 * Root component: boots persistence, then hands the profile to the practice
 * screen. Boot state is a discriminated union (docs/frontend.md) — no
 * boolean soup.
 */
import { useEffect, useState } from "react";
import { sampleDrillExercises } from "../core/curriculum/sampleDrill";
import type { Clock, ProgressStore } from "../core/ports";
import type { Profile } from "../core/profile";
import { PracticeScreen } from "./PracticeScreen";

type BootState =
  | { status: "loading" }
  | { status: "ready"; store: ProgressStore; profile: Profile }
  | { status: "error"; message: string };

export function App({
  openStore,
  clock,
}: {
  openStore: () => Promise<ProgressStore>;
  clock: Clock;
}) {
  const [boot, setBoot] = useState<BootState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const store = await openStore();
        const profile = await store.loadProfile();
        if (!cancelled) setBoot({ status: "ready", store, profile });
      } catch (error) {
        if (!cancelled)
          setBoot({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openStore]);

  switch (boot.status) {
    case "loading":
      return (
        <main className="flex min-h-screen items-center justify-center font-mono text-cream-faint">
          LOADING<span className="blink">▮</span>
        </main>
      );
    case "error":
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 font-mono">
          <p className="text-shu">進捗データの読み込みに失敗しました。</p>
          <p className="max-w-xl text-xs text-cream-faint">{boot.message}</p>
          <p className="text-xs text-cream-dim">
            ブラウザを再読み込みしても直らない場合は、エクスポート済みの JSON
            からのインポートで復旧できます(未実装の画面は M8 で追加予定)。
          </p>
        </main>
      );
    case "ready":
      return (
        <PracticeScreen
          exercises={sampleDrillExercises}
          profile={boot.profile}
          store={boot.store}
          clock={clock}
          onProfileChange={(profile) =>
            setBoot((b) => (b.status === "ready" ? { ...b, profile } : b))
          }
        />
      );
  }
}
