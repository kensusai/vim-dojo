# vim-dojo

vim が苦手な人が、楽しく・飽きずに・継続的に vim 操作を鍛えられるブラウザゲーム。

- **レッスン**: 新しい vim コマンドを解説+ブラウザ内演習で学ぶ(クリアでコマンド解放)
- **ドリル**: 解放済みコマンドのお題を反復。キーストローク数でスコアリング
- **デイリーチャレンジ**: 毎日1問の日替わりお題とストリークで習慣化
- **弱点分析**: 苦手コマンドを検出してドリルに再出題

**プレイはこちら → https://kensusai.github.io/vim-dojo/** (進捗はブラウザ内に保存されます)

まず個人専用・ブラウザローカル完結(バックエンド不要)で開発中。要件の詳細は [docs/project-overview.md](docs/project-overview.md) を参照。

<!-- agent-ready:begin -->

## AIエージェント開発

このリポジトリは **agent-ready** 対応です。AIコーディングエージェント向けの設定と手順書は [agent-ready](https://github.com/agent-ready/agent-ready) によって生成されています。

- `CLAUDE.md` — Claude Code 向けプロジェクトガイド
- `AGENTS.md` — Codex など `AGENTS.md` 対応エージェント向けのルールとワークフロー
- `.claude/commands/` — Claude Code スラッシュコマンド(`/review`, `/fix-bug`, `/add-feature`, `/test` ほか)
- `skills/` — 全エージェント共通のタスク手順書
- `docs/ai-workflow.md` — このリポジトリでのAIエージェントの使い方

適用中の開発プリセット: **クリーンアーキテクチャ, ドキュメント重視, パフォーマンス重視, 継続的リファクタリング, 型安全重視**

開発フェーズ別ワークフロー: **プロジェクト概要, ドメイン理解, アーキテクチャ設計, 技術選定, DB設計, CI構築, バックエンド開発, フロントエンド開発, インフラ構築, 監視設計**

スタックが変わったら `npx agent-ready sync` で再生成、`npx agent-ready check` で乖離チェックができます(選択内容は `agent-ready.config.json` に保存されています)。
<!-- agent-ready:end -->
