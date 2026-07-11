/**
 * IndexedDB schema migrations (docs/database.md migration ルール).
 * One entry per version; openDB applies every entry in (oldVersion, newVersion]
 * so any old database reaches the current shape. Never edit a shipped entry —
 * add a new version instead. IndexedDB cannot downgrade: destructive changes
 * must trigger an export prompt before upgrading (none exist yet).
 */
import type { IDBPDatabase, IDBPTransaction } from "idb";

export const DB_NAME = "vim-dojo";
export const DB_VERSION = 1;

type Migration = (
  db: IDBPDatabase,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
) => void;

export const MIGRATIONS: Record<number, Migration> = {
  // v1: initial stores (docs/database.md エンティティ一覧 / インデックス)
  1: (db) => {
    db.createObjectStore("profile", { keyPath: "key" });
    const attempts = db.createObjectStore("attempts", {
      keyPath: "id",
      autoIncrement: true,
    });
    attempts.createIndex("playedAt", "playedAt");
    attempts.createIndex("exerciseId", "exerciseId");
    attempts.createIndex("usedCommands", "usedCommands", { multiEntry: true });
    db.createObjectStore("dailyChallenges", { keyPath: "date" });
  },
};

export function runMigrations(
  db: IDBPDatabase,
  oldVersion: number,
  newVersion: number | null,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
): void {
  for (let v = oldVersion + 1; v <= (newVersion ?? DB_VERSION); v++) {
    const migration = MIGRATIONS[v];
    if (!migration) throw new Error(`missing migration for version ${v}`);
    migration(db, tx);
  }
}
