/**
 * PracticePlayer: the shared exercise-playing surface (editor pane, battle
 * strip, key log, result modal). Third screen needed it — extracted per the
 * rule of three (lesson / daily / drill). Owns nothing but presentation and
 * session lifecycle; what happens to a finished attempt is the parent's
 * business via onAttemptFinished.
 */
import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Attempt } from "../core/practice/attempt";
import type { Exercise, ExerciseSource } from "../core/practice/exercise";
import type { Medal } from "../core/practice/medal";
import {
  startPracticeSession,
  type PracticeSession,
} from "../core/practice/session";
import type { VimMode } from "../core/ports";
import { levelProgress } from "../core/progression/xp";
import { useAppStore } from "./storeContext";
import {
  createVimEngine,
  type CodeMirrorVimEngine,
} from "../vim/codeMirrorVimEngine";

export const MEDAL_WORD: Record<Medal, string> = {
  gold: "一本!!",
  silver: "技あり!",
  bronze: "有効",
};
export const MEDAL_ICON: Record<Medal, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

export interface FinishedInfo {
  attempt: Attempt;
  /** Index of the exercise within the exercises prop. */
  exerciseIndex: number;
  isLastExercise: boolean;
}

export function PracticePlayer({
  exercises,
  source,
  headerLeft,
  sidePanel,
  onAttemptFinished,
  renderResult,
}: {
  exercises: Exercise[];
  source: ExerciseSource;
  /** Extra content in the header's left side (back button, titles). */
  headerLeft?: ReactNode;
  /** Extra side panel above TARGET (e.g. the lesson brief). */
  sidePanel?: ReactNode;
  /** Called once per finished attempt (cleared or abandoned via retry). */
  onAttemptFinished: (info: FinishedInfo) => void;
  /**
   * Renders the result modal content for a finished attempt; returning
   * null closes the modal (used while parent updates state). The default
   * advance/retry controls are provided by the parent through this hook.
   */
  renderResult: (
    info: FinishedInfo,
    controls: { retry: () => void; advance: () => void },
  ) => ReactNode;
}) {
  const clock = useAppStore((s) => s.clock);
  const store = useAppStore((s) => s.store);

  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CodeMirrorVimEngine | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [mode, setMode] = useState<VimMode>("normal");
  const [finished, setFinished] = useState<FinishedInfo | null>(null);
  const [results, setResults] = useState<(Medal | "abandoned" | null)[]>(() =>
    exercises.map(() => null),
  );

  const exercise = exercises[exerciseIndex];

  // The parent recreates this callback every render (it closes over the
  // profile); going through a ref keeps startExercise stable so profile
  // updates don't restart the running session and close the result modal.
  const onAttemptFinishedRef = useRef(onAttemptFinished);
  onAttemptFinishedRef.current = onAttemptFinished;

  const startExercise = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !exercise) return;
    setKeystrokes(0);
    setRecentKeys([]);
    setFinished(null);
    const session = startPracticeSession({ exercise, source, engine, clock });
    sessionRef.current = session;
    const isLast = exerciseIndex === exercises.length - 1;
    session.onCleared((attempt) => {
      setResults((rs) =>
        rs.map((r, i) => (i === exerciseIndex ? attempt.medal : r)),
      );
      const info = { attempt, exerciseIndex, isLastExercise: isLast };
      onAttemptFinishedRef.current(info);
      setFinished(info);
    });
    engine.focus();
  }, [clock, exercise, exerciseIndex, exercises.length, source]);

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

  useEffect(() => {
    startExercise();
  }, [startExercise]);

  if (!exercise) return null;

  const retry = () => {
    const session = sessionRef.current;
    if (session && session.state() === "playing" && session.keystrokes() > 0) {
      // Giving up mid-attempt still records it (analytics input).
      void store.appendAttempt(session.abandon());
    }
    startExercise();
  };

  const advance = () => setExerciseIndex((i) => i + 1);

  const silverLine = Math.ceil(exercise.par * 1.5);
  const gaugePercent = Math.min(100, (keystrokes / silverLine) * 100);
  const parMarker = (exercise.par / silverLine) * 100;
  const medalHint =
    keystrokes <= exercise.par
      ? `🥇 まであと ${exercise.par - keystrokes}`
      : keystrokes <= silverLine
        ? `🥈 まであと ${silverLine - keystrokes}`
        : "🥉 有効圏内";

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col">
      <header className="flex items-center justify-between border-b-3 border-ink bg-black/25 px-12 py-3 font-mono">
        <div className="flex items-center gap-4">
          {headerLeft}
          <span className="font-sans text-lg font-black">{exercise.title}</span>
        </div>
        <div className="flex items-center gap-1" aria-label="進行">
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
      </header>

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

      <main className="grid flex-1 grid-cols-[1fr_400px] gap-6 px-12 py-6">
        <section className="pixel-panel flex flex-col overflow-hidden !bg-editor">
          <div className="flex items-center justify-between border-b-3 border-ink bg-raised px-4 py-1.5 font-mono text-[10px] tracking-widest text-cream-faint">
            <span>BUFFER</span>
            <span>VIM EMULATION</span>
          </div>
          <div ref={hostRef} className="editor-host min-h-[300px] flex-1" />
          <div className="flex items-center justify-between border-t-3 border-ink bg-raised px-4 py-1.5 font-mono text-xs">
            <span className="bg-matcha px-3 font-black tracking-widest text-[#17260a]">
              {mode.toUpperCase()}
            </span>
            <span className="text-cream-faint">vim-dojo</span>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          {sidePanel}

          <div className="pixel-panel p-4">
            <div className="mb-2 font-mono text-xs font-black tracking-[0.2em] text-cream-dim">
              TARGET — この形にせよ
            </div>
            <pre className="overflow-x-auto border-2 border-ink bg-editor p-3 font-mono text-[13px] leading-7">
              {exercise.targetBuffer}
            </pre>
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

          <button
            type="button"
            onClick={retry}
            className="btn-chunky border-2 border-b-[5px] border-ink-bold bg-raised py-2.5 font-mono text-sm font-extrabold text-cream-dim"
          >
            やり直す
          </button>
        </aside>
      </main>

      {finished && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="結果"
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/70"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="pixel-panel w-[520px] p-8 text-center [background:repeating-conic-gradient(from_0deg_at_50%_40%,rgb(255_210_94/0.08)_0deg_12deg,transparent_12deg_24deg),var(--color-surface)]"
          >
            {renderResult(finished, { retry: startExercise, advance })}
          </motion.div>
        </div>
      )}
    </div>
  );
}

