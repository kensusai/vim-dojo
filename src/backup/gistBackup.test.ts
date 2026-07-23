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

describe("pushBackup resilience", () => {
  it("fails loudly when the API response has no id (config must not corrupt)", async () => {
    saveBackupConfig({ token: "tok", gistId: null, lastBackupAt: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    await expect(pushBackup("{}")).rejects.toThrow();
    // A silently-undefined gistId would orphan the gist on the next push.
    expect(loadBackupConfig()?.gistId ?? null).toBeNull();
  });

  it("recreates the gist with POST when the stored one was deleted (PATCH 404)", async () => {
    saveBackupConfig({ token: "tok", gistId: "gone", lastBackupAt: null });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "fresh" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const updated = await pushBackup("{}");

    expect(updated.gistId).toBe("fresh");
    expect(loadBackupConfig()?.gistId).toBe("fresh");
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe("https://api.github.com/gists");
    expect(init.method).toBe("POST");
  });

  it("serializes concurrent pushes so only one gist is ever created", async () => {
    saveBackupConfig({ token: "tok", gistId: null, lastBackupAt: null });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "only-one" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Manual "今すぐバックアップ" racing the debounced auto-push.
    const [a, b] = await Promise.all([pushBackup("{}"), pushBackup("{}")]);

    expect(a.gistId).toBe("only-one");
    expect(b.gistId).toBe("only-one");
    const posts = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit).method === "POST",
    );
    expect(posts).toHaveLength(1); // the second push must PATCH, not POST
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

  it("fails loudly when the response is not gist-shaped", async () => {
    saveBackupConfig({ token: "tok", gistId: "g1", lastBackupAt: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => "nonsense" }),
    );
    await expect(pullBackup()).rejects.toThrow();
  });
});
