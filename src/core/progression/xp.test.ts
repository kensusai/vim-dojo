import { describe, expect, it } from "vitest";
import { levelFromXp, levelProgress, requiredXpForLevel, xpFor } from "./xp";

describe("xpFor (R16 amounts, P1)", () => {
  it("prices each learning activity", () => {
    expect(xpFor({ kind: "lessonClear" })).toBe(20);
    expect(xpFor({ kind: "drillClear", medal: "gold" })).toBe(10);
    expect(xpFor({ kind: "drillClear", medal: "silver" })).toBe(7);
    expect(xpFor({ kind: "drillClear", medal: "bronze" })).toBe(5);
    expect(xpFor({ kind: "dailyFirstClear", medal: "gold" })).toBe(20);
    expect(xpFor({ kind: "dailyFirstClear", medal: "silver" })).toBe(15);
    expect(xpFor({ kind: "dailyFirstClear", medal: "bronze" })).toBe(15);
  });
});

describe("level curve (R17, P2)", () => {
  it("prices levels on the triangular curve", () => {
    expect(requiredXpForLevel(1)).toBe(0);
    expect(requiredXpForLevel(2)).toBe(100);
    expect(requiredXpForLevel(3)).toBe(300);
    expect(requiredXpForLevel(4)).toBe(600);
  });

  it("derives the level from total XP alone, with exact boundaries", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });

  it("levels never decrease as XP grows (R17)", () => {
    let previous = 1;
    for (let xp = 0; xp <= 2000; xp += 50) {
      const level = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("reports progress toward the next level for the HUD gauge", () => {
    expect(levelProgress(150)).toEqual({
      level: 2,
      intoLevel: 50,
      neededForNext: 200,
    });
  });

  it("rejects invalid inputs as programming errors", () => {
    expect(() => levelFromXp(-1)).toThrow(RangeError);
    expect(() => levelFromXp(10.5)).toThrow(RangeError);
    expect(() => requiredXpForLevel(0)).toThrow(RangeError);
  });
});
