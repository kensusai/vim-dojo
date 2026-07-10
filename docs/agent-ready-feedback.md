# agent-ready フィードバック

## 2026-07-11 | bug | agent-ready check(コマンド検出)
- 状況: CLAUDE.md の開発コマンド欄に `npm run typecheck` 等を記載済みでも「not documented」と報告され続ける(AGENTS.md の `npm run test` / `npx vitest run <path>` も同様)。ドキュメントの実態と check 結果が一致しない。
- 提案: コマンド検出を特定の見出し・書式への依存ではなく、ファイル全文からのコマンド文字列マッチにする(または期待する書式をエラーメッセージに明示する)。
- ステータス: 未回収

## 2026-07-11 | gap | skills/architecture-design

- 状況: クリーンアーキテクチャプリセットが4層ディレクトリの定義を必須としているが、個人開発の SPA ではオーナーから「やりづらい・シンプルにしたい」と明確な差し戻しがあり、ADR で簡易構成(core/shell)に置換した。
- 提案: クリーンアーキテクチャプリセットに軽量適用形(例: functional core / imperative shell の2区分)を選択肢として用意し、プロジェクト規模で選べるようにする。
- ステータス: 未回収
