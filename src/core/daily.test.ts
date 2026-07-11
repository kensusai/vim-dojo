import { describe, expect, it } from "vitest";
import { applyDailyAttempt, resolveDailyChallenge } from "./daily";
import { commandId, exerciseId, lessonId } from "./ids";
import { localDate } from "./localDate";
import type { DailyChallengeRecord } from "./ports";
import type { Attempt } from "./practice/attempt";
import { initialProfile, type Profile } from "./profile";

// Enough cleared lessons for generation: w/l/x + j/dd etc.
const playerProfile: Profile = {
  ...initialProfile,
  lessonClears: Object.fromEntries(
    ["s1-l1-x", "s1-l2-hl", "s1-l3-jk", "s1-l4-w", "s1-l12-dd-count"].map(
      (id) => [lessonId(id), { clearedAt: new Date("2026-07-01") }],
    ),
  ),
};

const date = localDate("2026-07-11");

const clearedAttempt = (record: DailyChallengeRecord): Attempt => ({
  exerciseId: record.exercise.id,
  source: "daily",
  playedAt: new Date("2026-07-11T21:00:00"),
  result: "cleared",
  keystrokes: record.exercise.par,
  medal: "gold",
  practicedCommands: record.exercise.practicedCommands,
  durationMs: 4000,
});

describe("resolveDailyChallenge (R13, R14)", () => {
  it("generates a new record when none exists", () => {
    const record = resolveDailyChallenge(null, date, playerProfile);
    expect(record).not.toBeNull();
    expect(record!.date).toBe(date);
    expect(record!.xpGranted).toBe(false);
  });

  it("reuses the stored record for the same date even if unlocks changed (R14)", () => {
    const first = resolveDailyChallenge(null, date, playerProfile)!;
    const laterProfile = { ...playerProfile, lessonClears: {} }; // even regressed
    expect(resolveDailyChallenge(first, date, laterProfile)).toBe(first);
  });

  it("generates a fresh record when the date moves on (R13)", () => {
    const first = resolveDailyChallenge(null, date, playerProfile)!;
    const next = resolveDailyChallenge(
      first,
      localDate("2026-07-12"),
      playerProfile,
    )!;
    expect(next.date).toBe(localDate("2026-07-12"));
    expect(next.exercise.id).not.toBe(first.exercise.id);
  });

  it("returns null for a brand-new player (nothing unlocked)", () => {
    expect(resolveDailyChallenge(null, date, initialProfile)).toBeNull();
  });
});

describe("applyDailyAttempt (R15, R8)", () => {
  const record = resolveDailyChallenge(null, date, playerProfile)!;

  it("grants XP on the first clear and marks the record granted", () => {
    const outcome = applyDailyAttempt(
      playerProfile,
      record,
      clearedAttempt(record),
    );
    expect(outcome.xpGained).toBe(20); // gold daily (P1: 15 + 5)
    expect(outcome.record.xpGranted).toBe(true);
    expect(outcome.profile.xp).toBe(20);
    expect(outcome.streak).toEqual({ kind: "started" });
    expect(outcome.profile.streak.current).toBe(1);
  });

  it("pays no XP on later clears the same day (R15) but keeps bests", () => {
    const first = applyDailyAttempt(
      playerProfile,
      record,
      clearedAttempt(record),
    );
    const again = applyDailyAttempt(first.profile, first.record, {
      ...clearedAttempt(record),
      keystrokes: 1,
    });
    expect(again.xpGained).toBe(0);
    expect(again.profile.xp).toBe(first.profile.xp);
    expect(again.profile.exerciseBests[record.exercise.id]?.keystrokes).toBe(1);
  });

  it("changes nothing for an abandoned attempt", () => {
    const outcome = applyDailyAttempt(playerProfile, record, {
      ...clearedAttempt(record),
      result: "abandoned",
      medal: null,
    });
    expect(outcome.profile).toBe(playerProfile);
    expect(outcome.record.xpGranted).toBe(false);
  });
});

// Guard against fake exercise ids drifting from the record.
it("attempt fixtures reference the generated exercise", () => {
  const record = resolveDailyChallenge(null, date, playerProfile)!;
  expect(record.exercise.id).toBe(exerciseId(`daily-${date}`));
  expect(record.exercise.practicedCommands.length).toBeGreaterThan(0);
  expect(record.exercise.practicedCommands[0]).not.toBe(commandId(""));
});
