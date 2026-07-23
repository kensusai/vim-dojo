// @vitest-environment jsdom
/**
 * BackupPanel button-state wiring. gistBackup is mocked — what these tests
 * pin is that `busy` always returns to false, whatever path an action takes
 * (a stuck busy permanently disables all three buttons).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProgressStore } from "../core/ports";
import { initialProfile } from "../core/profile";
import { createAppStore } from "./store";
import { StoreProvider } from "./storeContext";
import { BackupPanel } from "./BackupPanel";

const gist = vi.hoisted(() => ({
  pullBackup: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("../backup/gistBackup", () => ({
  loadBackupConfig: () => ({
    token: "tok",
    gistId: null,
    lastBackupAt: null,
  }),
  saveBackupConfig: () => {},
  isBackupConfigured: () => true,
  pushBackup: () => Promise.resolve(),
  pullBackup: gist.pullBackup,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderPanel() {
  const progressStore = {
    loadProfile: () => Promise.resolve(initialProfile),
    saveProfile: () => Promise.resolve(),
    appendAttempt: () => Promise.resolve(),
    loadAttempts: () => Promise.resolve([]),
    loadDailyChallenge: () => Promise.resolve(null),
    saveDailyChallenge: () => Promise.resolve(),
    exportJson: () => Promise.resolve("{}"),
    importJson: () => Promise.resolve(),
  } satisfies ProgressStore;
  const clock = { now: () => new Date("2026-07-22T12:00:00") };
  const appStore = createAppStore(progressStore, clock, initialProfile);
  render(
    <StoreProvider store={appStore}>
      <BackupPanel />
    </StoreProvider>,
  );
}

describe("BackupPanel", () => {
  it("re-enables the buttons after 復元 finds no backup yet (busy regression)", async () => {
    gist.pullBackup.mockResolvedValue(null); // gist not created yet
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "復元" }));

    await screen.findByText("まだバックアップがありません。");
    await waitFor(() => {
      for (const name of ["今すぐバックアップ", "復元", "無効化"]) {
        expect(
          screen.getByRole("button", { name }),
          `button ${name} should be enabled again`,
        ).not.toHaveProperty("disabled", true);
      }
    });
  });
});