/**
 * Shared result-modal footer: XP/level chips and the primary/retry buttons.
 * The three screens (lesson/daily/drill) only differ in their celebration
 * line and primary action — pass those in; everything else lives here.
 */
export function ResultFooter({
  xpGained,
  primaryLabel,
  onPrimary,
  onRetry,
  retryLabel = "やり直す",
  extraChips,
}: {
  xpGained: number;
  primaryLabel: string;
  onPrimary: () => void;
  onRetry: () => void;
  retryLabel?: string;
  extraChips?: ReactNode;
}) {
  const profile = useAppStore((s) => s.profile);
  const { level, intoLevel, neededForNext } = levelProgress(profile.xp);
  return (
    <>
      <div className="mt-4 flex justify-center gap-3 font-mono text-sm font-extrabold">
        {xpGained > 0 && (
          <span className="border-2 border-ink bg-black/40 px-3 py-1 text-gold">
            +{xpGained} XP
          </span>
        )}
        <span className="border-2 border-ink bg-black/40 px-3 py-1">
          Lv.{level} {intoLevel}/{neededForNext}
        </span>
        {extraChips}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          autoFocus
          onClick={onPrimary}
          className="btn-chunky flex-1 border-b-[6px] border-shu-dark bg-shu py-3 font-black tracking-widest text-[#fff6ec]"
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="btn-chunky flex-1 border-2 border-b-[5px] border-ink-bold bg-raised py-3 font-mono text-sm font-extrabold text-cream-dim"
        >
          {retryLabel}
        </button>
      </div>
    </>
  );
}

/** Streak chip for the result footer (shown when the day's activity landed). */
export function StreakChip() {
  const profile = useAppStore((s) => s.profile);
  return (
    <span className="border-2 border-ink bg-black/40 px-3 py-1 text-shu">
      🔥 {profile.streak.current}日
    </span>
  );
}

/** Shared medal headline for result modals. */
export function MedalHeadline({ attempt }: { attempt: Attempt }) {
  if (!attempt.medal) return null;
  return (
    <>
      <div className="ippon-pop text-6xl font-black tracking-wider text-gold [text-shadow:5px_5px_0_var(--color-shu-dark),8px_8px_0_rgb(0_0_0/0.6)]">
        {MEDAL_WORD[attempt.medal]}
      </div>
      <div className="mt-2 text-4xl">{MEDAL_ICON[attempt.medal]}</div>
      <div className="mt-2 font-mono text-sm text-cream-dim">
        {attempt.keystrokes} KEYS
      </div>
    </>
  );
}
