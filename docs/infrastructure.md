# インフラ構築 — vim-dojo

最終更新: 2026-07-11(M8)

バックエンドレス SPA(ADR-0001)のため、インフラは「静的配信 + 通知 cron」の2点だけ。IaC に相当するものはすべて `.github/workflows/` の YAML で、リポジトリと同じ場所で管理される。

## 構成

| 要素                 | 実体                                                     | 定義                           |
| -------------------- | -------------------------------------------------------- | ------------------------------ |
| 静的ホスティング     | GitHub Pages(`https://kensusai.github.io/vim-dojo/`)     | `.github/workflows/deploy.yml` |
| CDN/TLS              | GitHub Pages 付属(https 強制)                            | —                              |
| オフラインキャッシュ | Service Worker(vite-plugin-pwa, precache 全アセット)     | `vite.config.ts`               |
| 通知スケジューラ     | GitHub Actions cron(毎日 11:00 UTC = 20:00 JST)→ ntfy.sh | `.github/workflows/notify.yml` |

## デプロイ

- `main` への push ごとに Deploy ワークフローがビルド(`BASE_PATH=/vim-dojo/`)→ Pages へ公開。手動再デプロイは workflow_dispatch。
- Pages は `build_type=workflow`(ブランチ配信ではなくアーティファクト配信)。
- ロールバック: 過去のコミットを revert して push(デプロイは常に main の内容)。

## 通知(ADR-0004)

- ntfy.sh のトピック名は事実上の認証情報として **GitHub Secret `NTFY_TOPIC`** に置く。ワークフローは Secret 未設定なら何もせず成功する(セットアップ前でも壊れない)。
- 文言は固定(進捗データを含めない — domain.md 禁止事項)。
- 受信側: スマホに ntfy アプリを入れ、同じトピック名を購読する。

## セットアップ手順(新しい環境で再現する場合)

```sh
gh api -X POST repos/<owner>/vim-dojo/pages -f build_type=workflow  # Pages 有効化
gh secret set NTFY_TOPIC --body "vim-dojo-<ランダム文字列>"          # 通知トピック
# スマホの ntfy アプリで同じトピックを購読
```

## 費用

すべて無料枠(GitHub Free の公開リポジトリ: Pages・Actions 無制限/ntfy.sh 公開トピック)。
