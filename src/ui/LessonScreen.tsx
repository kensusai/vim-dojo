/**
 * Lesson screen: plays a lesson's exercises in order (design/mockups/
 * practice-c.html tone). Thin by design — clear/medal/XP/streak/unlock all
 * come from core; this renders state and forwards intents. On finishing the
 * last exercise it marks the lesson cleared (unlock R5, XP-once R16) and
 * records the learning activity for the streak (R8).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { markLessonCleared } from "../core/curriculum/markLessonCleared";
import { stages } from "../core/curriculum/stages";
import { applyDrillAttempt, completeDrillSession } from "../core/applyProgress";
import type { Attempt } from "../core/practice/attempt";
import { type Medal } from "../core/practice/medal";
import {
  startPracticeSession,
  type PracticeSession,
} from "../core/practice/session";
import type { VimMode } from "../core/ports";
import { levelProgress } from "../core/progression/xp";
import type { StreakOutcome } from "../core/progression/streak";
import {
  createVimEngine,
  type CodeMirrorVimEngine,
} from "../vim/codeMirrorVimEngine";
import { SenseiSprite } from "./Sensei";
import { useAppStore } from "./storeContext";

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
  lessonComplete: boolean;
  streak: StreakOutcome | null;
}

export function LessonScreen({
  stageIndex,
  lessonIndex,
}: {
  stageIndex: number;
  lessonIndex: number;
}) {
  const clock = useAppStore((s) => s.clock);
  const store = useAppStore((s) => s.store);
  const setProfile = useAppStore((s) => s.setProfile);
  const navigate = useAppStore((s) => s.navigate);
  const profile = useAppStore((s) => s.profile);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const lesson = stages[stageIndex]?.lessons[lessonIndex];

  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CodeMirrorVimEngine | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [mode, setMode] = useState<VimMode>("normal");
  const [clearInfo, setClearInfo] = useState<ClearInfo | null>(null);
  const [results, setResults] = useState<(Medal | "abandoned" | null)[]>([]);

  const exercise = lesson?.exercises[exerciseIndex];

  const settle = useCallback(
    async (attempt: Attempt, isLast: boolean) => {
      const drill = applyDrillAttempt(profileRef.current, attempt);
      let next = drill.profile;
      let xpGained = drill.xpGained;
      let streak: StreakOutcome | null = null;
      if (isLast && lesson) {
        const lessonOutcome = markLessonCleared(
          next,
          lesson.id,
          attempt.playedAt,
        );
        next = lessonOutcome.profile;
        xpGained += lessonOutcome.xpGained;
        const session = completeDrillSession(next, attempt.playedAt);
        next = session.profile;
        streak = session.streak;
      }
      setProfile(next);
      await store.appendAttempt(attempt);
      return { xpGained, streak };
    },
    [lesson, setProfile, store],
  );

  const startExercise = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !exercise) return;
    setKeystrokes(0);
    setRecentKeys([]);
    setClearInfo(null);
    const session = startPracticeSession({
      exercise,
      source: "lesson",
      engine,
      clock,
    });
    sessionRef.current = session;
    const isLast =
      lessonIndex >= 0 && exerciseIndex === (lesson?.exercises.length ?? 0) - 1;
    session.onCleared((attempt) => {
      setResults((rs) => {
        const copy = [...rs];
        copy[exerciseIndex] = attempt.medal;
        return copy;
      });
      void settle(attempt, isLast).then(({ xpGained, streak }) => {
        setClearInfo({ attempt, xpGained, lessonComplete: isLast, streak });
      });
    });
    engine.focus();
  }, [
    clock,
    exercise,
    exerciseIndex,
    lesson?.exercises.length,
    lessonIndex,
    settle,
  ]);

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

  useEffect(() => {
    setResults(lesson ? lesson.exercises.map(() => null) : []);
  }, [lesson]);

  if (!lesson || !exercise) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-cream-faint">
        レッスンが見つかりません。
        <button
          className="ml-3 underline"
          onClick={() => navigate({ screen: "home" })}
        >
          ホームへ
        </button>
      </div>
    );
  }

  const retry = () => {
    const session = sessionRef.current;
    if (session && session.state() === "playing" && session.keystrokes() > 0) {
      void store.appendAttempt(session.abandon());
    }
    startExercise();
  };

  const advance = () => {
    if (clearInfo?.lessonComplete) {
      navigate({ screen: "home" });
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

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col">
      <header className="flex items-center justify-between border-b-3 border-ink bg-black/25 px-12 py-3 font-mono">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate({ screen: "home" })}
            className="text-sm text-cream-faint hover:text-cream"
          >
            ← MAP
          </button>
          <span className="font-sans text-lg font-black">{exercise.title}</span>
          <span className="border-2 border-ink px-2 text-[10px] tracking-widest text-cream-faint">
            {stages[stageIndex]?.title} · {lesson.title.split(" — ")[0]}
          </span>
        </div>
        <div className="flex items-center gap-1" aria-label="レッスン進行">
          <span className="mr-2 text-[10px] tracking-widest text-cream-faint">
            LESSON
          </span>
          {lesson.exercises.map((_, i) => (
            <span
              key={i}
              className={`h-4 w-4 border-2 ${
                i === exerciseIndex && results[i] == null
                  ? "blink border-gold"
                  : results[i] == null
                    ? "border-ink-bold bg-raised"
                    : results[i] === "abandoned"
                      ? "border-shu-dark bg-shu/30"
                      : "border-matcha-dim bg-matcha"
              }`}
            />
          ))}
          <span className="ml-2 text-[11px] text-cream-faint">
            {exerciseIndex + 1}/{lesson.exercises.length}
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
          <div className="pixel-panel p-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-xs font-black tracking-[0.2em] text-matcha">
              <SenseiSprite size={28} /> 師範のひとこと
            </div>
            <p className="text-sm text-cream-dim">{lesson.brief}</p>
            {lesson.note && (
              <p className="mt-2 border-l-2 border-ink-bold pl-2 text-xs text-cream-faint">
                💡 {lesson.note}
              </p>
            )}
          </div>

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

      {clearInfo && (
        <ResultModal
          info={clearInfo}
          onAdvance={advance}
          onRetry={startExercise}
        />
      )}
    </div>
  );
}

function ResultModal({
  info,
  onAdvance,
  onRetry,
}: {
  info: ClearInfo;
  onAdvance: () => void;
  onRetry: () => void;
}) {
  const advanceRef = useRef<HTMLButtonElement>(null);
  const profile = useAppStore((s) => s.profile);
  useEffect(() => advanceRef.current?.focus(), []);
  const medal = info.attempt.medal;
  const { level, intoLevel, neededForNext } = levelProgress(profile.xp);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="結果"
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/70"
    >
      <div className="pixel-panel w-[520px] p-8 text-center [background:repeating-conic-gradient(from_0deg_at_50%_40%,rgb(255_210_94/0.08)_0deg_12deg,transparent_12deg_24deg),var(--color-surface)]">
        {medal && (
          <>
            <div className="ippon-pop text-6xl font-black tracking-wider text-gold [text-shadow:5px_5px_0_var(--color-shu-dark),8px_8px_0_rgb(0_0_0/0.6)]">
              {MEDAL_WORD[medal]}
            </div>
            <div className="mt-2 text-4xl">{MEDAL_ICON[medal]}</div>
            <div className="mt-2 font-mono text-sm text-cream-dim">
              {info.attempt.keystrokes} KEYS
            </div>
          </>
        )}

        {info.lessonComplete && (
          <div className="mt-3 flex items-center justify-center gap-2 font-mono text-sm font-black text-matcha">
            <SenseiSprite mood="hype" size={40} /> レッスン皆伝!! よくやった!!
          </div>
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

        <div className="mt-6 flex gap-3">
          <button
            ref={advanceRef}
            type="button"
            onClick={onAdvance}
            className="btn-chunky flex-1 border-b-[6px] border-shu-dark bg-shu py-3 font-black tracking-widest text-[#fff6ec]"
          >
            {info.lessonComplete ? "ホームへ ▶" : "次のお題 ▶"}
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="btn-chunky flex-1 border-2 border-b-[5px] border-ink-bold bg-raised py-3 font-mono text-sm font-extrabold text-cream-dim"
          >
            やり直す
          </button>
        </div>
      </div>
    </div>
  );
}
