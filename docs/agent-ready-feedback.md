# agent-ready フィードバック

## 2026-07-11 | gap | agent-ready check(README セクション)

- 状況: オーナーの意向で README から agent-ready ブロックを削除したところ、check が「README has no agent-ready managed section」を恒常的に警告するようになった。README を綺麗に保ちたい公開リポジトリでは妥当な選択のはず。
- 提案: 設定(agent-ready.config.json)で README セクションをオプトアウトできるようにする。
- 追記: `agent-ready update` が削除済みの README セクションを無断で復元する(オーナー判断と衝突)。加えて update は CLAUDE.md テスト欄の例示パスを `npm run test` に置換して壊す(2回発生)。**当面この2点は update 後に手で戻す運用**。
- ステータス: 反映済み(config の `readme: false` + init `--no-readme` を実装。check/update は README 節を要求しなくなり、このプロジェクトの config にも設定済み — 手で戻す運用は不要。「update が例示パスを壊す」は下の bug エントリの修正で解消)

## 2026-07-11 | win | skills/verify(実ブラウザ検証)

- 状況: M5 の演習画面はユニットテスト(jsdom)が全部グリーンだったが、Playwright で実ブラウザを自動プレイしたところ「メダルが常に金」になる重大バグを発見。原因はキーストローク計測を CodeMirror の domEventHandlers で行っており、vim が消費したキーがハンドラに届かず取りこぼしていたこと。ユニットテストは `sendKey()`(本番と別経路)を使っていたため検出できなかった。
- 提案: 「テストが本番と同じ経路を通っているか」を verify の観点に明記する。特にライブラリにキー入力/イベントを委譲する UI は、ヘッドレスのユニットテストに加えて実ブラウザ駆動での検証を必須にすると良い。
- ステータス: 反映済み(共通スキル test-generation のルールに「本番と同じ経路を通す」を追加 — テスト専用ヘルパー経由の入力注入への警告と、イベント委譲UIの実ブラウザ検証の推奨。ja/en)

## 2026-07-11 | bug | agent-ready check(コマンド検出)

- 状況: CLAUDE.md の開発コマンド欄に `npm run typecheck` 等を記載済みでも「not documented」と報告され続ける(AGENTS.md の `npm run test` / `npx vitest run <path>` も同様)。ドキュメントの実態と check 結果が一致しない。
- 提案: コマンド検出を特定の見出し・書式への依存ではなく、ファイル全文からのコマンド文字列マッチにする(または期待する書式をエラーメッセージに明示する)。
- ステータス: 反映済み(check のコマンド記載判定をセクションパーサ依存からファイル全文の境界付きマッチに変更 — コードブロック・まとめ書きも記載済みと判定。例示テストパスの outdated 誤検出も解消し、update がドキュメントを壊さなくなった。回帰テスト2件追加)

## 2026-07-11 | gap | skills/architecture-design

- 状況: クリーンアーキテクチャプリセットが4層ディレクトリの定義を必須としているが、個人開発の SPA ではオーナーから「やりづらい・シンプルにしたい」と明確な差し戻しがあり、ADR で簡易構成(core/shell)に置換した。
- 提案: クリーンアーキテクチャプリセットに軽量適用形(例: functional core / imperative shell の2区分)を選択肢として用意し、プロジェクト規模で選べるようにする。
- ステータス: 反映済み(clean-architecture プリセットに軽量適用形を追加 — 小規模では「純粋コア / 副作用シェル」の2区分に簡約可、依存方向と ADR 記録は維持。rules と architecture-design フラグメント、ja/en)
