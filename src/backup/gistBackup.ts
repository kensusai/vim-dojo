/**
 * Optional progress backup to a private GitHub Gist (ADR-0008). The app stays
 * backendless (ADR-0001): this talks straight to the GitHub API from the
 * browser. It exists because browsers (Safari/iOS ITP especially) purge
 * IndexedDB after ~7 days of no visits, silently resetting progress.
 *
 * The token is a GitHub PAT with ONLY the `gist` scope, stored in
 * localStorage on the owner's own machine — never committed, never sent
 * anywhere but api.github.com. Single-user, opt-in.
 */
import { z } from "zod";

const CONFIG_KEY = "vim-dojo-backup";
const GIST_FILENAME = "vim-dojo-progress.json";
const API = "https://api.github.com/gists";

// Parse, don't cast: an id-less "success" response would otherwise store
// gistId: undefined and silently orphan the existing backup on the next push.
const GistIdResponse = z.object({ id: z.string() });
const GistFilesResponse = z.object({
  files: z
    .record(z.string(), z.object({ content: z.string().optional() }).optional())
    .optional(),
});

class GitHubApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface BackupConfig {
  token: string;
  /** null until the first push creates the gist. */
  gistId: string | null;
  lastBackupAt: string | null;
}

export function loadBackupConfig(): BackupConfig | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BackupConfig>;
    if (typeof parsed.token !== "string" || parsed.token.length === 0)
      return null;
    return {
      token: parsed.token,
      gistId: typeof parsed.gistId === "string" ? parsed.gistId : null,
      lastBackupAt:
        typeof parsed.lastBackupAt === "string" ? parsed.lastBackupAt : null,
    };
  } catch {
    return null;
  }
}

export function saveBackupConfig(config: BackupConfig | null): void {
  if (typeof localStorage === "undefined") return;
  if (config === null) localStorage.removeItem(CONFIG_KEY);
  else localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export const isBackupConfigured = (): boolean => loadBackupConfig() !== null;

async function githubJson(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    // 401 = bad token, 404 = gist gone/no access — surface a readable message.
    throw new GitHubApiError(
      res.status,
      res.status === 401
        ? "GitHub トークンが無効です(gist 権限を確認)"
        : `GitHub API エラー (${res.status})`,
    );
  }
  return res.json();
}

// Pushes run strictly one after another: two in-flight pushes before the
// first gist exists would both POST and create duplicate gists (the manual
// button racing the debounced auto-push).
let pushChain: Promise<unknown> = Promise.resolve();

/**
 * Push the export JSON to the gist (creating it on first call). Concurrent
 * calls are serialized. Returns the updated config (with gistId + timestamp)
 * so callers can persist it.
 * @throws Error on network/auth failure.
 */
export function pushBackup(json: string): Promise<BackupConfig> {
  const run = pushChain.then(
    () => doPush(json),
    () => doPush(json), // a failed predecessor must not fail this push
  );
  pushChain = run.catch(() => undefined);
  return run;
}

async function doPush(json: string): Promise<BackupConfig> {
  const config = loadBackupConfig();
  if (!config) throw new Error("バックアップが設定されていません");
  const body = JSON.stringify({
    description: "vim-dojo progress backup",
    public: false,
    files: { [GIST_FILENAME]: { content: json } },
  });
  let data: unknown;
  if (config.gistId) {
    try {
      data = await githubJson(`${API}/${config.gistId}`, config.token, {
        method: "PATCH",
        body,
      });
    } catch (error) {
      // 404 = the gist was deleted by hand. Recreate instead of failing
      // every auto-push forever (the backup would silently stop otherwise).
      if (!(error instanceof GitHubApiError && error.status === 404)) {
        throw error;
      }
      data = await githubJson(API, config.token, { method: "POST", body });
    }
  } else {
    data = await githubJson(API, config.token, { method: "POST", body });
  }
  const updated: BackupConfig = {
    ...config,
    gistId: GistIdResponse.parse(data).id,
    lastBackupAt: new Date().toISOString(),
  };
  saveBackupConfig(updated);
  return updated;
}

/** Fetch the backed-up export JSON, or null if none exists. @throws on error. */
export async function pullBackup(): Promise<string | null> {
  const config = loadBackupConfig();
  if (!config?.gistId) return null;
  const data = GistFilesResponse.parse(
    await githubJson(`${API}/${config.gistId}`, config.token),
  );
  return data.files?.[GIST_FILENAME]?.content ?? null;
}
