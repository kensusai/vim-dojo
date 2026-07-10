# 0007: フロントエンドスタック(TypeScript + Vite + React + Tailwind + Motion + zustand + idb)

- ステータス: 採用
- 日付: 2026-07-11

## コンテキスト(なぜ判断が必要か)

バックエンドレス SPA(ADR-0001)・core/shell 構成(ADR-0005)・vim エンジン(ADR-0006)を除く、アプリ実装の技術一式を決める。判断基準は「起動サクサク・キー入力即応・モダンでわくわくする UI」(非機能要件)、「シンプルな実装」(オーナー方針)、「型安全重視」(開発原則)、および1人開発+AI エージェントでの開発効率。

## 決定(何をどうするか)

- **言語**: TypeScript(strict)。Node.js は mise で管理。
- **ビルド**: Vite。
- **UI**: React(オーナー選択)。
- **スタイリング**: Tailwind CSS。**アニメーション**: Motion(旧 framer-motion)。
- **状態管理**: zustand。**永続化**: IndexedDB + `idb` ラッパー(core の `ProgressStore` ポートの実装)。
- **テスト**: Vitest + Testing Library(core のルール R1〜R19 を純粋関数テストで網羅)。E2E は未選定(候補 Playwright、最初の画面が動いてから判断)。
- **lint/format**: ESLint + Prettier。ESLint の import 制約で「core は core 以外を import しない」を機械検査。
- **デプロイ**: GitHub Pages + GitHub Actions。再訪の即時起動は vite-plugin-pwa(導入は CI 構築後)。
- 各選定の理由・不採用候補・見直し条件の詳細は `docs/tech-stack.md` を正とする。

## 検討した代替案(採用しなかった案と理由)

- **Svelte / Vue**: バンドルサイズや学習コストで利点はあるが、情報量・AI エージェントの習熟度・オーナーの選好で React。
- **Next.js 等のメタフレームワーク**: サーバー機能・SSR が不要(ADR-0001)。静的 SPA には過剰。
- **Redux / Context のみ**(状態管理)、**Dexie / localStorage**(永続化)、**Jest**(テスト)、**Biome**(lint): それぞれ `docs/tech-stack.md` の各カテゴリに理由を記載。共通する判断軸は「必要十分より大きいものを入れない」。

## 影響(この決定で生じるトレードオフ)

- (+) 全カテゴリで「情報が豊富・小さく・速い」を優先したため、1人+AI エージェント開発の速度が出る。
- (+) core は React にも CodeMirror にも依存しないため、UI 側の選定ミスが core に波及しない。
- (−) React はランタイムを持つ分、Svelte 比でバンドルが大きい。緩和策: ルート単位のコード分割、初回表示に不要なもの(分析グラフ等)の遅延ロード。
- (−) Tailwind のユーティリティクラスは JSX を冗長にする。受容(デザインシステムを CSS 変数で補助)。
- (−) zustand・Motion 等のライブラリ選定は流行の影響を受ける。見直し条件を `docs/tech-stack.md` に明記して追従判断を機械化。
