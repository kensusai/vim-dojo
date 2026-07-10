# CI — vim-dojo

最終更新: 2026-07-11

## CI 基盤の選定と理由

**GitHub Actions**。リポジトリのホスト(GitHub)に合わせる原則どおり。デプロイ先(GitHub Pages)・通知スケジューラ(ADR-0004 の cron)と同じ基盤に揃い、管理対象が増えない。`docs/tech-stack.md` にも記録済み。

## パイプライン構成

ワークフロー: `.github/workflows/ci.yml`(1ジョブ `check`)。

| 順序 | ステップ   | コマンド               | 落ちる条件                                       |
| ---- | ---------- | ---------------------- | ------------------------------------------------ |
| 1    | lint       | `npm run lint`         | ESLint エラー(core 純粋性違反 = ADR-0005 を含む) |
| 2    | format     | `npm run format:check` | Prettier 未適用のファイルがある                  |
| 3    | 型チェック | `npm run typecheck`    | `tsc --noEmit`(strict)のエラー                   |
| 4    | テスト     | `npm test`             | Vitest の失敗                                    |
| 5    | ビルド     | `npm run build`        | 型エラーまたは Vite ビルド失敗                   |

- **トリガー**: `main` への push とすべての pull request。タグトリガーは未使用(デプロイはインフラ構築フェーズで追加)。
- **原則**: CI のコマンドはローカルと完全に同一(`npm run check` = 上記1〜5の連結)。CI 専用の隠しロジックを作らない。
- **concurrency**: 同一ブランチ/PR の古い実行は新しい push でキャンセル(無料枠の節約)。

## 実行環境

- ランナー: `ubuntu-latest`。
- Node.js: `.node-version`(リポジトリルート)を唯一の正とし、`actions/setup-node` が同ファイルを読む。ローカルは mise が同ファイルを解決する。マトリクスは組まない(実行環境はブラウザであり、Node はビルドツールの動作要件でしかないため単一バージョンで十分)。

## キャッシュ戦略

- `actions/setup-node` の `cache: npm`(npm キャッシュを `package-lock.json` のハッシュをキーに保存・復元)。
- 無効化条件: `package-lock.json` の変更で自動的にキーが変わる。手動無効化が必要になったら Actions の Caches 画面から削除。

## シークレット管理

- **この CI パイプラインはシークレットを一切使わない**(`permissions: contents: read` のみ)。
- 将来必要になるのは ntfy トピック名(ADR-0004 の通知ワークフロー)のみ。その際は GitHub Secrets に置き、ワークフローファイル・ログに平文を書かない(ntfy トピック名は事実上の認証情報として扱う)。
- リポジトリに `.env`・認証情報をコミットしない(CLAUDE.md 禁止事項)。アプリ自体が外部通信ゼロ(ADR-0001)のため、アプリ用シークレットは存在しない。

## ブランチ保護

リポジトリを GitHub に作成したら `main` に設定する(個人開発でも「壊れた main」を防ぐ価値がある):

- 必須ステータスチェック: `check`(この CI ジョブ)
- 直 push は許可(1人開発のため PR 必須にはしない。エージェントの変更をレビューしたくなったら PR 必須に切り替える)

## デプロイトリガー(CD への接続点)

- 現時点では CI のみ。デプロイ(GitHub Pages)はインフラ構築フェーズで `main` push → Pages デプロイのワークフローを追加する。
- 通知 cron(ADR-0004)も同フェーズで別ワークフローとして追加する。CI とは分離する(役割が違うものを1ファイルに混ぜない)。

## 失敗時の運用

- 落ちたら直すまでマージ/次の作業に進まない(チェックを通すためのテスト・lint 無効化は禁止事項)。
- フレーキーテスト: 発見したら即座に `it.skip` + Issue 化ではなく、その場で原因(時刻・乱数への暗黙依存が典型)を直す。core は Clock / RandomSource ポート経由のため、原理的にフレーキーの主因が入り込まない設計。
- 再実行: インフラ起因(ランナー障害・npm レジストリ不調)が明らかな場合のみ Actions の Re-run で対応。

## ローカルでの実行

```sh
npm run check   # CI と同じ全チェック(lint → format → 型 → テスト → ビルド)
npm run format  # Prettier 一括適用(format:check が落ちたとき)
```

新しいチェックを CI に足すときは、まずローカルの `check` スクリプトに入れて通ることを確認してから ci.yml に追加する。
