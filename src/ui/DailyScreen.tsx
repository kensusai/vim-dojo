/**
 * Daily challenge screen (R13–R15): resolves today's frozen record (creating
 * and persisting it on first open), plays it via PracticePlayer, and settles
 * XP/streak through core's applyDailyAttempt.
 */
import { useEffect, useRef, useState } from "react";
import { applyDailyAttempt, resolveDailyChallenge } from "../core/daily";
import { localDateOf } from "../core/localDate";
import type { DailyChallengeRecord } from "../core/ports";
import {
  MedalHeadline,
  PracticePlayer,
  ResultFooter,
  type FinishedInfo,
} from "./PracticePlayer";
import { useAppStore } from "./storeContext";

type State =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; record: DailyChallengeRecord };

export function DailyScreen() {
  const store = useAppStore((s) => s.store);
  const clock = useAppStore((s) => s.clock);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const navigate = useAppStore((s) => s.navigate);
  const [state, setState] = useState<State>({ status: "loading" });
  const [settled, setSettled] = useState<{ xpGained: number } | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = localDateOf(clock.now());
      const existing = await store.loadDailyChallenge(today);
      const record = resolveDailyChallenge(existing, today, profileRef.current);
      if (cancelled) return;
      if (!record) {
        setState({ status: "unavailable" });
        return;
      }
      if (!existing) await store.saveDailyChallenge(record); // freeze (R13)
      setState({ status: "ready", record });
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
        <p>デイリーチャレンジは最初のレッスンをクリアすると開放される。</p>
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

  const record = state.record;

  const onAttemptFinished = (info: FinishedInfo) => {
    void store.appendAttempt(info.attempt);
    const outcome = applyDailyAttempt(profileRef.current, record, info.attempt);
    if (outcome.profile !== profileRef.current) {
      setProfile(outcome.profile);
      void store.saveDailyChallenge(outcome.record);
      setState({ status: "ready", record: outcome.record });
    }
    setSettled({ xpGained: outcome.xpGained });
  };

  return (
    <PracticePlayer
      exercises={[record.exercise]}
      source="daily"
      headerLeft={
        <>
          <button
            type="button"
            onClick={() => navigate({ screen: "home" })}
            className="text-sm text-cream-faint hover:text-cream"
          >
            ← MAP
          </button>
          <span className="border-2 border-ink px-2 text-[0.625rem] tracking-widest text-gold">
            TODAY&apos;S QUEST · {record.date}
          </span>
        </>
      }
      onAttemptFinished={onAttemptFinished}
      renderResult={(info, controls) => (
        <DailyResult
          info={info}
          xpGained={settled?.xpGained ?? 0}
          onRetry={controls.retry}
          onHome={() => navigate({ screen: "home" })}
        />
      )}
    />
  );
}

function DailyResult({
  info,
  xpGained,
  onRetry,
  onHome,
}: {
  info: FinishedInfo;
  xpGained: number;
  onRetry: () => void;
  onHome: () => void;
}) {
  const profile = useAppStore((s) => s.profile);
  return (
    <>
      <MedalHeadline attempt={info.attempt} />
      <div className="mt-3 font-mono text-sm font-black text-matcha">
        今日の修行、納め!! 🔥{profile.streak.current}日
      </div>
      <p className="mt-2 text-xs text-cream-faint">
        自己ベスト:{" "}
        {profile.exerciseBests[info.attempt.exerciseId]?.keystrokes ?? "—"}{" "}
        キー。同じお題をより少ないキーでクリアすると「ベスト更新」だ。
      </p>
      <ResultFooter
        xpGained={xpGained}
        primaryLabel="ホームへ ▶"
        onPrimary={onHome}
        onRetry={onRetry}
        retryLabel="ベスト更新を狙う"
      />
    </>
  );
}
