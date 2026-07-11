import { describe, expect, it } from "vitest";
import { commandId, exerciseId } from "../ids";
import type { Clock, VimEngine, VimMode } from "../ports";
import type { Attempt } from "./attempt";
import type { Exercise } from "./exercise";
import { startPracticeSession } from "./session";

/** In-memory VimEngine: tests drive keys and buffer states explicitly. */
class FakeVimEngine implements VimEngine {
  private buffer = "";
  private keyListeners = new Set<(key: string) => void>();
  private bufferListeners = new Set<(buffer: string) => void>();

  reset(initialBuffer: string) {
    this.buffer = initialBuffer;
  }
  currentBuffer() {
    return this.buffer;
  }
  currentMode(): VimMode {
    return "normal";
  }
  onKeystroke(listener: (key: string) => void) {
    this.keyListeners.add(listener);
    return () => this.keyListeners.delete(listener);
  }
  onBufferChange(listener: (buffer: string) => void) {
    this.bufferListeners.add(listener);
    return () => this.bufferListeners.delete(listener);
  }

  press(key: string) {
    for (const l of this.keyListeners) l(key);
  }
  edit(buffer: string) {
    this.buffer = buffer;
    for (const l of this.bufferListeners) l(buffer);
  }
}

/** Clock that returns queued instants, then keeps returning the last one. */
const fakeClock = (...isoTimes: string[]): Clock => {
  const queue = isoTimes.map((t) => new Date(t));
  let last = queue[0] ?? new Date("2026-07-11T12:00:00");
  return {
    now() {
      const next = queue.shift();
      if (next) last = next;
      return last;
    },
  };
};

const exercise: Exercise = {
  id: exerciseId("ex-rename"),
  title: "foo を bar に変えよ",
  initialBuffer: "foo",
  targetBuffer: "bar",
  par: 6,
  practicedCommands: [commandId("ciw")],
};

const start = (engine: FakeVimEngine, clock: Clock = fakeClock()) =>
  startPracticeSession({ exercise, source: "drill", engine, clock });

describe("startPracticeSession", () => {
  it("resets the engine to the initial buffer", () => {
    const engine = new FakeVimEngine();
    engine.edit("stale content from previous exercise");
    start(engine);
    expect(engine.currentBuffer()).toBe("foo");
  });

  it("rejects exercises that start already solved (generator bug guard)", () => {
    const engine = new FakeVimEngine();
    expect(() =>
      startPracticeSession({
        exercise: { ...exercise, targetBuffer: exercise.initialBuffer },
        source: "drill",
        engine,
        clock: fakeClock(),
      }),
    ).toThrow(RangeError);
  });

  it("clears at the exact moment the buffer matches the target (R1)", () => {
    const engine = new FakeVimEngine();
    const session = start(engine);
    engine.press("x");
    engine.edit("fo"); // intermediate state — not the target
    expect(session.state()).toBe("playing");
    engine.press("x");
    engine.edit("bar");
    expect(session.state()).toBe("cleared");
  });

  it("counts every key from first input until the clear, then stops (R2)", () => {
    const engine = new FakeVimEngine();
    const session = start(engine);
    engine.press("c");
    engine.press("i");
    engine.press("w");
    engine.press("<Esc>"); // mode keys count too
    engine.edit("bar");
    engine.press("j"); // after the clear — must not count
    expect(session.keystrokes()).toBe(4);
  });

  it("delivers a cleared attempt with the medal wired to R3", () => {
    const engine = new FakeVimEngine();
    const session = start(engine);
    let attempt;
    session.onCleared((a) => (attempt = a));
    for (const k of ["c", "i", "w", "b", "a", "r"]) engine.press(k); // 6 = par
    engine.edit("bar");
    expect(attempt).toMatchObject({
      exerciseId: exercise.id,
      source: "drill",
      result: "cleared",
      keystrokes: 6,
      medal: "gold",
      practicedCommands: [commandId("ciw")],
    });
  });

  it("records playedAt as the completion instant (R12) and the duration", () => {
    const engine = new FakeVimEngine();
    // 1st now(): first keystroke, 2nd now(): clear
    const clock = fakeClock("2026-07-11T23:59:30", "2026-07-12T00:00:10");
    const session = startPracticeSession({
      exercise,
      source: "daily",
      engine,
      clock,
    });
    let attempt: Attempt | undefined;
    session.onCleared((a) => (attempt = a));
    engine.press("c");
    engine.edit("bar");
    // Completed past midnight → the attempt belongs to the next day (R12).
    expect(attempt?.playedAt.toISOString()).toBe(
      new Date("2026-07-12T00:00:10").toISOString(),
    );
    expect(attempt?.durationMs).toBe(40_000);
  });

  it("abandon() yields a medal-less attempt and freezes the session", () => {
    const engine = new FakeVimEngine();
    const session = start(engine);
    engine.press("x");
    const attempt = session.abandon();
    expect(attempt).toMatchObject({
      result: "abandoned",
      medal: null,
      keystrokes: 1,
    });
    expect(session.state()).toBe("abandoned");
    engine.edit("bar"); // matching after abandon must not clear
    expect(session.state()).toBe("abandoned");
    expect(() => session.abandon()).toThrow(Error);
  });

  it("fires onCleared once, and unsubscribe works", () => {
    const engine = new FakeVimEngine();
    const session = start(engine);
    let calls = 0;
    const unsubscribe = session.onCleared(() => (calls += 1));
    unsubscribe();
    engine.press("x");
    engine.edit("bar");
    expect(calls).toBe(0);
    expect(session.state()).toBe("cleared");
  });
});
