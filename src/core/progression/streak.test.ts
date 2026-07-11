import { describe, expect, it } from "vitest";
import { localDate } from "../localDate";
import { initialStreakState, recordActivity, type StreakState } from "./streak";

const d = localDate;

const on = (state: StreakState, date: string) => recordActivity(state, d(date));

describe("recordActivity — streak rules", () => {
  it("starts a streak on the first ever activity (R8)", () => {
    const { state, outcome } = on(initialStreakState, "2026-07-11");
    expect(state).toMatchObject({
      current: 1,
      longest: 1,
      lastActiveDate: "2026-07-11",
    });
    expect(outcome).toEqual({ kind: "started" });
  });

  it("counts a day once no matter how many activities happen (R8)", () => {
    const first = on(initialStreakState, "2026-07-11").state;
    const { state, outcome } = on(first, "2026-07-11");
    expect(state.current).toBe(1);
    expect(outcome).toEqual({ kind: "alreadyActiveToday" });
  });

  it("extends the streak on consecutive days (R9 前提)", () => {
    const s = on(initialStreakState, "2026-07-11").state;
    const result = on(s, "2026-07-12");
    expect(result.state.current).toBe(2);
    expect(result.outcome).toEqual({ kind: "extended" });
  });

  it("consumes one freeze per missed day and keeps the streak (R9)", () => {
    const base: StreakState = {
      current: 5,
      longest: 5,
      lastActiveDate: d("2026-07-11"),
      freezes: 2,
    };
    // 7/12 is skipped; activity resumes 7/13 → 1 missed day → 1 freeze
    const { state, outcome } = on(base, "2026-07-13");
    expect(state).toMatchObject({ current: 6, freezes: 1 });
    expect(outcome).toEqual({ kind: "freezeConsumed", consumed: 1 });
  });

  it("covers multiple missed days when the stock suffices (R9)", () => {
    const base: StreakState = {
      current: 5,
      longest: 5,
      lastActiveDate: d("2026-07-11"),
      freezes: 2,
    };
    // 7/12 and 7/13 skipped → 2 freezes consumed
    const { state, outcome } = on(base, "2026-07-14");
    expect(state).toMatchObject({ current: 6, freezes: 0 });
    expect(outcome).toEqual({ kind: "freezeConsumed", consumed: 2 });
  });

  it("resets to 1 when freezes cannot cover the gap, keeping the stock (R10, P10)", () => {
    const base: StreakState = {
      current: 12,
      longest: 12,
      lastActiveDate: d("2026-07-11"),
      freezes: 1,
    };
    // 2 missed days, 1 freeze → reset; the freeze is NOT half-spent (P10)
    const { state, outcome } = on(base, "2026-07-14");
    expect(state).toMatchObject({ current: 1, freezes: 1, longest: 12 });
    expect(outcome).toEqual({ kind: "reset", previous: 12 });
  });

  it("replenishes one freeze every 7 consecutive days, capped at 2 (R11, P3)", () => {
    let state = initialStreakState;
    for (let day = 1; day <= 7; day++) {
      state = on(state, `2026-07-${String(day).padStart(2, "0")}`).state;
    }
    expect(state).toMatchObject({ current: 7, freezes: 1 });
    for (let day = 8; day <= 14; day++) {
      state = on(state, `2026-07-${String(day).padStart(2, "0")}`).state;
    }
    expect(state).toMatchObject({ current: 14, freezes: 2 });
    for (let day = 15; day <= 21; day++) {
      state = on(state, `2026-07-${String(day).padStart(2, "0")}`).state;
    }
    expect(state.freezes).toBe(2); // capped (R11)
  });

  it("keeps the longest streak across resets", () => {
    const base: StreakState = {
      current: 12,
      longest: 12,
      lastActiveDate: d("2026-07-11"),
      freezes: 0,
    };
    let { state } = on(base, "2026-07-20"); // reset → 1
    expect(state.longest).toBe(12);
    state = on(state, "2026-07-21").state;
    expect(state).toMatchObject({ current: 2, longest: 12 });
  });

  it("ignores activities dated before the last active day (clock moved back)", () => {
    const base: StreakState = {
      current: 3,
      longest: 3,
      lastActiveDate: d("2026-07-11"),
      freezes: 1,
    };
    const { state, outcome } = on(base, "2026-07-10");
    expect(state).toBe(base);
    expect(outcome).toEqual({ kind: "alreadyActiveToday" });
  });
});
