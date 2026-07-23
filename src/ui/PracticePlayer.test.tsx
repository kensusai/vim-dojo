// @vitest-environment jsdom
/**
 * PracticePlayer session wiring. The engine is faked (the real CodeMirror
 * engine has its own tests): what these tests pin is the session lifecycle —
 * exactly one live session at a time, exactly one record per attempt.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commandId, exerciseId } from "../core/ids";
import type { Attempt } from "../core/practice/attempt";
import type { Exercise } from "../core/practice/exercise";
import type { ProgressStore } from "../core/ports";
import { initialProfile } from "../core/profile";
import { createAppStore } from "./store";
import { StoreProvider } from "./storeContext";
import { PracticePlayer } from "./PracticePlayer";

interface FakeVimEngine {
  view: unknown;
  reset(buffer: string): void;
  currentBuffer(): string;
  currentMode(): string;
  onKeystroke(listener: (key: string) => void): () => void;
  onBufferChange(listener: (buffer: string) => void): () => void;
  sendKey(key: string): void;
  typeText(text: string): void;
  sendEx(command: string): void;
  focus(): void;
  blur(): void;
  setEditable(editable: boolean): void;
  destroy(): void;
  /** Test hooks: simulate a pressed key / a buffer edit. */
  pressKey(key: string): void;
  changeBuffer(buffer: string): void;
  /** Test hook: last value passed to setEditable (null = never called). */
  lastEditable: boolean | null;
}

const hoisted = vi.hoisted(() => {
  const engines: FakeVimEngine[] = [];
  const makeEngine = (): FakeVimEngine => {
    const keyListeners = new Set<(key: string) => void>();
    const bufferListeners = new Set<(buffer: string) => void>();
    let buffer = "";
    return {
      view: null,
      lastEditable: null,
      reset(initial: string) {
        buffer = initial;
        this.lastEditable = true; // reset always unfreezes (engine contract)
      },
      currentBuffer: () => buffer,
      currentMode: () => "normal",
      onKeystroke(listener) {
        keyListeners.add(listener);
        return () => keyListeners.delete(listener);
      },
      onBufferChange(listener) {
        bufferListeners.add(listener);
        return () => bufferListeners.delete(listener);
      },
      sendKey() {},
      typeText() {},
      sendEx() {},
      focus() {},
      blur() {},
      setEditable(value: boolean) {
        this.lastEditable = value;
      },
      destroy() {
        keyListeners.clear();
        bufferListeners.clear();
      },
      pressKey(key) {
        for (const listener of [...keyListeners]) listener(key);
      },
      changeBuffer(next) {
        buffer = next;
        for (const listener of [...bufferListeners]) listener(next);
      },
    };
  };
  return { engines, makeEngine };
});

vi.mock("../vim/codeMirrorVimEngine", () => ({
  createVimEngine: () => {
    const engine = hoisted.makeEngine();
    hoisted.engines.push(engine);
    return engine;
  },
}));

vi.mock("./sound", () => ({
  isMuted: () => true,
  toggleMuted: () => true,
  playClear: () => {},
}));

afterEach(() => {
  cleanup();
  hoisted.engines.length = 0;
  localStorage.clear();
});

const exercise: Exercise = {
  id: exerciseId("t-ex"),
  title: "テスト",
  hint: "",
  initialBuffer: "abc",
  targetBuffer: "ac",
  par: 3,
  practicedCommands: [commandId("x")],
};

function renderPlayer() {
  const appended: Attempt[] = [];
  const progressStore: ProgressStore = {
    loadProfile: () => Promise.resolve(initialProfile),
    saveProfile: () => Promise.resolve(),
    appendAttempt: (attempt) => {
      appended.push(attempt);
      return Promise.resolve();
    },
    loadAttempts: () => Promise.resolve([]),
    loadDailyChallenge: () => Promise.resolve(null),
    saveDailyChallenge: () => Promise.resolve(),
    exportJson: () => Promise.resolve("{}"),
    importJson: () => Promise.resolve(),
  };
  const clock = { now: () => new Date("2026-07-22T12:00:00") };
  const appStore = createAppStore(progressStore, clock, initialProfile);
  const onAttemptFinished = vi.fn();
  render(
    <StoreProvider store={appStore}>
      <PracticePlayer
        exercises={[exercise]}
        source="drill"
        onAttemptFinished={onAttemptFinished}
        renderResult={() => <div>RESULT</div>}
      />
    </StoreProvider>,
  );
  const engine = hoisted.engines.at(-1);
  if (!engine) throw new Error("engine was not created");
  return { engine, onAttemptFinished, appended };
}

describe("PracticePlayer session lifecycle", () => {
  it("fires onAttemptFinished exactly once after a zero-key retry (leak regression)", () => {
    const { engine, onAttemptFinished } = renderPlayer();
    // Retry before pressing any key: the first session must be torn down,
    // not left listening alongside the new one.
    fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
    act(() => {
      engine.pressKey("x");
      engine.changeBuffer(exercise.targetBuffer);
    });
    expect(onAttemptFinished).toHaveBeenCalledTimes(1);
  });

  it("freezes the engine the moment the attempt is judged", () => {
    const { engine } = renderPlayer();
    expect(engine.lastEditable).toBe(true); // session start = playable
    act(() => {
      engine.pressKey("x");
      engine.changeBuffer(exercise.targetBuffer);
    });
    expect(engine.lastEditable).toBe(false); // judged = frozen behind dialog
  });

  it("records one abandoned attempt when retrying mid-attempt, none on a zero-key retry", () => {
    const { engine, onAttemptFinished, appended } = renderPlayer();
    act(() => {
      engine.pressKey("j");
    });
    fireEvent.click(screen.getByRole("button", { name: "やり直す" })); // 1 key → recorded
    fireEvent.click(screen.getByRole("button", { name: "やり直す" })); // 0 keys → discarded
    expect(appended).toHaveLength(1);
    expect(appended[0]?.result).toBe("abandoned");
    act(() => {
      engine.pressKey("x");
      engine.changeBuffer(exercise.targetBuffer);
    });
    expect(onAttemptFinished).toHaveBeenCalledTimes(1);
  });
});
