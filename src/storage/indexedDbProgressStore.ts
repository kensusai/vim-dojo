/**
 * ProgressStore implementation on IndexedDB via idb (docs/database.md).
 * Every read is parsed with the zod schemas (schema.ts) before core sees it;
 * every write goes through the stored-shape converters. Attempts are
 * append-only by construction — no update/delete method exists.
 */
import { openDB, type IDBPDatabase } from "idb";
import type { LocalDate } from "../core/localDate";
import type { DailyChallengeRecord, ProgressStore } from "../core/ports";
import type { Attempt } from "../core/practice/attempt";
import { initialProfile, type Profile } from "../core/profile";
import { DB_NAME, DB_VERSION, runMigrations } from "./migrations";
import {
  AttemptSchema,
  DailyChallengeSchema,
  ExportSchema,
  fromCoreAttempt,
  fromCoreDailyChallenge,
  fromCoreProfile,
  ProfileSchema,
  SCHEMA_VERSION,
  toCoreAttempt,
  toCoreDailyChallenge,
  toCoreProfile,
} from "./schema";

export interface IndexedDbProgressStore extends ProgressStore {
  close(): void;
}

export async function openProgressStore(options?: {
  /** For tests: an alternative IndexedDB database name. */
  databaseName?: string;
}): Promise<IndexedDbProgressStore> {
  const db = await openDB(options?.databaseName ?? DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, newVersion, tx) {
      runMigrations(database, oldVersion, newVersion, tx);
    },
  });
  return new Store(db);
}

class Store implements IndexedDbProgressStore {
  constructor(private readonly db: IDBPDatabase) {}

  async loadProfile(): Promise<Profile> {
    const raw: unknown = await this.db.get("profile", "me");
    if (raw === undefined) return initialProfile; // first boot
    return toCoreProfile(ProfileSchema.parse(raw));
  }

  async saveProfile(profile: Profile): Promise<void> {
    await this.db.put("profile", fromCoreProfile(profile));
  }

  async appendAttempt(attempt: Attempt): Promise<void> {
    const stored = fromCoreAttempt(attempt);
    delete stored.id; // let autoIncrement assign the key
    await this.db.add("attempts", stored);
  }

  async loadAttempts(): Promise<Attempt[]> {
    const raw: unknown[] = await this.db.getAll("attempts");
    return raw.map((r) => toCoreAttempt(AttemptSchema.parse(r)));
  }

  async loadDailyChallenge(
    date: LocalDate,
  ): Promise<DailyChallengeRecord | null> {
    const raw: unknown = await this.db.get("dailyChallenges", date);
    if (raw === undefined) return null;
    return toCoreDailyChallenge(DailyChallengeSchema.parse(raw));
  }

  async saveDailyChallenge(record: DailyChallengeRecord): Promise<void> {
    await this.db.put("dailyChallenges", fromCoreDailyChallenge(record));
  }

  async exportJson(): Promise<string> {
    const [profile, attempts, dailyChallenges] = await Promise.all([
      this.db.get("profile", "me"),
      this.db.getAll("attempts"),
      this.db.getAll("dailyChallenges"),
    ]);
    return JSON.stringify(
      {
        app: "vim-dojo",
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        profile: profile ?? fromCoreProfile(initialProfile),
        attempts,
        dailyChallenges,
      },
      null,
      2,
    );
  }

  async importJson(json: string): Promise<void> {
    // Parse the whole snapshot BEFORE touching the database — an invalid
    // import must never leave half-replaced data (UC6: 全置換).
    const snapshot = ExportSchema.parse(JSON.parse(json));
    if (snapshot.schemaVersion !== SCHEMA_VERSION) {
      // Older snapshots will run through the same migration functions as the
      // database (docs/database.md). No older version exists yet.
      throw new Error(
        `unsupported schemaVersion ${snapshot.schemaVersion} (current: ${SCHEMA_VERSION})`,
      );
    }
    const tx = this.db.transaction(
      ["profile", "attempts", "dailyChallenges"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("profile").clear(),
      tx.objectStore("attempts").clear(),
      tx.objectStore("dailyChallenges").clear(),
    ]);
    await tx.objectStore("profile").put(snapshot.profile);
    for (const attempt of snapshot.attempts) {
      const record = { ...attempt };
      delete record.id;
      await tx.objectStore("attempts").add(record);
    }
    for (const daily of snapshot.dailyChallenges) {
      await tx.objectStore("dailyChallenges").put(daily);
    }
    await tx.done;
  }

  close(): void {
    this.db.close();
  }
}
