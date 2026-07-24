/**
 * Home screen (design/mockups/home-c.html): belt-rank HUD, sensei board with
 * the day's greeting, and the world map of stages/lessons. All status is
 * derived from core (curriculum status, level, streak); this file renders it.
 */
import { useEffect, useState } from "react";
import { weakCommands } from "../core/analytics/weakness";
import { resolveDailyChallenge } from "../core/daily";
import {
  stageLessonStatuses,
  type LessonStatus,
} from "../core/curriculum/curriculum";
import { stages } from "../core/curriculum/stages";
import type { CommandId } from "../core/ids";
import { localDateOf } from "../core/localDate";
import type { DailyChallengeRecord } from "../core/ports";
import { levelProgress } from "../core/progression/xp";
import { achievementDefs } from "../core/progression/achievements";
import { DIFFICULTIES, configFor } from "../core/difficulty";
import { beltForLevel } from "../core/progression/belt";
import { BackupPanel } from "./BackupPanel";
import { SenseiSprite, SpeechBubble } from "./Sensei";
import { useAppStore } from "./storeContext";

export function HomeScreen() {
  const profile = useAppStore((s) => s.profile);
  const navigate = useAppStore((s) => s.navigate);
  const store = useAppStore((s) => s.store);
  const setProfile = useAppStore((s) => s.setProfile);
  const difficulty = useAppStore((s) => s.difficulty);
  const setDifficulty = useAppStore((s) => s.setDifficulty);
  const clock = useAppStore((s) => s.clock);
  const { level, intoLevel, neededForNext } = levelProgress(profile.xp);
  const belt = beltForLevel(level);

  // Today's quest and weak commands load after mount — never on the boot
  // path (docs/database.md パフォーマンス方針). Both render progressively.
  const [daily, setDaily] = useState<DailyChallengeRecord | null>(null);
  const [weak, setWeak] = useState<CommandId[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = localDateOf(clock.now());
      const existing = await store.loadDailyChallenge(today);
      const record = resolveDailyChallenge(existing, today, profile);
      if (!cancelled) setDaily(record);
      const attempts = await store.loadAttempts();
      if (!cancelled) setWeak(weakCommands(attempts));
    })();
    return () => {
      cancelled = true;
    };
    // Load once per visit; profile changes while on screen don't re-resolve.
  }, [clock, store]);

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
              <div className="text-[0.625rem] tracking-widest text-cream-faint">
                RANK
              </div>
              <b className="text-sm">{belt}</b>
            </div>
            <div>
              <div className="text-[0.625rem] tracking-widest text-cream-faint">
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
          <div className="flex items-center gap-1 border-3 border-ink bg-raised px-2 py-2 shadow-[3px_3px_0_rgb(0_0_0/0.6)]">
            <span className="mr-1 text-[0.625rem] tracking-widest text-cream-faint">
              難易度
            </span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`px-2 py-0.5 text-xs font-black ${
                  d === difficulty
                    ? "bg-shu text-[#fff6ec]"
                    : "text-cream-faint hover:text-cream"
                }`}
              >
                {configFor(d).label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-3 border-ink bg-raised px-4 py-2 shadow-[3px_3px_0_rgb(0_0_0/0.6)]">
            <span className="text-xl">🔥</span>
            <div>
              <div className="text-[0.625rem] tracking-widest text-cream-faint">
                STREAK
              </div>
              <span className="text-xl font-black text-gold">
                {profile.streak.current}
              </span>
              <span className="text-[0.6875rem]"> 日</span>
              {profile.streak.freezes > 0 && (
                <span className="ml-1 text-[0.6875rem] text-freeze">
                  ❄×{profile.streak.freezes}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-6 px-12 py-6">
        {/* Sensei board */}
        <section className="pixel-panel scene-sky relative flex items-end gap-6 overflow-hidden p-8 pb-10">
          <span
            aria-hidden="true"
            className="scene-star"
            style={{ top: 22, left: "12%" }}
          />
          <span
            aria-hidden="true"
            className="scene-star"
            style={{ top: 48, left: "30%" }}
          />
          <span
            aria-hidden="true"
            className="scene-star"
            style={{ top: 18, left: "55%" }}
          />
          <span
            aria-hidden="true"
            className="scene-star"
            style={{ top: 60, left: "72%" }}
          />
          <span
            aria-hidden="true"
            className="scene-star"
            style={{ top: 34, left: "88%" }}
          />
          <div aria-hidden="true" className="scene-moon" />
          <div aria-hidden="true" className="scene-mountains" />
          <div aria-hidden="true" className="scene-ground" />
          <div className="relative flex flex-none flex-col items-center">
            <SenseiSprite mood="hype" size={140} />
            <div className="mt-2 font-mono text-[0.625rem] tracking-[0.2em] text-cream-faint">
              SHIHAN &quot;GEKIATSU&quot;
            </div>
          </div>
          <div className="relative flex-1">
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
            {daily ? (
              <>
                <div className="mb-1 font-mono text-xs font-black tracking-[0.3em] text-gold">
                  ▶ TODAY&apos;S QUEST — {daily.date}
                </div>
                <h1 className="mb-3 text-3xl font-black [text-shadow:4px_4px_0_rgb(0_0_0/0.45)]">
                  {daily.exercise.title}
                </h1>
                <div className="mb-4 flex gap-2 font-mono text-xs font-extrabold">
                  <span className="border-2 border-ink bg-black/35 px-3 py-0.5">
                    PAR {daily.exercise.par}
                  </span>
                  <span
                    className={`border-2 border-ink bg-black/35 px-3 py-0.5 ${daily.xpGranted ? "text-matcha" : "text-gold"}`}
                  >
                    {daily.xpGranted ? "本日クリア済 ✓" : "REWARD +15XP〜"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {daily.xpGranted && next ? (
                    <>
                      {/* 今日のノルマは済み → 主役は次のレッスン(playtest feedback) */}
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
                        次のレッスン: {next.lesson.title.split(" — ")[0]}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ screen: "daily" })}
                        className="btn-chunky border-2 border-b-[6px] border-ink-bold bg-raised px-6 py-3 text-left font-mono text-xs font-extrabold text-cream-dim"
                      >
                        今日のお題にもう一度
                        <span className="block text-[0.625rem] font-normal text-cream-faint">
                          自己ベスト{" "}
                          {profile.exerciseBests[daily.exercise.id]
                            ?.keystrokes ?? "—"}{" "}
                          キーをもっと少なく = ベスト更新
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate({ screen: "daily" })}
                        className="btn-chunky inline-flex items-center gap-3 border-b-8 border-shu-dark bg-shu px-11 py-4 text-xl font-black tracking-widest text-[#fff6ec]"
                      >
                        {daily.xpGranted ? "もう一度挑む" : "挑戦する"}
                      </button>
                      {next && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              screen: "lesson",
                              stageIndex: next.stageIndex,
                              lessonIndex: next.lessonIndex,
                            })
                          }
                          className="btn-chunky border-2 border-b-[6px] border-ink-bold bg-raised px-6 py-3 font-mono text-sm font-extrabold text-cream-dim"
                        >
                          レッスンへ: {next.lesson.title.split(" — ")[0]}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : next ? (
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

        {/* WANTED: weak-command drill */}
        {daily && (
          <section className="pixel-panel flex items-center gap-6 p-6">
            <div className="font-mono text-sm font-black tracking-[0.15em]">
              ⚔️ WANTED — 弱点ドリル
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {weak.length > 0 ? (
                weak.slice(0, 5).map((command) => (
                  <span
                    key={command}
                    className="border-2 border-shu-dark bg-[#241512] px-3 py-1 font-mono text-sm font-black text-shu"
                  >
                    👾 {command}
                  </span>
                ))
              ) : (
                <span className="font-mono text-xs text-cream-faint">
                  いまのところ弱点なし。腕を落とすなよ。
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate({ screen: "drill" })}
              className="btn-chunky border-2 border-b-[6px] border-[#567f2b] bg-matcha px-8 py-3 font-black tracking-widest text-[#17260a]"
            >
              たたかう(5問)
            </button>
          </section>
        )}

        {/* World map */}
        <section className="pixel-panel p-8">
          <div className="mb-5 flex items-baseline gap-3 font-mono text-lg font-black tracking-widest">
            WORLD MAP
            <span className="text-xs font-normal text-cream-faint">
              — レッスンをクリアして道を進め
            </span>
            <span className="ml-auto flex items-center gap-3 text-xs font-normal text-cream-dim">
              <span>
                <span className="font-black text-matcha">✓</span> クリア済み
              </span>
              <span>
                <span className="font-black text-gold">▶</span>{" "}
                おすすめの次レッスン
              </span>
              <span>
                <span className="font-black">?</span>{" "}
                未クリア(どれでも挑戦できる)
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {stages.map((stage, stageIndex) => {
              const statuses = stageLessonStatuses(profile, stages, stageIndex);
              const empty = stage.lessons.length === 0;
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-4 ${empty ? "opacity-50" : ""}`}
                >
                  <div
                    className={`w-[150px] flex-none border-3 py-2 text-center font-mono text-sm font-black shadow-[3px_3px_0_rgb(0_0_0/0.6)] ${
                      statuses.every((s) => s === "cleared") && !empty
                        ? "border-matcha-dim text-matcha"
                        : "border-ink"
                    } bg-raised`}
                  >
                    {stage.title}
                    <span className="block text-xs font-normal text-cream-dim">
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
                          isBoss={lesson.boss ?? false}
                          status={statuses[lessonIndex] ?? "upcoming"}
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

        {/* Achievements */}
        <section className="pixel-panel p-8">
          <div className="mb-5 flex items-baseline gap-3 font-mono text-lg font-black tracking-widest">
            MEDALS
            <span className="text-xs font-normal text-cream-faint">
              — 実績 {Object.keys(profile.achievements).length}/
              {achievementDefs.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {achievementDefs.map((def) => {
              const unlocked = profile.achievements[def.id] !== undefined;
              return (
                <div
                  key={def.id}
                  className={`flex items-center gap-3 border-2 p-3 ${
                    unlocked
                      ? "border-gold bg-black/30"
                      : "border-dashed border-ink-bold opacity-45"
                  }`}
                  title={def.description}
                >
                  <span className="text-2xl">{unlocked ? def.icon : "❓"}</span>
                  <div>
                    <div className="text-sm font-black">{def.name}</div>
                    <div className="text-[0.625rem] text-cream-faint">
                      {def.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <BackupPanel />

        {/* Data footer (UC6) */}
        <footer className="flex items-center justify-end gap-3 pb-4 font-mono text-xs text-cream-faint">
          <span>
            進捗はこのブラウザに保存
            {profile.lastExportAt
              ? ` · 最終エクスポート ${profile.lastExportAt.toLocaleDateString("ja-JP")}`
              : " · まだエクスポートしていない"}
          </span>
          <button
            type="button"
            onClick={exportProgress}
            className="btn-chunky border-2 border-b-4 border-ink-bold bg-raised px-4 py-1.5 font-extrabold text-cream-dim"
          >
            エクスポート
          </button>
          <label className="btn-chunky cursor-pointer border-2 border-b-4 border-ink-bold bg-raised px-4 py-1.5 font-extrabold text-cream-dim">
            インポート
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={importProgress}
            />
          </label>
        </footer>
      </main>
    </div>
  );

  async function exportProgress() {
    let json: string;
    try {
      json = await store.exportJson();
    } catch (error) {
      // Same feedback shape as the import path — a silent rejection would
      // leave the user thinking the download just didn't start.
      window.alert(
        `エクスポートに失敗しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vim-dojo-${localDateOf(clock.now())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setProfile({ ...profile, lastExportAt: clock.now() });
  }

  async function importProgress(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !window.confirm(
        "現在の進捗をインポート内容で全置換します。よろしいですか?(現在のデータは事前にエクスポートしておくことを推奨)",
      )
    ) {
      event.target.value = "";
      return;
    }
    try {
      await store.importJson(await file.text());
      window.location.reload(); // reboot on the imported profile
    } catch (error) {
      window.alert(
        `インポートに失敗しました(データは変更されていません): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      event.target.value = "";
    }
  }
}

function LessonNode({
  label,
  status,
  isBoss,
  isLast,
  onClick,
}: {
  label: string;
  status: LessonStatus;
  isBoss: boolean;
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
      <span className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          title={`${label} — ${status === "cleared" ? "クリア済み" : status === "current" ? "おすすめの次" : "未クリア(いつでも挑戦できる)"}`}
          aria-label={`${label} (${status})`}
          className={`${base} ${style} cursor-pointer ${status === "upcoming" ? "hover:border-cream-faint hover:text-cream" : ""}`}
        >
          {status === "cleared"
            ? "✓"
            : isBoss
              ? "👹"
              : status === "current"
                ? "▶"
                : "?"}
        </button>
        <span
          className={`max-w-24 truncate font-mono text-sm font-bold ${
            status === "current"
              ? "font-black text-gold"
              : status === "cleared"
                ? "text-matcha"
                : "text-cream-dim"
          }`}
        >
          {label}
        </span>
      </span>
      {!isLast && (
        <span
          className={`mb-5 h-1.5 w-5 flex-none self-center ${
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
