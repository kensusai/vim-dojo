import { describe, expect, it } from "vitest";
import { judgeMedal, medalThresholds } from "./medal";

// R3: keystrokes <= par → gold, <= ceil(par * 1.5) → silver, cleared → bronze
describe("judgeMedal (R3)", () => {
  it("returns gold at or under par", () => {
    expect(judgeMedal(12, 11)).toBe("gold");
    expect(judgeMedal(12, 12)).toBe("gold");
  });

  it("returns silver over par but within ceil(par * 1.5)", () => {
    expect(judgeMedal(12, 13)).toBe("silver");
    expect(judgeMedal(12, 18)).toBe("silver");
  });

  it("returns bronze beyond the silver line", () => {
    expect(judgeMedal(12, 19)).toBe("bronze");
    expect(judgeMedal(12, 24)).toBe("bronze");
  });

  it("rounds the silver line up for odd pars", () => {
    // par 7 → silver line ceil(10.5) = 11
    expect(judgeMedal(7, 11)).toBe("silver");
    expect(judgeMedal(7, 12)).toBe("bronze");
  });

  it("rejects non-positive or non-integer inputs as programming errors", () => {
    expect(() => judgeMedal(0, 5)).toThrow(RangeError);
    expect(() => judgeMedal(12, 0)).toThrow(RangeError);
    expect(() => judgeMedal(12.5, 5)).toThrow(RangeError);
    expect(() => judgeMedal(12, 5.5)).toThrow(RangeError);
  });
});

describe("judgeMedal with difficulty", () => {
  it("easy widens the gold band above par", () => {
    // par 10: easy gold <= floor(10*1.4)=14
    expect(judgeMedal(10, 14, "easy")).toBe("gold");
    expect(judgeMedal(10, 15, "easy")).toBe("silver"); // <= 10*2=20
    expect(judgeMedal(10, 21, "easy")).toBe("bronze");
  });

  it("hard keeps gold at par (optimal), like normal thresholds", () => {
    expect(judgeMedal(10, 10, "hard")).toBe("gold");
    expect(judgeMedal(10, 11, "hard")).toBe("silver");
    expect(judgeMedal(10, 16, "hard")).toBe("bronze");
  });

  it("defaults to normal", () => {
    expect(judgeMedal(10, 10)).toBe("gold");
    expect(judgeMedal(10, 14)).toBe("silver");
  });
});

// The gauge / boss display must use the same lines as the judgment — this is
// the shared source both sides call.
describe("medalThresholds (R3)", () => {
  it("matches the judgment lines per difficulty", () => {
    expect(medalThresholds(10)).toEqual({ goldMax: 10, silverMax: 15 });
    expect(medalThresholds(10, "easy")).toEqual({ goldMax: 14, silverMax: 20 });
    expect(medalThresholds(10, "hard")).toEqual({ goldMax: 10, silverMax: 15 });
    expect(medalThresholds(7)).toEqual({ goldMax: 7, silverMax: 11 });
  });

  it("agrees with judgeMedal at every boundary", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const { goldMax, silverMax } = medalThresholds(9, difficulty);
      expect(judgeMedal(9, goldMax, difficulty)).toBe("gold");
      expect(judgeMedal(9, goldMax + 1, difficulty)).toBe("silver");
      expect(judgeMedal(9, silverMax, difficulty)).toBe("silver");
      expect(judgeMedal(9, silverMax + 1, difficulty)).toBe("bronze");
    }
  });

  it("rejects non-positive or non-integer par", () => {
    expect(() => medalThresholds(0)).toThrow(RangeError);
    expect(() => medalThresholds(2.5)).toThrow(RangeError);
  });
});
