/**
 * Belt ranks (docs/domain.md 用語集: 帯 `Belt`). A flavorful label for the
 * player's level — the martial-arts progression from white to black belt.
 * Pure mapping from level; XP/level rules live in xp.ts.
 */
const BELTS = [
  "白帯", // 1-2
  "黄帯", // 3-4
  "橙帯", // 5-6
  "緑帯", // 7-8
  "青帯", // 9-10
  "茶帯", // 11-14
  "黒帯", // 15+
] as const;

const THRESHOLDS = [1, 3, 5, 7, 9, 11, 15];

export function beltForLevel(level: number): string {
  let belt: string = BELTS[0];
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (level >= THRESHOLDS[i]!) belt = BELTS[i]!;
  }
  return belt;
}
