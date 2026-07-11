/**
 * The practice screen (design/mockups/practice-c.html). Thin by design:
 * every judgment (clear, medal, XP, streak) comes from core; this file only
 * renders state and forwards intents.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { applyDrillAttempt, completeDrillSession } from "../core/applyProgress";
import type { Attempt } from "../core/practice/attempt";
import type { Exercise } from "../core/practice/exercise";
import { judgeMedal, type Medal } from "../core/practice/medal";
import {
  startPracticeSession,
  type PracticeSession,
} from "../core/practice/session";
import type { Clock, ProgressStore, VimMode } from "../core/ports";
import type { Profile } from "../core/profile";
import type { StreakOutcome } from "../core/progression/streak";
import { levelProgress } from "../core/progression/xp";
import {
  createVimEngine,
  type CodeMirrorVimEngine,
} from "../vim/codeMirrorVimEngine";

const MEDAL_WORD: Record<Medal, string> = {
  gold: "一本!!",
  silver: "技あり!",
  bronze: "有効",
};
const MEDAL_ICON: Record<Medal, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

interface ClearInfo {
  attempt: Attempt;
  xpGained: number;
  isLastExercise: boolean;
  streak: StreakOutcome | null;
}

export function PracticeScreen({
  exercises,
  profile,
  store,
  clock,
  onProfileChange,
}: {
  exercises: Exercise[];
  profile: Profile;
  store: ProgressStore;
  clock: Clock;
  onProfileChange: (profile: Profile) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CodeMirrorVimEngine | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [mode, setMode] = useState<VimMode>("normal");
  const [clearInfo, setClearInfo] = useState<ClearInfo | null>(null);
  const [results, setResults] = useState<(Medal | "abandoned" | null)[]>(() =>
    exercises.map(() => null),
  );
  // Refs mirror the latest values for use inside engine/session callbacks.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const exercise = exercises[exerciseIndex];

  /** Persist an attempt and fold it into the profile (core does the math). */
  const settleAttempt = useCallback(
    async (attempt: Attempt, isLastExercise: boolean) => {
      const { profile: afterAttempt, xpGained } = applyDrillAttempt(
        profileRef.current,
        attempt,
      );
      let next = afterAttempt;
      let streak: StreakOutcome | null = null;
      if (isLastExercise) {
        const sessionOutcome = completeDrillSession(next, attempt.playedAt);
        next = sessionOutcome.profile;
        streak = sessionOutcome.streak;
      }
      onProfileChange(next);
      await store.appendAttempt(attempt);
      await store.saveProfile(next);
      return { xpGained, streak };
    },
    [onProfileChange, store],
  );

  /** (Re)start the current exercise on the engine. */
  const startExercise = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !exercise) return;
    setKeystrokes(0);
    setRecentKeys([]);
    setClearInfo(null);
    const session = startPracticeSession({
      exercise,
      source: "drill",
      engine,
      clock,
    });
    sessionRef.current = session;
    session.onCleared((attempt) => {
      const isLast = exerciseIndex === exercises.length - 1;
      setResults((rs) =>
        rs.map((r, i) => (i === exerciseIndex ? attempt.medal : r)),
      );
      void settleAttempt(attempt, isLast).then(({ xpGained, streak }) => {
        setClearInfo({ attempt, xpGained, isLastExercise: isLast, streak });
      });
    });
    engine.focus();
  }, [clock, exercise, exerciseIndex, exercises.length, settleAttempt]);

  // Mount the engine once; wire its event streams into React state.
  useEffect(() => {
    if (!hostRef.current) return;
    const engine = createVimEngine(hostRef.current);
    engineRef.current = engine;
    const offKeys = engine.onKeystroke((key) => {
      setKeystrokes((n) =>
        sessionRef.current?.state() === "playing" ? n + 1 : n,
      );
      setRecentKeys((keys) => [...keys.slice(-19), key]);
      setMode(engine.currentMode());
    });
    return () => {
      offKeys();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Start / restart whenever the exercise changes (after engine mounts).
  useEffect(() => {
    startExercise();
  }, [startExercise]);

  if (!exercise) return null;

  const abandonAndAdvance = () => {
    const session = sessionRef.current;
    if (!session || session.state() !== "playing") return;
    const attempt = session.abandon();
    const isLast = exerciseIndex === exercises.length - 1;
    setResults((rs) =>
      rs.map((r, i) => (i === exerciseIndex ? "abandoned" : r)),
    );
    void settleAttempt(attempt, isLast).then(({ streak }) => {
      setClearInfo({ attempt, xpGained: 0, isLastExercise: isLast, streak });
    });
  };

  const retry = () => {
    const session = sessionRef.current;
    if (session && session.state() === "playing" && session.keystrokes() > 0) {
      // A retry gives up the current attempt; it stays in the log (R2/analytics).
      const attempt = session.abandon();
      void store.appendAttempt(attempt);
    }
    startExercise();
  };

  const advance = () => {
    if (clearInfo?.isLastExercise) {
      // Loop the sample session for now (M6 adds the home screen to return to).
      setResults(exercises.map(() => null));
      setExerciseIndex(0);
    } else {
      setExerciseIndex((i) => i + 1);
    }
  };

  const silverLine = Math.ceil(exercise.par * 1.5);
  const gaugePercent = Math.min(100, (keystrokes / silverLine) * 100);
  const parMarker = (exercise.par / silverLine) * 100;
  const medalHint =
    keystrokes <= exercise.par
      ? `🥇 まであと ${exercise.par - keystrokes}`
      : keystrokes <= silverLine
        ? `🥈 まであと ${silverLine - keystrokes}`
        : "🥉 有効圏内";

  const { level, intoLevel, neededForNext } = levelProgress(profile.xp);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col">
      {/* HUD */}
      <header className="flex items-center justify-between border-b-3 border-ink bg-black/25 px-12 py-3 font-mono">
        <div className="flex items-center gap-4">
          <span className="text-lg font-black tracking-widest">
            VIM-DOJO<span className="blink text-matcha">▮</span>
          </span>
          <span className="text-lg font-black">{exercise.title}</span>
          <span className="border-2 border-ink px-2 text-[10px] tracking-widest text-cream-faint">
            DRILL · SAMPLE
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-cream-faint">
            Lv.{level}
            <span className="text-cream-dim">
              {intoLevel}/{neededForNext}XP
            </span>
            🔥{profile.streak.current}
          </div>
          <div className="flex items-center gap-1" aria-label="セッション進行">
            <span className="mr-2 text-[10px] tracking-widest text-cream-faint">
              ROUND
            </span>
            {results.map((r, i) => (
              <span
                key={i}
                className={`h-4 w-4 border-2 ${
                  i === exerciseIndex && r === null
                    ? "blink border-gold"
                    : r === null
                      ? "border-ink-bold bg-raised"
                      : r === "abandoned"
                        ? "border-shu-dark bg-shu/30"
                        : "border-matcha-dim bg-matcha"
                }`}
              />
            ))}
            <span className="ml-2 text-[11px] text-cream-faint">
              {exerciseIndex + 1}/{exercises.length}
            </span>
          </div>
        </div>
      </header>

      {/* battle strip */}
      <div className="flex items-center justify-center gap-8 border-b-3 border-ink bg-black/35 py-3 font-mono">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] tracking-widest text-cream-faint">
            KEYS
          </span>
          <span className="text-3xl font-black text-matcha [text-shadow:3px_3px_0_rgb(0_0_0/0.5)]">
            {keystrokes}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-[18px] w-[280px] border-3 border-ink-bold bg-black">
            <div
              className="absolute inset-y-0 left-0 bg-matcha transition-[width] duration-150"
              style={{ width: `${gaugePercent}%` }}
            />
            <div
              className="absolute -top-1.5 h-6 w-[3px] bg-cream-dim"
              style={{ left: `${parMarker}%` }}
            />
          </div>
          <span className="text-xs font-extrabold text-gold">{medalHint}</span>
        </div>
        <div className="text-sm text-cream-dim">PAR {exercise.par}</div>
      </div>

      {/* main panes */}
      <main className="grid flex-1 grid-cols-[1fr_400px] gap-6 px-12 py-6">
        <section className="pixel-panel flex flex-col overflow-hidden !bg-editor">
          <div className="flex items-center justify-between border-b-3 border-ink bg-raised px-4 py-1.5 font-mono text-[10px] tracking-widest text-cream-faint">
            <span>BUFFER</span>
            <span>VIM EMULATION</span>
          </div>
          <div ref={hostRef} className="editor-host min-h-[320px] flex-1" />
          <div className="flex items-center justify-between border-t-3 border-ink bg-raised px-4 py-1.5 font-mono text-xs">
            <span className="bg-matcha px-3 font-black tracking-widest text-[#17260a]">
              {mode.toUpperCase()}
            </span>
            <span className="text-cream-faint">vim-dojo</span>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <div className="pixel-panel p-4">
            <div className="mb-2 font-mono text-xs font-black tracking-[0.2em] text-cream-dim">
              TARGET — この形にせよ
            </div>
            <pre className="overflow-x-auto border-2 border-ink bg-editor p-3 font-mono text-[13px] leading-7">
              {exercise.targetBuffer}
            </pre>
            <div className="mt-2 text-xs text-cream-faint">
              バッファが一致した瞬間に「一本」だ。
            </div>
          </div>

          <div className="pixel-panel p-4">
            <div className="mb-2 font-mono text-xs font-black tracking-[0.2em] text-cream-dim">
              INPUT — 入力キー
            </div>
            <div className="flex min-h-8 flex-wrap gap-1">
              {recentKeys.map((key, i) => (
                <kbd
                  key={`${i}-${key}`}
                  className="min-w-[26px] border-2 border-b-4 border-ink-bold bg-raised px-2 text-center font-mono text-sm font-bold"
                >
                  {key === " " ? "␣" : key}
                </kbd>
              ))}
            </div>
          </div>

          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={retry}
              className="btn-chunky flex-1 border-2 border-b-[5px] border-ink-bold bg-raised py-2.5 font-mono text-sm font-extrabold text-cream-dim"
            >
              やり直す
            </button>
            <button
              type="button"
              onClick={abandonAndAdvance}
              className="btn-chunky flex-1 border-2 border-b-[5px] border-ink-bold bg-raised py-2.5 font-mono text-sm font-extrabold text-shu"
            >
              にげる
            </button>
          </div>
        </aside>
      </main>

      {clearInfo && (
        <ResultModal
          info={clearInfo}
          profile={profile}
          par={exercise.par}
          onAdvance={advance}
          onRetry={startExercise}
        />
      )}
    </div>
  );
}

