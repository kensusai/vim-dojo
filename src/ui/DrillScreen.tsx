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
  };

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
      onAttemptFinished={onAttemptFinished}
      renderResult={(info, controls) => (
        <DrillResult
          info={info}
          xpGained={lastXp}
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
  onRetry,
  onNext,
}: {
  info: FinishedInfo;
  xpGained: number;
  onRetry: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <MedalHeadline attempt={info.attempt} />
      {info.isLastExercise && (
        <div className="mt-3 font-mono text-sm font-black text-matcha">
          5本勝負、完!!
        </div>
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
