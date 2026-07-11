import { describe, expect, it } from "vitest";
import { commandId, exerciseId } from "../ids";
import type { Attempt } from "../practice/attempt";
import type { Medal } from "../practice/medal";
import { medalTrendByDay, weakCommands } from "./weakness";

const attempt = (
  commands: string[],
  medal: Medal | null,
  playedAt = new Date("2026-07-11T12:00:00"),
): Attempt => ({
  exerciseId: exerciseId("ex"),
  source: "drill",
  playedAt,
  result: medal ? "cleared" : "abandoned",
  keystrokes: 10,
  medal,
  practicedCommands: commands.map(commandId),
  durationMs: 1000,
});

describe("weakCommands (R19, P5)", () => {
  it("flags a command with ≤2 silver-or-better among its last 5 attempts", () => {
    const attempts = [
      attempt(["dd"], "bronze"),
      attempt(["dd"], "bronze"),
      attempt(["dd"], "silver"),
      attempt(["dd"], "bronze"),
      attempt(["dd"], null), // abandoned
    ];
    expect(weakCommands(attempts)).toEqual([commandId("dd")]);
  });

  it("does not flag a command performing well", () => {
    const attempts = [
      attempt(["w"], "gold"),
      attempt(["w"], "silver"),
      attempt(["w"], "gold"),
    ];
    expect(weakCommands(attempts)).toEqual([]);
  });

  it("ignores commands with fewer than 3 attempts (P5 refinement)", () => {
    const attempts = [attempt(["f"], "bronze"), attempt(["f"], "bronze")];
    expect(weakCommands(attempts)).toEqual([]);
  });

  it("judges only the most recent 5 attempts", () => {
    const attempts = [
      // old bronzes...
      ...Array.from({ length: 5 }, () => attempt(["x"], "bronze")),
      // ...but recently golden
      ...Array.from({ length: 5 }, () => attempt(["x"], "gold")),
    ];
    expect(weakCommands(attempts)).toEqual([]);
  });
});

describe("medalTrendByDay", () => {
  it("averages medal scores per local day, sorted by date", () => {
    const trend = medalTrendByDay([
      attempt(["x"], "gold", new Date("2026-07-10T09:00:00")),
      attempt(["x"], "bronze", new Date("2026-07-10T10:00:00")),
      attempt(["x"], "silver", new Date("2026-07-11T09:00:00")),
    ]);
    expect(trend).toEqual([
      { date: "2026-07-10", score: 2 }, // (3+1)/2
      { date: "2026-07-11", score: 2 },
    ]);
  });
});
