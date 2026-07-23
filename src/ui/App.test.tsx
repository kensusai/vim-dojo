// @vitest-environment jsdom
/**
 * App boot recovery (ADR-0008): the cloud snapshot must only replace local
 * data when the local store is REALLY empty. A profile with no XP and no
 * lesson clears but with recorded attempts (an abandoned-only history) is
 * not empty — restoring over it would erase newer history with an older
 * backup.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commandId, exerciseId } from "../core/ids";
import type { Attempt } from "../core/practice/attempt";
import type { ProgressStore } from "../core/ports";
import { initialProfile } from "../core/profile";
import { App } from "./App";

vi.mock("../backup/gistBackup", () => ({
  isBackupConfigured: () => true,
  pullBackup: () => Promise.resolve('{"app":"vim-dojo"}'),
  pushBackup: () => Promise.resolve(),
  loadBackupConfig: () => null,
  saveBackupConfig: () => {},
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const abandonedAttempt: Attempt = {
  exerciseId: exerciseId("s1-l1-e1"),
  source: "lesson",
  playedAt: new Date("2026-07-21T12:00:00"),
  result: "abandoned",
  keystrokes: 4,
  medal: null,
  practicedCommands: [commandId("x")],
  durationMs: 3000,
};

function fakeStore(attempts: Attempt[]) {
  const importJson = vi.fn<(json: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const store: ProgressStore = {
    loadProfile: () => Promise.resolve(initialProfile),
    saveProfile: () => Promise.resolve(),
    appendAttempt: () => Promise.resolve(),
    loadAttempts: () => Promise.resolve(attempts),
    loadDailyChallenge: () => Promise.resolve(null),
    saveDailyChallenge: () => Promise.resolve(),
    exportJson: () => Promise.resolve("{}"),
    importJson,
  };
  return { store, importJson };
}

const clock = { now: () => new Date("2026-07-22T12:00:00") };

describe("App boot recovery", () => {
  it("does not overwrite an abandoned-only local history with the backup", async () => {
    const { store, importJson } = fakeStore([abandonedAttempt]);
    render(<App openStore={() => Promise.resolve(store)} clock={clock} />);
    await screen.findByText(/NEXT LESSON/);
    expect(importJson).not.toHaveBeenCalled();
  });

  it("still restores when the store is truly empty", async () => {
    const { store, importJson } = fakeStore([]);
    render(<App openStore={() => Promise.resolve(store)} clock={clock} />);
    await screen.findByText(/NEXT LESSON/);
    expect(importJson).toHaveBeenCalledTimes(1);
  });
});
