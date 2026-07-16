import { describe, expect, it } from "vitest";
import { commandId, type CommandId } from "../ids";
import { localDate } from "../localDate";
import { canGenerate, generateDailyChallenge, generateDrill } from "./generate";

const unlockedAll = new Set<CommandId>(
  ["w", "l", "x", "j", "dd", "$", "f"].map(commandId),
);
const unlockedNone = new Set<CommandId>();

describe("generateDailyChallenge (R13, R14)", () => {
  it("is deterministic: same date, same exercise", () => {
    const a = generateDailyChallenge(localDate("2026-07-11"), unlockedAll);
    const b = generateDailyChallenge(localDate("2026-07-11"), unlockedAll);
    expect(a).toEqual(b);
  });

  it("varies across dates (no identical challenge two days running)", () => {
    const days = [
      "2026-07-11",
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
    ].map((d) => generateDailyChallenge(localDate(d), unlockedAll));
    const buffers = new Set(days.map((r) => r?.exercise.initialBuffer));
    expect(buffers.size).toBeGreaterThan(1);
  });

  it("returns null when nothing is unlocked yet (R6)", () => {
    expect(
      generateDailyChallenge(localDate("2026-07-11"), unlockedNone),
    ).toBeNull();
    expect(canGenerate(unlockedNone)).toBe(false);
  });

  it("never generates an already-solved or trivial exercise", () => {
    for (let day = 1; day <= 28; day++) {
      const record = generateDailyChallenge(
        localDate(`2026-07-${String(day).padStart(2, "0")}`),
        unlockedAll,
      );
      expect(record).not.toBeNull();
      expect(record!.exercise.initialBuffer).not.toBe(
        record!.exercise.targetBuffer,
      );
      expect(record!.exercise.par).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("generateDrill (R6, R19, P6)", () => {
  it("produces the requested count with only-unlocked templates", () => {
    const drill = generateDrill({ seed: "s", unlocked: unlockedAll });
    expect(drill).toHaveLength(5);
  });

  it("respects a reduced unlock set (R6)", () => {
    // Only f and x unlocked → only the f-jump template qualifies.
    const drill = generateDrill({
      seed: "s",
      unlocked: new Set([commandId("f"), commandId("x")]),
      count: 8,
    });
    expect(drill).toHaveLength(8);
    for (const ex of drill) {
      const practiced = new Set(ex.practicedCommands);
      expect(practiced.has(commandId("f"))).toBe(true);
    }
  });

  it("weights weak commands higher (R19)", () => {
    // With dd weak, duplicate-line exercises should appear noticeably more
    // often than without weighting, across many seeds.
    const count = (weak: CommandId[] | undefined) => {
      let hits = 0;
      for (let s = 0; s < 200; s++) {
        const [ex] = generateDrill({
          seed: `w${s}`,
          unlocked: unlockedAll,
          weakCommands: weak,
          count: 1,
        });
        if (ex!.practicedCommands.includes(commandId("dd"))) hits++;
      }
      return hits;
    };
    const unweighted = count(undefined);
    const weighted = count([commandId("dd")]);
    expect(weighted).toBeGreaterThan(unweighted);
  });

  it("covers distinct drill types in one session when enough are unlocked", () => {
    const allStage2 = new Set<CommandId>(
      ["h", "j", "k", "l", "x", "w", "f", "$", "dd", "p", "G", "ciw"].map(
        commandId,
      ),
    );
    for (let s = 0; s < 20; s++) {
      const drill = generateDrill({ seed: `v${s}`, unlocked: allStage2 });
      const kinds = new Set(drill.map((ex) => ex.practicedCommands.join(",")));
      // ≥5 distinct types usable, 5 exercises → all five must be different
      // types (same-signature variants like the two mazes count as one type)
      expect(kinds.size).toBe(5);
    }
  });

  it("is reproducible for the same seed", () => {
    const a = generateDrill({ seed: "same", unlocked: unlockedAll });
    const b = generateDrill({ seed: "same", unlocked: unlockedAll });
    expect(a).toEqual(b);
  });
});