function ResultModal({
  info,
  profile,
  par,
  onAdvance,
  onRetry,
}: {
  info: ClearInfo;
  profile: Profile;
  par: number;
  onAdvance: () => void;
  onRetry: () => void;
}) {
  const advanceRef = useRef<HTMLButtonElement>(null);
  useEffect(() => advanceRef.current?.focus(), []);
  const { attempt } = info;
  const medal = attempt.medal;
  const { level, intoLevel, neededForNext } = levelProgress(profile.xp);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="結果"
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/70"
    >
      <div className="pixel-panel w-[520px] p-8 text-center [background:repeating-conic-gradient(from_0deg_at_50%_40%,rgb(255_210_94/0.08)_0deg_12deg,transparent_12deg_24deg),var(--color-surface)]">
        {medal ? (
          <>
            <div className="ippon-pop text-6xl font-black tracking-wider text-gold [text-shadow:5px_5px_0_var(--color-shu-dark),8px_8px_0_rgb(0_0_0/0.6)]">
              {MEDAL_WORD[medal]}
            </div>
            <div className="mt-2 text-4xl">{MEDAL_ICON[medal]}</div>
            <div className="mt-2 font-mono text-sm text-cream-dim">
              {attempt.keystrokes} KEYS / PAR {par}
              {medal === judgeMedal(par, attempt.keystrokes) && null}
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl font-black text-cream-dim">逃げた…</div>
            <div className="mt-2 font-mono text-sm text-cream-faint">
              この一本はまた今度。試行は記録された。
            </div>
          </>
        )}

        <div className="mt-4 flex justify-center gap-3 font-mono text-sm font-extrabold">
          {info.xpGained > 0 && (
            <span className="border-2 border-ink bg-black/40 px-3 py-1 text-gold">
              +{info.xpGained} XP
            </span>
          )}
          <span className="border-2 border-ink bg-black/40 px-3 py-1">
            Lv.{level} {intoLevel}/{neededForNext}
          </span>
          {info.streak && info.streak.kind !== "alreadyActiveToday" && (
            <span className="border-2 border-ink bg-black/40 px-3 py-1 text-shu">
              🔥 {profile.streak.current}日
            </span>
          )}
        </div>

        {info.isLastExercise && (
          <div className="mt-3 font-mono text-xs text-cream-dim">
            セッション完了! 今日の修行はカウントされた 🔥
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            ref={advanceRef}
            type="button"
            onClick={onAdvance}
            className="btn-chunky flex-1 border-b-[6px] border-shu-dark bg-shu py-3 font-black tracking-widest text-[#fff6ec]"
          >
            {info.isLastExercise ? "もう一周 ▶" : "次のお題 ▶"}
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="btn-chunky flex-1 border-2 border-b-[5px] border-ink-bold bg-raised py-3 font-mono text-sm font-extrabold text-cream-dim"
          >
            この題をやり直す
          </button>
        </div>
      </div>
    </div>
  );
}
