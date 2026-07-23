import { describe, expect, it } from "vitest";
import { commandId, exerciseId } from "../ids";
import type { Attempt } from "./attempt";
import { improveBest } from "./best";
import { judgeMedal } from "./medal";

const attempt = (overrides: Partial<Attempt>): Attempt => ({
  exerciseId: exerciseId("ex-1"),
  source: "drill",
  playedAt: new Date("2026-07-11T12:00:00"),
  result: "cleared",
  keystrokes: 10,
  medal: judgeMedal(10, 10),
  practicedCommands: [commandId("dw")],
  durationMs: 1000,
  ...overrides,
});

// R4: メダル・ベストキーストロークはベスト記録で上書きされる(下がらない)
describe("improveBest (R4)", () => {
  it("sets the first cleared attempt as the best", () => {
    expect(improveBest(undefined, attempt({}))).toEqual({
      medal: "gold",
      keystrokes: 10,
    });
  });

  it("replaces the best only with fewer keystrokes", () => {
    const current = { medal: "silver", keystrokes: 14 } as const;
    expect(
      improveBest(current, attempt({ keystrokes: 9, medal: "gold" })),
    ).toEqual({ medal: "gold", keystrokes: 9 });
  });

  it("keeps the best when the new attempt is equal or worse", () => {
    const current = { medal: "gold", keystrokes: 9 } as const;
    expect(
      improveBest(current, attempt({ keystrokes: 9, medal: "gold" })),
    ).toBe(current);
    expect(
      improveBest(current, attempt({ keystrokes: 20, medal: "bronze" })),
    ).toBe(current);
  });

  it("never downgrades the medal when a later, harder-difficulty attempt clears with fewer keys", () => {
    // easy: gold <= floor(10 * 1.4) = 14 → 13 keys earned gold
    const current = { medal: "gold", keystrokes: 13 } as const;
    // normal: 12 keys is only silver (gold <= 10), but it IS fewer keys
    const next = attempt({
      keystrokes: 12,
      medal: judgeMedal(10, 12, "normal"),
    });
    expect(next.medal).toBe("silver"); // premise of the scenario
    expect(improveBest(current, next)).toEqual({
      medal: "gold",
      keystrokes: 12,
    });
  });

  it("upgrades the medal even when the keystroke count does not improve", () => {
    // easy widens the gold band: 13 keys on par 10 is gold there
    const current = { medal: "silver", keystrokes: 12 } as const;
    const next = attempt({ keystrokes: 13, medal: judgeMedal(10, 13, "easy") });
    expect(next.medal).toBe("gold"); // premise of the scenario
    expect(improveBest(current, next)).toEqual({
      medal: "gold",
      keystrokes: 12,
    });
  });

  it("ignores abandoned attempts entirely", () => {
    const current = { medal: "bronze", keystrokes: 25 } as const;
    expect(
      improveBest(current, attempt({ result: "abandoned", medal: null })),
    ).toBe(current);
    expect(
      improveBest(undefined, attempt({ result: "abandoned", medal: null })),
    ).toBeUndefined();
  });
});
