/**
 * XP and level rules (R16–R17, P1–P2).
 *
 * XP amounts (P1, 暫定 — tune after playtesting):
 *   lesson clear 20 / drill clear by medal 10·7·5 /
 *   daily challenge first clear 15 (+5 when gold).
 * Double-grant prevention (R16) is the caller's job: lesson XP only on the
 * first clear (lessonClears map), daily XP guarded by the xpGranted flag —
 * this module just prices events.
 */
import type { Medal } from "../practice/medal";

export type XpEvent =
  | { kind: "lessonClear" }
  | { kind: "drillClear"; medal: Medal }
  | { kind: "dailyFirstClear"; medal: Medal };

const DRILL_XP: Record<Medal, number> = { gold: 10, silver: 7, bronze: 5 };

export function xpFor(event: XpEvent): number {
  switch (event.kind) {
    case "lessonClear":
      return 20;
    case "drillClear":
      return DRILL_XP[event.medal];
    case "dailyFirstClear":
      return 15 + (event.medal === "gold" ? 5 : 0);
    default:
      return assertNever(event);
  }
}

/**
 * Level curve (P2): being level n requires cumulative XP of
 * 100 * (n-1) * n / 2 — i.e. each level-up costs 100 more than the last.
 * Level is derived from total XP only and never decreases (R17).
 */
export function requiredXpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level must be a positive integer, got ${level}`);
  }
  return (100 * (level - 1) * level) / 2;
}

export function levelFromXp(totalXp: number): number {
  if (!Number.isInteger(totalXp) || totalXp < 0) {
    throw new RangeError(
      `totalXp must be a non-negative integer, got ${totalXp}`,
    );
  }
  let level = 1;
  while (requiredXpForLevel(level + 1) <= totalXp) level += 1;
  return level;
}

/** Progress toward the next level, for the HUD XP gauge. */
export function levelProgress(totalXp: number): {
  level: number;
  intoLevel: number;
  neededForNext: number;
} {
  const level = levelFromXp(totalXp);
  const floor = requiredXpForLevel(level);
  return {
    level,
    intoLevel: totalXp - floor,
    neededForNext: requiredXpForLevel(level + 1) - floor,
  };
}

function assertNever(value: never): never {
  throw new Error(`unreachable: ${JSON.stringify(value)}`);
}
