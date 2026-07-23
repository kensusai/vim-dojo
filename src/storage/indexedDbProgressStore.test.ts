/**
 * Integration tests for the IndexedDB ProgressStore on fake-indexeddb
 * (PLAN M4: 保存→リロード→復元). Each test opens its own database name so
 * cases stay independent.
 */
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { commandId, exerciseId, lessonId } from "../core/ids";
import { localDate } from "../core/localDate";
import type { Attempt } from "../core/practice/attempt";
import { initialProfile, type Profile } from "../core/profile";
import { openProgressStore } from "./indexedDbProgressStore";
import { DB_VERSION, runMigrations } from "./migrations";

let dbCounter = 0;
const freshStore = () =>
  openProgressStore({ databaseName: `vim-dojo-test-${++dbCounter}` });

const sampleProfile: Profile = {
  xp: 230,
  streak: {
    current: 12,
    longest: 15,
    lastActiveDate: localDate("2026-07-11"),
    freezes: 1,
  },
  lessonClears: {
    [lessonId("s1-hjkl")]: { clearedAt: new Date("2026-07-01T09:00:00Z") },
  },
  exerciseBests: {
    [exerciseId("ex-1")]: { medal: "gold", keystrokes: 9 },
  },
  achievements: {},
  lastExportAt: null,
};

const sampleAttempt: Attempt = {
  exerciseId: exerciseId("ex-1"),
  source: "drill",
  playedAt: new Date("2026-07-11T12:34:56Z"),
  result: "cleared",
  keystrokes: 9,
  medal: "gold",
  practicedCommands: [commandId("diw")],
  durationMs: 8_000,
};

describe("IndexedDbProgressStore", () => {
  it("returns the initial profile on first boot", async () => {
    const store = await freshStore();
    expect(await store.loadProfile()).toEqual(initialProfile);
  });

  it("round-trips the profile with Dates and branded keys intact", async () => {
    const store = await freshStore();
    await store.saveProfile(sampleProfile);
    expect(await store.loadProfile()).toEqual(sampleProfile);
  });

  it("appends and reloads attempts in order", async () => {
    const store = await freshStore();
    await store.appendAttempt(sampleAttempt);
    await store.appendAttempt({
      ...sampleAttempt,
      result: "abandoned",
      medal: null,
    });
    const attempts = await store.loadAttempts();
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toEqual(sampleAttempt);
    expect(attempts[1]?.result).toBe("abandoned");
  });

  it("stores one daily challenge per date (R13) and round-trips it", async () => {
    const store = await freshStore();
    const record = {
      date: localDate("2026-07-11"),
      seed: "2026-07-11",
      exercise: {
        id: exerciseId("daily-2026-07-11"),
        title: "重複した行を一行にまとめよ",
        initialBuffer: "a\na\nb",
        targetBuffer: "a\nb",
        par: 4,
        practicedCommands: [commandId("dd")],
      },
      xpGranted: false,
    };
    expect(await store.loadDailyChallenge(record.date)).toBeNull();
    await store.saveDailyChallenge(record);
    await store.saveDailyChallenge({ ...record, xpGranted: true }); // same-date upsert
    expect(await store.loadDailyChallenge(record.date)).toEqual({
      ...record,
      xpGranted: true,
    });
  });

  it("rejects corrupt stored data loudly at the boundary", async () => {
    const store = await freshStore();
    await store.saveProfile({ ...sampleProfile, xp: 100 });
    // Corrupt the record behind the schema's back.
    const raw = await import("idb");
    const db = await raw.openDB(`vim-dojo-test-${dbCounter}`, 1);
    await db.put("profile", { key: "me", xp: "not-a-number" });
    db.close();
    await expect(store.loadProfile()).rejects.toThrow();
  });

  it("export → import restores everything into an empty store (UC6)", async () => {
    const source = await freshStore();
    await source.saveProfile(sampleProfile);
    await source.appendAttempt(sampleAttempt);
    const snapshot = await source.exportJson();

    const target = await freshStore();
    await target.saveProfile({ ...initialProfile, xp: 999 }); // pre-existing data
    await target.importJson(snapshot);

    expect(await target.loadProfile()).toEqual(sampleProfile); // full replace
    expect(await target.loadAttempts()).toEqual([sampleAttempt]);
  });

  it("refuses an invalid import without touching stored data (UC6)", async () => {
    const store = await freshStore();
    await store.saveProfile(sampleProfile);
    await expect(store.importJson('{"app":"other"}')).rejects.toThrow();
    await expect(store.importJson("not json at all")).rejects.toThrow();
    expect(await store.loadProfile()).toEqual(sampleProfile); // untouched
  });

  it("rejects a snapshot from an unknown schemaVersion", async () => {
    const source = await freshStore();
    await source.saveProfile(sampleProfile);
    const snapshot: Record<string, unknown> = JSON.parse(
      await source.exportJson(),
    ) as Record<string, unknown>;
    snapshot.schemaVersion = 2;
    const target = await freshStore();
    await expect(target.importJson(JSON.stringify(snapshot))).rejects.toThrow(
      /schemaVersion/,
    );
  });

  it("refuses to export corrupt stored data (backup must not launder it)", async () => {
    const store = await freshStore();
    await store.saveProfile(sampleProfile);
    // Corrupt the record behind the schema's back — the export must fail NOW,
    // not years later when the only copy left is the corrupt backup.
    const raw = await import("idb");
    const db = await raw.openDB(`vim-dojo-test-${dbCounter}`, 1);
    await db.put("profile", { key: "me", xp: "not-a-number" });
    db.close();
    await expect(store.exportJson()).rejects.toThrow();
  });
});

it("throws on a version gap with no migration (future-version guard)", () => {
  // db/tx are never touched: the guard throws before the first missing step
  // would run, so opening a database is not needed to pin this behavior.
  const noDb = null as unknown as Parameters<typeof runMigrations>[0];
  const noTx = null as unknown as Parameters<typeof runMigrations>[3];
  expect(() => runMigrations(noDb, DB_VERSION, DB_VERSION + 1, noTx)).toThrow(
    /missing migration/,
  );
});
