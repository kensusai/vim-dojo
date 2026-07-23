import { describe, expect, it } from "vitest";
import { daysBetween, localDate, localDateOf } from "./localDate";

describe("localDate", () => {
  it("accepts YYYY-MM-DD and rejects other shapes", () => {
    expect(localDate("2026-07-11")).toBe("2026-07-11");
    expect(() => localDate("2026/07/11")).toThrow(RangeError);
    expect(() => localDate("2026-7-11")).toThrow(RangeError);
  });

  it("rejects well-shaped but impossible calendar dates", () => {
    // These used to pass the regex and then NaN out daysBetween silently.
    expect(() => localDate("2026-13-40")).toThrow(RangeError);
    expect(() => localDate("2026-02-29")).toThrow(RangeError); // not a leap year
    expect(() => localDate("2026-00-10")).toThrow(RangeError);
    expect(localDate("2024-02-29")).toBe("2024-02-29"); // leap day is real
  });

  it("assigns an instant to its local calendar day (R12)", () => {
    // new Date(y, m, d, hh, mm) is constructed in the local timezone, so this
    // holds in any TZ the test runs in: 23:59 belongs to the same local day.
    expect(localDateOf(new Date(2026, 6, 11, 23, 59))).toBe("2026-07-11");
    expect(localDateOf(new Date(2026, 6, 12, 0, 1))).toBe("2026-07-12");
  });

  it("counts whole days across month ends and DST-sized offsets", () => {
    expect(daysBetween(localDate("2026-07-11"), localDate("2026-07-12"))).toBe(
      1,
    );
    expect(daysBetween(localDate("2026-06-30"), localDate("2026-07-02"))).toBe(
      2,
    );
    expect(daysBetween(localDate("2026-07-12"), localDate("2026-07-11"))).toBe(
      -1,
    );
    expect(daysBetween(localDate("2026-12-31"), localDate("2027-01-01"))).toBe(
      1,
    );
  });
});
