/**
 * The boss (a pixel oni) for 皆伝試験 lessons: flinches on every keystroke
 * and shifts expression/taunts by medal zone (playtest request: ボスが
 * キー入力にリアクションしてほしい). Purely presentational — zones come from
 * core's medalThresholds, the same lines the gauge and the judgment use.
 */
import { motion } from "motion/react";
import type { Difficulty } from "../core/difficulty";
import { medalThresholds } from "../core/practice/medal";
import type { Exercise } from "../core/practice/exercise";

type BossMood = "idle" | "worried" | "smug" | "laughing";

export function BossSprite({
  mood,
  size = 96,
}: {
  mood: BossMood;
  size?: number;
}) {
  // Eyes and mouth change with the fight's momentum.
  const eyes =
    mood === "worried" ? (
      <>
        {/* wide, rattled eyes */}
        <rect x="5" y="7" width="3" height="3" fill="#fff" />
        <rect x="12" y="7" width="3" height="3" fill="#fff" />
        <rect x="6" y="8" width="1" height="1" fill="#1d1a14" />
        <rect x="13" y="8" width="1" height="1" fill="#1d1a14" />
        {/* sweat */}
        <rect x="16" y="6" width="1" height="2" fill="#7cc7ff" />
      </>
    ) : mood === "smug" ? (
      <>
        {/* half-closed */}
        <rect x="5" y="8" width="3" height="1" fill="#1d1a14" />
        <rect x="12" y="8" width="3" height="1" fill="#1d1a14" />
      </>
    ) : mood === "laughing" ? (
      <>
        {/* closed, cackling */}
        <rect x="5" y="8" width="3" height="1" fill="#1d1a14" />
        <rect x="12" y="8" width="3" height="1" fill="#1d1a14" />
        <rect x="4" y="6" width="1" height="1" fill="#ffd25e" />
        <rect x="15" y="6" width="1" height="1" fill="#ffd25e" />
      </>
    ) : (
      <>
        {/* glaring */}
        <rect x="5" y="7" width="3" height="2" fill="#ffd25e" />
        <rect x="12" y="7" width="3" height="2" fill="#ffd25e" />
        <rect x="6" y="8" width="1" height="1" fill="#1d1a14" />
        <rect x="13" y="8" width="1" height="1" fill="#1d1a14" />
      </>
    );
  const mouth =
    mood === "laughing" ? (
      <rect x="6" y="11" width="8" height="3" fill="#3a0d0d" />
    ) : mood === "worried" ? (
      <rect x="8" y="12" width="4" height="1" fill="#3a0d0d" />
    ) : (
      <rect x="6" y="12" width="8" height="1" fill="#3a0d0d" />
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    >
      {/* horns */}
      <rect x="3" y="1" width="2" height="3" fill="#f3e9cd" />
      <rect x="15" y="1" width="2" height="3" fill="#f3e9cd" />
      <rect x="4" y="3" width="2" height="2" fill="#f3e9cd" />
      <rect x="14" y="3" width="2" height="2" fill="#f3e9cd" />
      {/* wild hair */}
      <rect x="6" y="2" width="8" height="3" fill="#1d1a14" />
      {/* face */}
      <rect x="4" y="5" width="12" height="10" fill="#c0392b" />
      <rect x="3" y="6" width="1" height="7" fill="#c0392b" />
      <rect x="16" y="6" width="1" height="7" fill="#c0392b" />
      {eyes}
      {mouth}
      {/* fangs (hidden while laughing mouth is open wide) */}
      {mood !== "laughing" && (
        <>
          <rect x="6" y="13" width="1" height="1" fill="#fff" />
          <rect x="13" y="13" width="1" height="1" fill="#fff" />
        </>
      )}
      {mood === "laughing" && (
        <>
          <rect x="7" y="11" width="1" height="1" fill="#fff" />
          <rect x="12" y="11" width="1" height="1" fill="#fff" />
        </>
      )}
      {/* shoulders */}
      <rect x="5" y="15" width="10" height="3" fill="#57281c" />
      <rect x="3" y="16" width="2" height="2" fill="#57281c" />
      <rect x="15" y="16" width="2" height="2" fill="#57281c" />
    </svg>
  );
}

/** Side panel for boss lessons: sprite, gold-chance gauge and taunts. */
export function BossPanel({
  exercise,
  keystrokes,
  difficulty,
}: {
  exercise: Exercise;
  keystrokes: number;
  difficulty: Difficulty;
}) {
  const { goldMax, silverMax } = medalThresholds(exercise.par, difficulty);
  const mood: BossMood =
    keystrokes === 0
      ? "idle"
      : keystrokes <= goldMax
        ? "worried"
        : keystrokes <= silverMax
          ? "smug"
          : "laughing";
  const taunt =
    mood === "idle"
      ? "来たな小僧…この俺を、最少の手数で編集できるかな!?"
      : mood === "worried"
        ? "ぬぅ…!? 無駄のない打鍵…やるな…!!"
        : mood === "smug"
          ? "フン、パーは守れなかったな。まだ銀はくれてやる。"
          : "フハハハ!! 手数が多いぞ!! それでも倒せはするがな!!";
  const chance = Math.max(0, goldMax - keystrokes);

  return (
    <div className="pixel-panel border-shu-dark p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-xs font-black tracking-[0.2em] text-shu">
        <span>👹 BOSS — 皆伝試験</span>
        <span className="text-[0.625rem] text-cream-faint">EDIT-ONI</span>
      </div>
      <div className="flex items-center gap-3">
        {/* re-mounts every keystroke → the oni flinches at each key */}
        <motion.div
          key={keystrokes}
          initial={
            keystrokes === 0
              ? false
              : {
                  x: mood === "worried" ? -6 : 3,
                  rotate: mood === "worried" ? -6 : 3,
                }
          }
          animate={{ x: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 14 }}
          className="flex-none"
        >
          <BossSprite mood={mood} size={84} />
        </motion.div>
        <p className="text-sm font-bold text-cream">{taunt}</p>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between font-mono text-[0.625rem] tracking-widest text-cream-faint">
          <span>GOLD CHANCE</span>
          <span>
            あと {chance} / {goldMax}
          </span>
        </div>
        <div className="h-3 border-2 border-ink-bold bg-black">
          <div
            className="h-full bg-gold transition-[width] duration-150"
            style={{ width: `${(chance / goldMax) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
