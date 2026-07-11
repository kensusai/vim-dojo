# フロントエンド実装ルール — vim-dojo

最終更新: 2026-07-11(M5 で作成)

## 画面設計(デザインソースとの対応)

| 画面   | デザインソース(正)                    | 実装                        |
| ------ | ------------------------------------- | --------------------------- |
| 演習   | `design/mockups/practice-c.html`(案C) | `src/ui/PracticeScreen.tsx` |
| ホーム | `design/mockups/home-c.html`(案C)     | M6 で実装                   |

- デザイントークンは `src/ui/index.css` の `@theme`(Tailwind v4)に定義。**モック HTML の `:root` と同期を保つ**(色・フォントを変えるときは両方更新)。
- Figma を使う場合の手順は `design/mockups/README.md`。
- **モックとの既知の差分(M5 時点)**: ①師範キャラ(スプライト・台詞・「師範に聞く」ヒント)未実装 → M6 以降 ②結果モーダルに「この題をやり直す」を追加(実用上必要だった) ③ヘッダーに Lv./XP/🔥 の簡易表示(モックでは帯+ブロックゲージ)→ M6 の HUD 実装で置換。

## 画面遷移図

```mermaid
flowchart LR
    Boot[起動: プロファイル読込] --> Practice[演習(サンプルドリル)]
    Practice -->|クリア/にげる| Result[結果モーダル]
    Result -->|次のお題| Practice
    Boot -.->|M6| Home[ホーム] -.-> Practice
```

## 共通コンポーネント

- まだ抽出していない(画面が1枚のため)。**同じ見た目が3回出たら共有コンポーネントに抽出**(三度目の法則)。候補: pixel-panel カード、chunky ボタン、HUD チップ。
- CSS 共通クラス(`.pixel-panel` `.btn-chunky` `.blink` `.ippon-pop`)は `index.css` の `@layer components` に定義済み。新規コンポーネントを作る前にここを確認。

## state 管理方針

- **永続状態(Profile)**: core の型のまま `App` が保持し、変更は core の適用関数(`applyDrillAttempt` 等)→ `ProgressStore` 保存 → `onProfileChange` の一方向。
- **画面状態**: 各画面の `useState`。判別可能ユニオンでモデル化(例: `BootState = loading | ready | error`)。boolean の組み合わせ禁止。
- **zustand**: M6 で導入済み(`src/ui/store.ts` + `storeContext.tsx`)。Profile とルーティング(home/lesson)を全画面で共有。ロジックは持たず、core の適用関数の結果を保持して保存するだけ。
- **サーバー状態**: 存在しない(ADR-0001)。TanStack Query 等は不要。

## ディレクトリ構成

- `src/ui/` 直下に画面(`*Screen.tsx`)と `App.tsx`。画面内の部品は同ファイルの小さな関数コンポーネント → 肥大したら `src/ui/<画面名>/` に分割。
- フックが必要になったら `src/ui/hooks/`。

## UI 実装ルール

- Tailwind ユーティリティ + `@layer components` の共通クラス。インラインの複雑な style 属性は動的値(ゲージ幅等)のみに限定。
- **ロジックを書かない**: メダル判定・ゲージの閾値・XP 計算はすべて core の関数を呼ぶ。UI 側で式を再実装しない(レビュー観点)。
- vim ライブラリは `VimEngine` ポート経由のみ(ADR-0003)。CodeMirror の API・CSS クラスへの依存は `index.css` の `.editor-host` 配下と `src/vim/` に閉じる。
- 文言のトーンは案C準拠(師範=絶叫系、システム文言=簡潔)。判定語: 金=一本!!/銀=技あり!/銅=有効。

## フォーム設計 / エラーメッセージ

- フォームは当面エクスポート/インポート(M8)のみ。バリデーションは storage 境界(zod)が行い、UI は結果を表示する。
- エラー文言は「何が起きたか+次に取れる行動」をセットで(例: 読み込み失敗 → インポートでの復旧を案内)。

## ローディング表示

- 起動は `LOADING▮`(点滅カーソル)のみ。プロファイル1件読むだけなので一瞬(スケルトン不要)。レイアウトシフトを作らない。

## アクセシビリティ

- モーダルは `role="dialog"` + `aria-modal` + 開時フォーカス移動(実装済み)。ボタンはすべて `<button type="button">`。
- 画面の完了条件: キーボードのみで一周できること(演習はそもそもキーボード専用。モーダルは Enter で次へ)。
- コントラスト: トークンの cream 系 on 墨色は AA を満たす。新色追加時は確認する。

## レスポンシブ対応

- **デスクトップ専用**(1440px 基準、最小 1100px 程度まで崩れないこと)。モバイル対応はスコープ外(project-overview.md)。

## パフォーマンス

- 目標: キー入力への反応が体感即時(16ms)。キーストロークごとの再レンダーは HUD 数値程度に留め、エディタ本体は CodeMirror が直接描画(React を通さない)。
- 既知の課題: 初回バンドルが 500kB 超(CodeMirror+React 一体)。**M8 で計測(Lighthouse)とコード分割**(分析画面・結果演出の遅延ロード)を行う。数値を測らずに先に分割しない。
