import { describe, expect, it } from "vitest";
import { achievementId, exerciseId, lessonId } from "../ids";
import { initialProfile, type Profile } from "../profile";
import { evaluateAchievements } from "./achievements";

const now = new Date("2026-07-11T20:00:00");

describe("evaluateAchievements (R18)", () => {
  it("unlocks nothing on a fresh profile", () => {
    const { profile, newlyUnlocked } = evaluateAchievements(
      initialProfile,
      now,
    );
    expect(newlyUnlocked).toEqual([]);
    expect(profile).toBe(initialProfile);
  });

  it("unlocks satisfied achievements exactly once", () => {
    const withLesson: Profile = {
      ...initialProfile,
      lessonClears: { [lessonId("s1-l1-x")]: { clearedAt: now } },
    };
    const first = evaluateAchievements(withLesson, now);
    expect(first.newlyUnlocked.map((d) => d.id)).toEqual([
      achievementId("first-lesson"),
    ]);
    expect(
      first.profile.achievements[achievementId("first-lesson")]?.unlockedAt,
    ).toBe(now);
    // Second evaluation: already recorded, nothing new (R18: 取り消されない).
    const second = evaluateAchievements(first.profile, new Date());
    expect(second.newlyUnlocked).toEqual([]);
    expect(second.profile).toBe(first.profile);
  });

  it("unlocks medal- and streak-based achievements", () => {
    const strong: Profile = {
      ...initialProfile,
      exerciseBests: {
        [exerciseId("daily-2026-07-11")]: { medal: "gold", keystrokes: 3 },
      },
      streak: { current: 7, longest: 7, lastActiveDate: null, freezes: 0 },
    };
    const { newlyUnlocked } = evaluateAchievements(strong, now);
    const ids = newlyUnlocked.map((d) => d.id);
    expect(ids).toContain(achievementId("first-gold"));
    expect(ids).toContain(achievementId("streak-7"));
    expect(ids).toContain(achievementId("daily-debut"));
    expect(ids).not.toContain(achievementId("streak-30"));
  });
});
