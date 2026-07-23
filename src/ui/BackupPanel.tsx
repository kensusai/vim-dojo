/**
 * GitHub Gist backup settings (ADR-0008). Lets the owner paste a gist-scoped
 * token so progress survives the browser purging IndexedDB. Opt-in; the token
 * lives only in localStorage on this machine.
 */
import { useState } from "react";
import {
  loadBackupConfig,
  pullBackup,
  pushBackup,
  saveBackupConfig,
} from "../backup/gistBackup";
import { useAppStore } from "./storeContext";

export function BackupPanel() {
  const store = useAppStore((s) => s.store);
  const [config, setConfig] = useState(() => loadBackupConfig());
  const [tokenInput, setTokenInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enable = () => {
    const token = tokenInput.trim();
    if (!token) return;
    const next = { token, gistId: null, lastBackupAt: null };
    saveBackupConfig(next);
    setConfig(next);
    setTokenInput("");
    setStatus("有効にしました。「今すぐバックアップ」で初回保存を。");
  };

  const disable = () => {
    saveBackupConfig(null);
    setConfig(null);
    setStatus("バックアップを無効にしました(gist 自体は GitHub に残ります)。");
  };

  const backupNow = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const json = await store.exportJson();
      const updated = await pushBackup(json);
      setConfig(updated);
      setStatus("バックアップしました ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const restoreNow = async () => {
    if (
      !window.confirm(
        "クラウドのバックアップで現在の進捗を上書きします。よろしいですか?",
      )
    )
      return;
    setBusy(true);
    setStatus(null);
    try {
      const json = await pullBackup();
      if (!json) {
        setStatus("まだバックアップがありません。");
        return;
      }
      await store.importJson(json);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      // Every early return above must release busy, or all three buttons
      // stay disabled until a remount. (The reload path doesn't care.)
      setBusy(false);
    }
  };

  return (
    <div className="pixel-panel p-5">
      <div className="mb-2 font-mono text-sm font-black tracking-widest">
        ☁️ クラウドバックアップ(GitHub)
      </div>
      <p className="mb-3 text-xs text-cream-faint">
        ブラウザはしばらく開かないと保存データを消すことがある。GitHub の
        private gist に進捗を自動保存しておけば、消えても復元できる。
      </p>

      {config ? (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs text-matcha">
            有効
            {config.gistId ? " · gist 作成済み" : " · 未バックアップ"}
            {config.lastBackupAt &&
              ` · 最終 ${new Date(config.lastBackupAt).toLocaleString("ja-JP")}`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={backupNow}
              className="btn-chunky border-2 border-b-4 border-[#567f2b] bg-matcha px-4 py-1.5 font-mono text-xs font-black text-[#17260a]"
            >
              今すぐバックアップ
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={restoreNow}
              className="btn-chunky border-2 border-b-4 border-ink-bold bg-raised px-4 py-1.5 font-mono text-xs font-extrabold text-cream-dim"
            >
              復元
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={disable}
              className="btn-chunky border-2 border-b-4 border-ink-bold bg-raised px-4 py-1.5 font-mono text-xs font-extrabold text-shu"
            >
              無効化
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="GitHub トークン(gist 権限のみ)"
            className="border-2 border-ink bg-editor px-3 py-2 font-mono text-sm text-cream"
          />
          <button
            type="button"
            onClick={enable}
            className="btn-chunky border-2 border-b-4 border-shu-dark bg-shu px-4 py-2 font-mono text-xs font-black text-[#fff6ec]"
          >
            有効にする
          </button>
          <p className="text-[0.625rem] text-cream-faint">
            github.com → Settings → Developer settings → Personal access tokens
            で <b>gist 権限だけ</b>のトークンを作って貼る。トークンはこの端末の
            ブラウザにのみ保存され、GitHub 以外には送られない。
          </p>
        </div>
      )}

      {status && <p className="mt-3 font-mono text-xs text-gold">{status}</p>}
    </div>
  );
}
