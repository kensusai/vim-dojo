/**
 * Drill screen: five generated exercises weighted toward weak commands
 * (R19, P6). Completing the session counts as the day's learning activity.
 */
import { useEffect, useRef, useState } from "react";
import { weakCommands } from "../core/analytics/weakness";
import {
  applyPracticeAttempt,
  recordLearningActivity,
} from "../core/applyProgress";
import { unlockedCommands } from "../core/curriculum/curriculum";
import { stages } from "../core/curriculum/stages";
import { generateDrill } from "../core/generation/generate";
import type { Exercise } from "../core/practice/exercise";
import type { Medal } from "../core/practice/medal";
import {
  MedalHeadline,
  PracticePlayer,
  ResultFooter,
  StreakChip,
  type FinishedInfo,
} from "./PracticePlayer";
import { useAppStore } from "./storeContext";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; exercises: Exercise[] };

export function DrillScreen() {
  const store = useAppStore((s) => s.store);
  const clock = useAppStore((s) => s.clock);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const navigate = useAppStore((s) => s.navigate);
  const [state, setState] = useState<State>({ status: "loading" });
  const [lastXp, setLastXp] = useState(0);
  const [bounty, setBounty] = useState<(Medal | "abandoned" | null)[]>([]);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const attempts = await store.loadAttempts(); // analytics path, not boot
      if (cancelled) return;
      const exercises = generateDrill({
        seed: clock.now().getTime().toString(),
        unlocked: unlockedCommands(profileRef.current, stages),
        weakCommands: weakCommands(attempts),
      });
      setBounty(exercises.map(() => null));
      setState(
        exercises.length === 0
          ? { status: "unavailable" }
          : { status: "ready", exercises },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [clock, store]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center font-mono text-cream-faint">
        LOADING<span className="blink">▮</span>
      </main>
    );
  }
  if (state.status === "unavailable") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 font-mono">
        <p>ドリルは最初のレッスンをクリアすると開放される。</p>
        <button
          type="button"
          className="btn-chunky border-b-[6px] border-shu-dark bg-shu px-8 py-3 font-black text-[#fff6ec]"
          onClick={() => navigate({ screen: "home" })}
        >
          ホームへ
        </button>
      </main>
    );
  }

  const onAttemptFinished = (info: FinishedInfo) => {
    void store.appendAttempt(info.attempt);
    const practice = applyPracticeAttempt(profileRef.current, info.attempt);
    let next = practice.profile;
    if (info.isLastExercise) {
      next = recordLearningActivity(next, info.attempt.playedAt).profile;
    }
    if (next !== profileRef.current) setProfile(next);
    setLastXp(practice.xpGained);
    setBounty((b) =>
      b.map((r, i) =>
        i === info.exerciseIndex ? (info.attempt.medal ?? "abandoned") : r,
      ),
    );
  };

  // 敵リスト: 進行は線形なので「未撃破の先頭」が現在の相手
  const currentEnemy = bounty.findIndex((r) => r === null);

  return (
    <PracticePlayer
      exercises={state.exercises}
      source="drill"
      headerLeft={
        <>
          <button
            type="button"
            onClick={() => navigate({ screen: "home" })}
            className="text-sm text-cream-faint hover:text-cream"
          >
            ← MAP
          </button>
          <span className="border-2 border-ink px-2 text-[10px] tracking-widest text-shu">
            DRILL · 5本勝負
          </span>
        </>
      }
      sidePanel={
        <div className="pixel-panel p-4">
          <div className="mb-3 font-mono text-xs font-black tracking-[0.2em] text-shu">
            ⚔️ WANTED — 賞金首{" "}
            {bounty.filter((r) => r && r !== "abandoned").length}/
            {state.exercises.length} 撃破
          </div>
          <div className="flex flex-col gap-2">
            {state.exercises.map((ex, i) => {
              const result = bounty[i];
              const isCurrent = i === currentEnemy;
              return (
                <div
                  key={ex.id}
                  className={`flex items-center gap-3 border-2 px-3 py-1.5 font-mono text-sm ${
                    isCurrent
                      ? "border-shu bg-[#241512]"
                      : result
                        ? "border-ink opacity-60"
                        : "border-ink-bold opacity-40"
                  }`}
                >
                  <span className="text-xl">
                    {result === null
                      ? "👾"
                      : result === "abandoned"
                        ? "💨"
                        : "💥"}
                  </span>
                  <span
                    className={`font-black ${isCurrent ? "text-shu" : "text-cream-dim"} ${result && result !== "abandoned" ? "line-through" : ""}`}
                  >
                    {ex.practicedCommands[0]}
                  </span>
                  {isCurrent && (
                    <span className="blink ml-auto text-[10px] text-gold">
                      ◀ いまの相手
                    </span>
                  )}
                  {result && result !== "abandoned" && (
                    <span className="ml-auto">
                      {result === "gold"
                        ? "🥇"
                        : result === "silver"
                          ? "🥈"
                          : "🥉"}
                    </span>
                  )}
                  {result === "abandoned" && (
                    <span className="ml-auto text-[10px] text-cream-faint">
                      逃げられた
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {state.exercises[currentEnemy]?.hint && (
            <p className="mt-3 border-t-2 border-ink pt-2 text-xs text-cream-dim">
              💡 {state.exercises[currentEnemy].hint}
            </p>
          )}
        </div>
      }
      onAttemptFinished={onAttemptFinished}
      renderResult={(info, controls) => (
        <DrillResult
          info={info}
          xpGained={lastXp}
          bounty={bounty}
          onRetry={controls.retry}
          onNext={
            info.isLastExercise
              ? () => navigate({ screen: "home" })
              : controls.advance
          }
        />
      )}
    />
  );
}

function DrillResult({
  info,
  xpGained,
  bounty,
  onRetry,
  onNext,
}: {
  info: FinishedInfo;
  xpGained: number;
  bounty: (Medal | "abandoned" | null)[];
  onRetry: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <MedalHeadline attempt={info.attempt} />
      {info.isLastExercise && (
        <>
          <div className="mt-3 font-mono text-sm font-black text-matcha">
            5本勝負、完!! 戦績:
          </div>
          <div className="mt-1 text-2xl tracking-widest">
            {bounty
              .map((r) =>
                r === "gold"
                  ? "🥇"
                  : r === "silver"
                    ? "🥈"
                    : r === "bronze"
                      ? "🥉"
                      : "💨",
              )
              .join(" ")}
          </div>
        </>
      )}
      <ResultFooter
        xpGained={xpGained}
        primaryLabel={info.isLastExercise ? "ホームへ ▶" : "次のお題 ▶"}
        onPrimary={onNext}
        onRetry={onRetry}
        extraChips={info.isLastExercise ? <StreakChip /> : undefined}
      />
    </>
  );
}
