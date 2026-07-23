/**
 * Lesson screen on PracticePlayer: plays a lesson's exercises in order; the
 * last clear marks the lesson cleared (unlock R5, XP-once R16) and records
 * the learning activity (streak R8).
 */
import { useRef, useState } from "react";
import {
  applyPracticeAttempt,
  recordLearningActivity,
} from "../core/applyProgress";
import { markLessonCleared } from "../core/curriculum/markLessonCleared";
import { stages } from "../core/curriculum/stages";
import {
  MedalHeadline,
  PracticePlayer,
  ResultFooter,
  StreakChip,
  type FinishedInfo,
} from "./PracticePlayer";
import { BossPanel } from "./Boss";
import { SenseiSprite } from "./Sensei";
import { playLessonComplete } from "./sound";
import { useAppStore } from "./storeContext";

export function LessonScreen({
  stageIndex,
  lessonIndex,
}: {
  stageIndex: number;
  lessonIndex: number;
}) {
  const store = useAppStore((s) => s.store);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const navigate = useAppStore((s) => s.navigate);
  const [lastXp, setLastXp] = useState(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const lesson = stages[stageIndex]?.lessons[lessonIndex];
  if (!lesson || lesson.exercises.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-cream-faint">
        レッスンが見つかりません。
        <button
          type="button"
          className="ml-3 underline"
          onClick={() => navigate({ screen: "home" })}
        >
          ホームへ
        </button>
      </div>
    );
  }

  const onAttemptFinished = (info: FinishedInfo) => {
    void store.appendAttempt(info.attempt);
    const practice = applyPracticeAttempt(profileRef.current, info.attempt);
    let next = practice.profile;
    let xp = practice.xpGained;
    if (info.isLastExercise) {
      const cleared = markLessonCleared(next, lesson.id, info.attempt.playedAt);
      next = cleared.profile;
      xp += cleared.xpGained;
      next = recordLearningActivity(next, info.attempt.playedAt).profile;
      playLessonComplete();
    }
    if (next !== profileRef.current) setProfile(next);
    setLastXp(xp);
  };

  return (
    <PracticePlayer
      exercises={lesson.exercises}
      source="lesson"
      headerLeft={
        <>
          <button
            type="button"
            onClick={() => navigate({ screen: "home" })}
            className="text-sm text-cream-faint hover:text-cream"
          >
            ← MAP
          </button>
          <span className="border-2 border-ink px-2 text-[0.625rem] tracking-widest text-cream-faint">
            {stages[stageIndex]?.title} · {lesson.title.split(" — ")[0]}
          </span>
        </>
      }
      sidePanel={({ exercise, keystrokes, showHints, difficulty }) =>
        lesson.boss ? (
          <>
            <BossPanel
              exercise={exercise}
              keystrokes={keystrokes}
              difficulty={difficulty}
            />
            {showHints && exercise.hint && (
              <div className="pixel-panel p-4">
                <p className="text-xl leading-relaxed text-cream-dim">
                  🎯 {exercise.hint}
                </p>
              </div>
            )}
          </>
        ) : !showHints ? null : (
          <div className="pixel-panel p-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-sm font-black tracking-[0.2em] text-matcha">
              <SenseiSprite size={28} /> 師範のひとこと
            </div>
            <p className="text-xl leading-relaxed text-cream-dim">
              {lesson.brief}
            </p>
            {exercise.hint && (
              <p className="mt-2 border-l-2 border-matcha-dim pl-2 text-xl leading-relaxed text-cream">
                🎯 {exercise.hint}
              </p>
            )}
            {lesson.note && (
              <p className="mt-2 border-l-2 border-ink-bold pl-2 text-cream-faint">
                💡 {lesson.note}
              </p>
            )}
          </div>
        )
      }
      onAttemptFinished={onAttemptFinished}
      renderResult={(info, controls) => (
        <LessonResult
          info={info}
          boss={lesson.boss ?? false}
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

function LessonResult({
  info,
  boss,
  xpGained,
  onRetry,
  onNext,
}: {
  info: FinishedInfo;
  boss: boolean;
  xpGained: number;
  onRetry: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <MedalHeadline attempt={info.attempt} />
      {info.isLastExercise && (
        <div className="mt-3 flex items-center justify-center gap-2 font-mono font-black text-matcha">
          <SenseiSprite mood="hype" size={40} />
          {boss ? "ボス撃破!! 皆伝だ!!" : "レッスン皆伝!! よくやった!!"}
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
