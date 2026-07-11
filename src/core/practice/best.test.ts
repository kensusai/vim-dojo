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
