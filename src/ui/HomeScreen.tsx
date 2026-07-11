/**
 * Home screen (design/mockups/home-c.html): belt-rank HUD, sensei board with
 * the day's greeting, and the world map of stages/lessons. All status is
 * derived from core (curriculum status, level, streak); this file renders it.
 */
import {
  stageLessonStatuses,
  type LessonStatus,
} from "../core/curriculum/curriculum";
import { stages } from "../core/curriculum/stages";
import { levelProgress } from "../core/progression/xp";
import { beltForLevel } from "../core/progression/belt";
import { SenseiSprite, SpeechBubble } from "./Sensei";
import { useAppStore } from "./storeContext";

export function HomeScreen() {
  const profile = useAppStore((s) => s.profile);
  const navigate = useAppStore((s) => s.navigate);
  const { level, intoLevel, neededForNext } = levelProgress(profile.xp);
  const belt = beltForLevel(level);

  // The next playable lesson (first "current" across stages), for the CTA.
  const next = (() => {
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const statuses = stageLessonStatuses(profile, stages, stageIndex);
      const lessonIndex = statuses.indexOf("current");
      if (lessonIndex !== -1) {
        return {
          stageIndex,
          lessonIndex,
          lesson: stages[stageIndex]!.lessons[lessonIndex]!,
        };
      }
    }
    return null;
  })();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col">
      <header className="flex items-center justify-between border-b-3 border-ink bg-black/25 px-12 py-4">
        <div className="flex items-center gap-3 font-mono text-xl font-black tracking-widest">
          <span className="flex h-9 w-9 items-center justify-center bg-shu text-lg text-paper shadow-[3px_3px_0_rgb(0_0_0/0.6)]">
            道
          </span>
          VIM-DOJO<span className="blink text-matcha">▮</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <div className="flex items-center gap-3 border-3 border-ink bg-raised px-4 py-2 shadow-[3px_3px_0_rgb(0_0_0/0.6)]">
            <span className="relative inline-block h-3 w-10 border-2 border-[#3a2b1e] bg-[#8a5a2b] after:absolute after:left-[15px] after:top-[-4px] after:h-4 after:w-1.5 after:border-2 after:border-[#3a2b1e] after:bg-[#8a5a2b] after:content-['']" />
            <div>
              <div className="text-[10px] tracking-widest text-cream-faint">
                RANK
              </div>
              <b className="text-sm">{belt}</b>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-cream-faint">
                Lv.{level}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 border ${
                      i < Math.round((intoLevel / neededForNext) * 10)
                        ? "border-[#223c0d] bg-matcha"
                        : "border-ink-bold bg-[#0d0b07]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 border-3 border-ink bg-raised px-4 py-2 shadow-[3px_3px_0_rgb(0_0_0/0.6)]">
            <span className="text-xl">🔥</span>
            <div>
              <div className="text-[10px] tracking-widest text-cream-faint">
                STREAK
              </div>
              <span className="text-xl font-black text-gold">
                {profile.streak.current}
              </span>
              <span className="text-[11px]"> 日</span>
              {profile.streak.freezes > 0 && (
                <span className="ml-1 text-[11px] text-freeze">
                  ❄×{profile.streak.freezes}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-6 px-12 py-6">
        {/* Sensei board */}
        <section className="pixel-panel flex items-end gap-6 p-8">
          <div className="flex flex-none flex-col items-center">
            <SenseiSprite mood="hype" size={140} />
            <div className="mt-2 font-mono text-[10px] tracking-[0.2em] text-cream-faint">
              SHIHAN &quot;GEKIATSU&quot;
            </div>
          </div>
          <div className="flex-1">
            <SpeechBubble>
              {profile.streak.current > 0 ? (
                <>
                  {profile.streak.current}日連続、いい流れだ!!{" "}
                  <span className="text-shu">今日も一本いくぞ!!</span>
                </>
              ) : (
                <>
                  よし、来たな!!{" "}
                  <span className="text-shu">修行の時間だ!!</span>
                </>
              )}
            </SpeechBubble>
            {next ? (
              <>
                <div className="mb-1 font-mono text-xs font-black tracking-[0.3em] text-matcha">
                  ▶ NEXT LESSON
                </div>
                <h1 className="mb-4 text-3xl font-black [text-shadow:4px_4px_0_rgb(0_0_0/0.45)]">
                  {next.lesson.title}
                </h1>
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      screen: "lesson",
                      stageIndex: next.stageIndex,
                      lessonIndex: next.lessonIndex,
                    })
                  }
                  className="btn-chunky inline-flex items-center gap-3 border-b-8 border-shu-dark bg-shu px-11 py-4 text-xl font-black tracking-widest text-[#fff6ec]"
                >
                  稽古をはじめる
                  <span className="bg-black/30 px-2 font-mono text-xs">
                    Enter
                  </span>
                </button>
              </>
            ) : (
              <p className="text-xl font-black text-matcha">
                STAGE 1 皆伝!! 次のステージは近日追加だ。
              </p>
            )}
          </div>
        </section>

        {/* World map */}
        <section className="pixel-panel p-8">
          <div className="mb-5 flex items-baseline gap-3 font-mono text-lg font-black tracking-widest">
            WORLD MAP
            <span className="text-xs font-normal text-cream-faint">
              — レッスンをクリアして道を進め
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {stages.map((stage, stageIndex) => {
              const statuses = stageLessonStatuses(profile, stages, stageIndex);
              const locked = statuses.every((s) => s === "locked");
              const empty = stage.lessons.length === 0;
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-4 ${locked || empty ? "opacity-50" : ""}`}
                >
                  <div
                    className={`w-[150px] flex-none border-3 py-2 text-center font-mono text-sm font-black shadow-[3px_3px_0_rgb(0_0_0/0.6)] ${
                      statuses.every((s) => s === "cleared") && !empty
                        ? "border-matcha-dim text-matcha"
                        : "border-ink"
                    } bg-raised`}
                  >
                    {stage.title}
                    <span className="block text-[10px] font-normal text-cream-faint">
                      {stage.subtitle}
                    </span>
                  </div>
                  {empty ? (
                    <span className="font-mono text-xs text-cream-faint">
                      🔒 近日追加
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-y-3">
                      {stage.lessons.map((lesson, lessonIndex) => (
                        <LessonNode
                          key={lesson.id}
                          label={nodeLabel(lesson.title)}
                          status={statuses[lessonIndex] ?? "locked"}
                          isLast={lessonIndex === stage.lessons.length - 1}
                          onClick={() =>
                            navigate({
                              screen: "lesson",
                              stageIndex,
                              lessonIndex,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function LessonNode({
  label,
  status,
  isLast,
  onClick,
}: {
  label: string;
  status: LessonStatus;
  isLast: boolean;
  onClick: () => void;
}) {
  const base =
    "flex h-11 w-11 flex-none items-center justify-center font-mono text-sm font-black border-3 shadow-[3px_3px_0_rgb(0_0_0/0.6)]";
  const style =
    status === "cleared"
      ? "border-matcha bg-matcha-dim text-matcha"
      : status === "current"
        ? "border-gold bg-[#0d0b07] text-gold blink"
        : "border-ink-bold border-dashed text-cream-faint shadow-none";
  return (
    <>
      <button
        type="button"
        disabled={status === "locked"}
        onClick={onClick}
        aria-label={`${label} (${status})`}
        className={`${base} ${style} ${status === "locked" ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {status === "cleared" ? "✓" : status === "current" ? "!" : "?"}
      </button>
      {!isLast && (
        <span
          className={`h-1.5 w-5 flex-none ${
            status === "cleared"
              ? "[background:repeating-linear-gradient(90deg,var(--color-matcha)_0_6px,transparent_6px_11px)]"
              : "[background:repeating-linear-gradient(90deg,var(--color-ink-bold)_0_6px,transparent_6px_11px)]"
          }`}
        />
      )}
    </>
  );
}

/** Short node label: strip the "cmd — description" title down to the command. */
function nodeLabel(title: string): string {
  return title.split(" — ")[0] ?? title;
}
