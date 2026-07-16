// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadBackupConfig,
  pullBackup,
  pushBackup,
  saveBackupConfig,
} from "./gistBackup";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => localStorage.clear());

describe("gist backup config", () => {
  it("round-trips config and ignores tokenless entries", () => {
    saveBackupConfig({ token: "t", gistId: null, lastBackupAt: null });
    expect(loadBackupConfig()?.token).toBe("t");
    saveBackupConfig(null);
    expect(loadBackupConfig()).toBeNull();
  });
});

describe("pushBackup", () => {
  it("creates a gist on first push and stores the returned id", async () => {
    saveBackupConfig({ token: "tok", gistId: null, lastBackupAt: null });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "gist123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const updated = await pushBackup('{"app":"vim-dojo"}');

    expect(updated.gistId).toBe("gist123");
    expect(loadBackupConfig()?.gistId).toBe("gist123");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/gists"); // POST to create
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("updates the existing gist with PATCH on later pushes", async () => {
    saveBackupConfig({ token: "tok", gistId: "g1", lastBackupAt: null });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "g1" }) });
    vi.stubGlobal("fetch", fetchMock);

    await pushBackup("{}");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/gists/g1");
    expect(init.method).toBe("PATCH");
  });

  it("surfaces a readable error on a bad token", async () => {
    saveBackupConfig({ token: "bad", gistId: null, lastBackupAt: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    await expect(pushBackup("{}")).rejects.toThrow(/トークン/);
  });
});

describe("pullBackup", () => {
  it("returns the stored file content", async () => {
    saveBackupConfig({ token: "tok", gistId: "g1", lastBackupAt: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: { "vim-dojo-progress.json": { content: '{"restored":true}' } },
        }),
      }),
    );
    expect(await pullBackup()).toBe('{"restored":true}');
  });

  it("returns null when no gist is configured yet", async () => {
    saveBackupConfig({ token: "tok", gistId: null, lastBackupAt: null });
    expect(await pullBackup()).toBeNull();
  });
});
