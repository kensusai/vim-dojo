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
import { medalThresholds, type Medal } from "../core/practice/medal";
import {
  startPracticeSession,
  type PracticeSession,
} from "../core/practice/session";
import type { VimMode } from "../core/ports";
import { levelProgress } from "../core/progression/xp";
import { configFor, type Difficulty } from "../core/difficulty";
import { SenseiHintPanel } from "./Sensei";
import { isMuted, playClear, toggleMuted } from "./sound";
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
  /** Extra side panel above TARGET (e.g. the lesson brief). A function form
   * receives the live context, e.g. for per-exercise hints or a reacting
   * boss (keystrokes updates on every key). */
  sidePanel?:
    | ReactNode
    | ((context: {
        exercise: Exercise;
        keystrokes: number;
        showHints: boolean;
        difficulty: Difficulty;
      }) => ReactNode);
  /** Called once per CLEARED attempt. Abandoned retries are appended to the
   * store internally and never reach this callback. */
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
  const difficulty = useAppStore((s) => s.difficulty);
  const aids = configFor(difficulty);

  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CodeMirrorVimEngine | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [mode, setMode] = useState<VimMode>("normal");
  const [finished, setFinished] = useState<FinishedInfo | null>(null);
  const [results, setResults] = useState<(Medal | null)[]>(() =>
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
    // A still-playing session keeps its engine subscriptions and would fire
    // onCleared alongside the new session's (double-recorded attempts). End
    // it first, always. Giving up mid-attempt is recorded (analytics input);
    // a zero-key abandon is noise and is discarded.
    const previous = sessionRef.current;
    if (previous?.state() === "playing") {
      const abandoned = previous.abandon();
      if (abandoned.keystrokes > 0) void store.appendAttempt(abandoned);
    }
    setKeystrokes(0);
    setRecentKeys([]);
    setFinished(null);
    const session = startPracticeSession({
      exercise,
      source,
      engine,
      clock,
      difficulty,
    });
    sessionRef.current = session;
    const isLast = exerciseIndex === exercises.length - 1;
    session.onCleared((attempt) => {
      setResults((rs) =>
        rs.map((r, i) => (i === exerciseIndex ? attempt.medal : r)),
      );
      if (attempt.medal) playClear(attempt.medal);
      // The buffer is judged: freeze it (drops in-flight keys a fast typist
      // still has queued) and drop focus so Enter belongs to the dialog.
      engine.setEditable(false);
      engine.blur();
      const info = { attempt, exerciseIndex, isLastExercise: isLast };
      onAttemptFinishedRef.current(info);
      setFinished(info);
    });
    engine.focus();
  }, [
    clock,
    difficulty,
    exercise,
    exerciseIndex,
    exercises.length,
    source,
    store,
  ]);

  useEffect(() => {
    if (!hostRef.current) return;
    const engine = createVimEngine(hostRef.current);
    engineRef.current = engine;
    const offKeys = engine.onKeystroke((key) => {
      if (sessionRef.current?.state() !== "playing") return; // judged: freeze
      setKeystrokes((n) => n + 1);
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

  // Enter must ALWAYS fire the dialog's primary action. autoFocus covers the
  // normal case, but any neutral click (the dark backdrop, the 答え合わせ
  // text) drops focus to <body> and Enter would go nowhere — owner bug
  // report 2026-07-23, pinned by e2e/result-dialog.spec.ts.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!finished) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      event.preventDefault();
      dialog.querySelector("button")?.click(); // first button = primary
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [finished]);

  if (!exercise) return null;

  // startExercise itself abandons (and records) any still-playing session.
  const retry = startExercise;

  const advance = () => setExerciseIndex((i) => i + 1);

  // Same lines the judgment uses (R3) — never re-derive them here.
  const { goldMax: goldLine, silverMax: silverLine } = medalThresholds(
    exercise.par,
    difficulty,
  );
  const gaugePercent = Math.min(100, (keystrokes / silverLine) * 100);
  const parMarker = (goldLine / silverLine) * 100;
  // Which medal is still reachable — the gauge/counter change color the
  // moment a line is crossed (playtest feedback: crossing felt like nothing).
  const zone =
    keystrokes <= goldLine
      ? "gold"
      : keystrokes <= silverLine
        ? "silver"
        : "bronze";
  const zoneColor = {
    gold: "bg-matcha",
    silver: "bg-silver",
    bronze: "bg-bronze",
  }[zone];
  const zoneText = {
    gold: "text-matcha",
    silver: "text-silver",
    bronze: "text-bronze",
  }[zone];
  const medalHint =
    zone === "gold"
      ? `🥇 まであと ${goldLine - keystrokes}`
      : zone === "silver"
        ? `🥈 まであと ${silverLine - keystrokes}`
        : "🥉 有効 — 何キーでもクリアはできる";

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col">
      <header className="flex items-center justify-between border-b-3 border-ink bg-black/25 px-12 py-3 font-mono">
        <div className="flex items-center gap-4">
          {headerLeft}
          <SoundToggle />
        </div>
        <div className="flex items-center gap-1" aria-label="進行">
          <span className="mr-2 text-[0.625rem] tracking-widest text-cream-faint">
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
                    : "border-matcha-dim bg-matcha"
              }`}
            />
          ))}
          <span className="ml-2 text-[0.6875rem] text-cream-faint">
            {exerciseIndex + 1}/{exercises.length}
          </span>
        </div>
      </header>

      <div className="flex items-center justify-center gap-8 border-b-3 border-ink bg-black/35 py-3 font-mono">
        <div className="flex items-baseline gap-2">
          <span className="text-[0.625rem] tracking-widest text-cream-faint">
            KEYS
          </span>
          <motion.span
            key={keystrokes}
            initial={{ scale: keystrokes > 0 ? 1.35 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 700, damping: 22 }}
            className={`inline-block text-3xl font-black ${zoneText} [text-shadow:3px_3px_0_rgb(0_0_0/0.5)]`}
          >
            {keystrokes}
          </motion.span>
        </div>
        <div className="flex items-center gap-3">
          {/* re-mount on zone change → a visible pulse the moment a line is crossed */}
          <motion.div
            key={zone}
            initial={{ scale: zone === "gold" ? 1 : 1.08 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="relative h-[18px] w-[280px] border-3 border-ink-bold bg-black"
          >
            <div
              className={`absolute inset-y-0 left-0 ${zoneColor} transition-[width] duration-150`}
              style={{ width: `${gaugePercent}%` }}
            />
            <div
              className="absolute -top-1.5 h-6 w-[3px] bg-cream-dim"
              style={{ left: `${parMarker}%` }}
            />
          </motion.div>
          <span
            className={`text-xs font-extrabold ${zone === "gold" ? "text-gold" : zoneText}`}
          >
            {medalHint}
          </span>
        </div>
        <div className="text-sm text-cream-dim">PAR {exercise.par}</div>
      </div>

      {/* Quest banner: the お題 is the star of the screen (playtest feedback:
          it was buried in the header, small and hard to notice). */}
      <div className="flex items-end justify-between gap-6 px-12 pt-6">
        <h1 className="text-3xl font-black tracking-wide [text-shadow:4px_4px_0_rgb(0_0_0/0.45)]">
          <span className="mr-3 align-middle font-mono text-sm font-black tracking-[0.3em] text-gold">
            ▶ お題
          </span>
          {exercise.title}
        </h1>
        <p className="whitespace-nowrap pb-1 font-mono text-xs text-cream-dim">
          バッファを TARGET と同じ形にすれば「一本」だ
        </p>
      </div>

      <main className="grid flex-1 grid-cols-[1fr_500px] gap-6 px-12 pb-6 pt-4">
        <section className="pixel-panel flex flex-col overflow-hidden !bg-editor">
          <div className="flex items-center justify-between border-b-3 border-ink bg-raised px-4 py-1.5 font-mono text-[0.625rem] tracking-widest text-cream-faint">
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
          {(typeof sidePanel === "function"
            ? sidePanel({
                exercise,
                keystrokes,
                showHints: aids.showHints,
                difficulty,
              })
            : sidePanel) ??
            (aids.showHints ? <SenseiHintPanel hint={exercise.hint} /> : null)}

          <div className="pixel-panel p-4">
            <div className="mb-2 font-mono text-sm font-black tracking-[0.2em] text-cream-dim">
              TARGET — この形にせよ
            </div>
            <pre className="overflow-x-auto border-2 border-ink bg-editor p-3 font-mono text-lg leading-9">
              {exercise.targetBuffer}
            </pre>
          </div>

          {aids.showKeyLog && (
            <div className="pixel-panel p-4">
              <div className="mb-2 font-mono text-sm font-black tracking-[0.2em] text-cream-dim">
                INPUT — 入力キー
              </div>
              <div className="flex min-h-8 flex-wrap gap-1">
                {recentKeys.map((key, i) => (
                  <kbd
                    key={`${i}-${key}`}
                    className="min-w-[32px] border-2 border-b-4 border-ink-bold bg-raised px-2 text-center font-mono text-lg font-bold"
                  >
                    {key === " " ? "␣" : key}
                  </kbd>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={retry}
            className="btn-chunky border-2 border-b-[5px] border-ink-bold bg-raised py-2.5 font-mono font-extrabold text-cream-dim"
          >
            やり直す
          </button>
        </aside>
      </main>

      {finished && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="結果"
          // Keep keyboard focus on the primary button even when the player
          // clicks the backdrop or non-interactive dialog text.
          onMouseDown={(event) => event.preventDefault()}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/70"
        >
          {/* the moment of the clear: a quick gold flash behind the modal */}
          <div aria-hidden="true" className="clear-flash fixed inset-0" />
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="pixel-panel w-[640px] p-8 text-center [background:repeating-conic-gradient(from_0deg_at_50%_40%,rgb(255_210_94/0.08)_0deg_12deg,transparent_12deg_24deg),var(--color-surface)]"
          >
            {renderResult(finished, { retry: startExercise, advance })}
            {aids.showSolution && (
              <SolutionReveal
                exercise={exercise}
                keystrokes={finished.attempt.keystrokes}
              />
            )}
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
      <div className="mt-4 flex justify-center gap-3 font-mono font-extrabold">
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
          className="btn-chunky flex-1 border-2 border-b-[5px] border-ink-bold bg-raised py-3 font-mono font-extrabold text-cream-dim"
        >
          {retryLabel}
        </button>
      </div>
    </>
  );
}

/**
 * 答え合わせ: the model solution and its reasoning, shown after every attempt
 * (playtest feedback: clearing by brute force taught nothing). The par is the
 * model's length, so this is also "how the par is even possible".
 */
function SolutionReveal({
  exercise,
  keystrokes,
}: {
  exercise: Exercise;
  keystrokes: number;
}) {
  const solution = exercise.solution;
  if (!solution) return null;
  const beat = keystrokes <= exercise.par;
  return (
    <div className="mt-5 border-t-2 border-ink pt-4 text-left">
      <div className="mb-2 font-mono text-sm font-black tracking-[0.2em] text-cream-dim">
        答え合わせ — 模範解答({exercise.par} キー)
        {beat ? " / 模範と互角以上だ!!" : ` / あなた: ${keystrokes} キー`}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {solution.map((key, i) => (
          <kbd
            key={i}
            className="min-w-[32px] border-2 border-b-4 border-ink-bold bg-raised px-2 text-center font-mono text-xl font-bold text-gold"
          >
            {key === "<Esc>" ? "Esc" : key === " " ? "␣" : key}
          </kbd>
        ))}
      </div>
      {exercise.hint && (
        <p className="mt-2 text-cream-dim">🎯 {exercise.hint}</p>
      )}
    </div>
  );
}

/** Mute toggle for the retro sound effects (preference lives in localStorage). */
function SoundToggle() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      type="button"
      aria-label={muted ? "効果音をオンにする" : "効果音をオフにする"}
      onClick={() => setMuted(toggleMuted())}
      className="text-sm text-cream-faint hover:text-cream"
    >
      {muted ? "🔇" : "🔊"}
    </button>
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
      <div className="mt-2 font-mono text-cream-dim">
        {attempt.keystrokes} KEYS
      </div>
    </>
  );
}
