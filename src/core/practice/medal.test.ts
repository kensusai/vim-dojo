import { describe, expect, it } from "vitest";
import { judgeMedal } from "./medal";

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
