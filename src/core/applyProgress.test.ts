import { describe, expect, it } from "vitest";
import { applyDrillAttempt, completeDrillSession } from "./applyProgress";
import { commandId, exerciseId } from "./ids";
import { localDate } from "./localDate";
import type { Attempt } from "./practice/attempt";
import { initialProfile, type Profile } from "./profile";

const cleared: Attempt = {
  exerciseId: exerciseId("ex-1"),
  source: "drill",
  playedAt: new Date("2026-07-11T20:00:00"),
  result: "cleared",
  keystrokes: 9,
  medal: "gold",
  practicedCommands: [commandId("dw")],
  durationMs: 5_000,
};

describe("applyDrillAttempt", () => {
  it("grants XP and records the best on the first clear (R16, R4)", () => {
    const { profile, xpGained, firstClear } = applyDrillAttempt(
      initialProfile,
      cleared,
    );
    expect(xpGained).toBe(10); // gold (P1)
    expect(firstClear).toBe(true);
    expect(profile.xp).toBe(10);
    expect(profile.exerciseBests[cleared.exerciseId]).toEqual({
      medal: "gold",
      keystrokes: 9,
    });
  });

  it("pays no XP on re-clears but still improves the best (R16, R4)", () => {
    const once = applyDrillAttempt(initialProfile, cleared).profile;
    const { profile, xpGained } = applyDrillAttempt(once, {
      ...cleared,
      keystrokes: 7,
    });
    expect(xpGained).toBe(0);
    expect(profile.xp).toBe(10);
    expect(profile.exerciseBests[cleared.exerciseId]?.keystrokes).toBe(7);
  });

  it("leaves the profile untouched for abandoned attempts", () => {
    const { profile, xpGained } = applyDrillAttempt(initialProfile, {
      ...cleared,
      result: "abandoned",
      medal: null,
    });
    expect(profile).toBe(initialProfile);
    expect(xpGained).toBe(0);
  });
});

describe("completeDrillSession", () => {
  it("counts the session as the day's learning activity (R8, R12)", () => {
    const { profile, streak } = completeDrillSession(
      initialProfile,
      new Date("2026-07-11T20:00:00"),
    );
    expect(profile.streak).toMatchObject({
      current: 1,
      lastActiveDate: localDate("2026-07-11"),
    });
    expect(streak).toEqual({ kind: "started" });
  });

  it("does not double-count two sessions on the same day (R8)", () => {
    const first = completeDrillSession(
      initialProfile,
      new Date("2026-07-11T08:00:00"),
    ).profile;
    const { profile, streak } = completeDrillSession(
      first,
      new Date("2026-07-11T22:00:00"),
    );
    expect(profile.streak.current).toBe(1);
    expect(streak).toEqual({ kind: "alreadyActiveToday" });
  });
});

// applyDrillAttempt must not mutate its input (pure core rule)
it("does not mutate the input profile", () => {
  const before: Profile = structuredClone(initialProfile);
  applyDrillAttempt(initialProfile, cleared);
  expect(initialProfile).toEqual(before);
});
