// @vitest-environment jsdom
/**
 * BossPanel must judge its mood with the SAME thresholds as the medal
 * judgment (core medalThresholds) — a hardcoded normal-difficulty formula
 * made the boss taunt "パーは守れなかったな" while the gauge still showed a
 * gold zone on easy (review finding #6).
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commandId, exerciseId } from "../core/ids";
import type { Exercise } from "../core/practice/exercise";
import { BossPanel } from "./Boss";

afterEach(cleanup);

const exercise: Exercise = {
  id: exerciseId("boss-ex"),
  title: "皆伝試験",
  hint: "",
  initialBuffer: "foo bar",
  targetBuffer: "bar",
  par: 10,
  practicedCommands: [commandId("dw")],
};

describe("BossPanel", () => {
  it("stays worried while the easy gold band is still open", () => {
    // easy: gold <= floor(10 * 1.4) = 14, so 12 keys is still a gold pace
    render(<BossPanel exercise={exercise} keystrokes={12} difficulty="easy" />);
    expect(screen.getByText(/無駄のない打鍵/)).toBeTruthy();
    expect(screen.queryByText(/パーは守れなかった/)).toBeNull();
  });

  it("turns smug once the gold line is crossed at normal", () => {
    render(
      <BossPanel exercise={exercise} keystrokes={12} difficulty="normal" />,
    );
    expect(screen.getByText(/パーは守れなかった/)).toBeTruthy();
  });

  it("laughs only past the difficulty's silver line", () => {
    // easy: silver <= ceil(10 * 2) = 20 → 18 keys is still smug, not laughing
    render(<BossPanel exercise={exercise} keystrokes={18} difficulty="easy" />);
    expect(screen.getByText(/まだ銀はくれてやる/)).toBeTruthy();
    expect(screen.queryByText(/手数が多いぞ/)).toBeNull();
  });
});
