# 実装計画 — vim-dojo

> **ステータス: M1〜M8 完了(2026-07-11)。** アプリは https://kensusai.github.io/vim-dojo/ で稼働中。残タスクはステージ2〜4のコンテンツ拡充(継続的に追加)。

最終更新: 2026-07-11 / 前提: 設計ドキュメント一式(overview / domain / architecture / tech-stack / database)とデザインモック案C(`design/mockups/README.md`)は確定済み。

## 方針

- **リスクの高い順に潰す**: 最大の技術リスクは vim エンジンの再現度(ADR-0006)なので最初にスパイクする。
- **常に遊べる状態を保つ**: 各マイルストーンの完了条件は「動くもの+テスト+ドキュメント同期」。縦に薄く切る。
- 1マイルストーン = 1〜数コミット。`npm run check` グリーンを維持。

## マイルストーン

### M1: vim エンジンスパイク(最優先・リスク潰し)

- codemirror + @replit/codemirror-vim を導入し、`src/vim/` で `VimEngine` ポート(core/ports.ts)を実装
- ヘッドレステスト(Vim.handleKey 直接駆動)でステージ1〜2の必須コマンドの挙動を検証
- 成果物: `docs/vim-coverage.md`(コマンド×挙動×Neovim標準との差異のカバレッジ表)
- 完了条件: 基本移動・オペレータ+テキストオブジェクトがポート経由で動き、キーストローク計測とバッファ取得ができる

### M2: core/practice — お題と判定

- Exercise / Attempt 型、クリア判定(R1)、キーストローク計測ルール(R2)、メダル判定(R3 実装済み)、ベスト更新(R4)
- 完了条件: R1〜R4 のユニットテストが通る

### M3: core/progression — ストリークとXP

- アクティブ日判定(R8, R12)、ストリーク・フリーズ(R9〜R11)、XP・レベル(R16〜R17, P1〜P2)
- Clock ポートのフェイクで日付境界(23:59→0:01、タイムゾーン)をテスト
- 完了条件: R8〜R12, R16〜R17 のユニットテストが通る

### M4: storage — 永続化

- zod スキーマ(docs/database.md のとおり)、idb で ProgressStore 実装、エクスポート/インポート(UC6)
- 完了条件: 保存→リロード→復元の結合テスト(fake-indexeddb)が通る。ProgressStore を core/ports.ts に定義

### M5: 最初に遊べる画面 — ドリル縦切り

- UI シェル(HUD)+ 演習画面(EditorPane / BattleStrip / TargetPanel / KeyLog / IpponModal)を practice-c.html のとおり実装
- 手作りお題数問で「開く→解く→一本!!→保存」が通る
- Tailwind + トークン(案C の :root)導入。Motion はこのマイルストーンでは最小限
- 完了条件: `npm run dev` で実際に1問遊べて進捗が残る

### M6: カリキュラム — ステージ1+ホーム画面

- core/curriculum(Stage/Lesson/解放 R5〜R7)+ ステージ1のレッスンコンテンツ(基本移動 12本)
- ホーム画面(QuestStage / WorldMap / HudBar)を home-c.html のとおり実装
- 完了条件: レッスンを順にクリアして解放が進む

### M7: 出題生成と分析 — デイリーチャレンジ・弱点

- core/generation(シード決定性 R13〜R14、解放済み制約 R6)、デイリーチャレンジ(R15)
- core/analytics(弱点判定 P5)+ WantedPanel、腕前グラフ
- 完了条件: 日付シードで同じお題が再現し、ストリークが実際に回る

### M8: 仕上げ — 演出・配信・通知

- Motion による演出強化(一本!!・帯昇格・ストリーク)、実績(R18)
- GitHub Pages デプロイワークフロー + vite-plugin-pwa(インフラ構築フェーズ、docs/infrastructure.md)
- ntfy.sh 通知 cron(ADR-0004)+ 監視設計(docs/monitoring.md)
- 完了条件: 本番 URL で毎日遊べて、スマホにリマインドが届く

## 進め方のルール

- 各マイルストーン着手時に該当フェーズの SKILL.md(backend-development / frontend-development / infra-construction / monitoring-design)を確認し、成果物ドキュメント(docs/backend.md 等)を随時作る。
- 暫定判断(domain.md P1〜P9)は実装で確定したら本文ルールに昇格させる。
- 計画の変更はこのファイルを更新してから行う。
