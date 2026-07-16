/**
 * Root component: boots persistence, builds the app store, then routes between
 * the home and lesson screens. Boot state is a discriminated union
 * (docs/frontend.md) — no boolean soup.
 */
import { useEffect, useState } from "react";
import type { Clock, ProgressStore } from "../core/ports";
import { createAppStore, type AppStore } from "./store";
import { StoreProvider, useAppStore } from "./storeContext";
import { AchievementToast } from "./AchievementToast";
import { DailyScreen } from "./DailyScreen";
import { DrillScreen } from "./DrillScreen";
import { HomeScreen } from "./HomeScreen";
import { QuizScreen } from "./QuizScreen";
import { LessonScreen } from "./LessonScreen";

type BootState =
  | { status: "loading" }
  | { status: "ready"; appStore: AppStore }
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
        if (cancelled) return;
        const appStore = createAppStore(store, clock, profile);
        // Deep link from the daily reminder: ?mode=quiz opens the phone quiz.
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "quiz") {
          appStore.getState().navigate({ screen: "quiz" });
        }
        setBoot({ status: "ready", appStore });
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
  }, [openStore, clock]);

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
            からのインポートで復旧できます(M8 で追加予定)。
          </p>
        </main>
      );
    case "ready":
      return (
        <StoreProvider store={boot.appStore}>
          <Router />
          <AchievementToast />
        </StoreProvider>
      );
  }
}

function Router() {
  const route = useAppStore((s) => s.route);
  switch (route.screen) {
    case "home":
      return <HomeScreen />;
    case "lesson":
      return (
        <LessonScreen
          key={`${route.stageIndex}-${route.lessonIndex}`}
          stageIndex={route.stageIndex}
          lessonIndex={route.lessonIndex}
        />
      );
    case "daily":
      return <DailyScreen />;
    case "drill":
      return <DrillScreen />;
    case "quiz":
      return <QuizScreen />;
  }
}
