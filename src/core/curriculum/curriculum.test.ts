import { describe, expect, it } from "vitest";
import { commandId, lessonId } from "../ids";
import { initialProfile, type Profile } from "../profile";
import {
  isLessonPlayable,
  stageLessonStatuses,
  unlockedCommands,
} from "./curriculum";
import { markLessonCleared } from "./markLessonCleared";
import { stages } from "./stages";

const clearLessons = (...ids: string[]): Profile => ({
  ...initialProfile,
  lessonClears: Object.fromEntries(
    ids.map((id) => [lessonId(id), { clearedAt: new Date("2026-07-11") }]),
  ),
});

describe("stageLessonStatuses (R7)", () => {
  it("marks the first uncleared lesson current and the rest locked", () => {
    const statuses = stageLessonStatuses(initialProfile, stages, 0);
    expect(statuses[0]).toBe("current");
    expect(statuses[1]).toBe("locked");
    expect(statuses.at(-1)).toBe("locked");
  });

  it("advances the current marker as lessons are cleared", () => {
    const profile = clearLessons("s1-l1-x", "s1-l2-hl");
    const statuses = stageLessonStatuses(profile, stages, 0);
    expect(statuses[0]).toBe("cleared");
    expect(statuses[1]).toBe("cleared");
    expect(statuses[2]).toBe("current");
    expect(statuses[3]).toBe("locked");
  });

  it("locks an entire stage until earlier stages are fully cleared", () => {
    // With only one stage-1 lesson cleared, every stage-2 lesson stays locked.
    const statuses = stageLessonStatuses(clearLessons("s1-l1-x"), stages, 1);
    expect(statuses.every((s) => s === "locked")).toBe(true);
  });
});

describe("isLessonPlayable (R7)", () => {
  it("allows the current lesson and cleared lessons, blocks locked ones", () => {
    const profile = clearLessons("s1-l1-x");
    expect(isLessonPlayable(profile, stages, 0, 0)).toBe(true); // cleared
    expect(isLessonPlayable(profile, stages, 0, 1)).toBe(true); // current
    expect(isLessonPlayable(profile, stages, 0, 2)).toBe(false); // locked
  });
});

describe("unlockedCommands (R5)", () => {
  it("is empty initially and grows with cleared lessons", () => {
    expect(unlockedCommands(initialProfile, stages).size).toBe(0);
    const profile = clearLessons("s1-l1-x", "s1-l2-hl");
    const unlocked = unlockedCommands(profile, stages);
    expect(unlocked.has(commandId("x"))).toBe(true);
    expect(unlocked.has(commandId("h"))).toBe(true);
    expect(unlocked.has(commandId("l"))).toBe(true);
    expect(unlocked.has(commandId("w"))).toBe(false); // lesson 4, not cleared
  });
});

describe("markLessonCleared (R5 unlock, R16 XP-once)", () => {
  it("records the clear and grants lesson XP on first clear", () => {
    const { profile, xpGained, firstClear } = markLessonCleared(
      initialProfile,
      lessonId("s1-l1-x"),
      new Date("2026-07-11T20:00:00"),
    );
    expect(firstClear).toBe(true);
    expect(xpGained).toBe(20);
    expect(profile.xp).toBe(20);
    expect(profile.lessonClears[lessonId("s1-l1-x")]).toBeDefined();
  });

  it("does not grant XP or overwrite on a re-clear (R16)", () => {
    const once = markLessonCleared(
      initialProfile,
      lessonId("s1-l1-x"),
      new Date("2026-07-11T20:00:00"),
    ).profile;
    const again = markLessonCleared(
      once,
      lessonId("s1-l1-x"),
      new Date("2026-07-12T20:00:00"),
    );
    expect(again.xpGained).toBe(0);
    expect(again.firstClear).toBe(false);
    expect(again.profile.xp).toBe(20);
    expect(
      again.profile.lessonClears[lessonId("s1-l1-x")]?.clearedAt.toISOString(),
    ).toBe(new Date("2026-07-11T20:00:00").toISOString()); // unchanged
  });
});
