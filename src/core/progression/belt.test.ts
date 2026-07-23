import { describe, expect, it } from "vitest";
import { beltForLevel } from "./belt";

// 帯 (Belt): flavor label derived from level — boundaries per belt.ts.
describe("beltForLevel", () => {
  it("maps the documented level boundaries to their belts", () => {
    expect(beltForLevel(1)).toBe("白帯");
    expect(beltForLevel(2)).toBe("白帯");
    expect(beltForLevel(3)).toBe("黄帯");
    expect(beltForLevel(9)).toBe("青帯");
    expect(beltForLevel(11)).toBe("茶帯");
    expect(beltForLevel(14)).toBe("茶帯");
    expect(beltForLevel(15)).toBe("黒帯");
    expect(beltForLevel(99)).toBe("黒帯");
  });
});
