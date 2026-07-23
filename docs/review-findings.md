# コードレビュー指摘一覧

最終レビュー: 2026-07-21 / 対象: `src/` 全体(core / vim / storage / backup / ui / main.tsx)
最終消化: 2026-07-22(/codebase-review all — バグ・リファクタ全件対応、設計3件は判断待ち)

機械チェック: `npm run lint` / `npm run typecheck` ともにエラーなし。`npm run test` は 264 passed / 5 skipped(skip は `src/vim/stageContent.test.ts:35` の jsdom 制約による意図的なもので、`e2e/drive-m6.mjs` が代替検証。問題なし)。

## 1. 0キーのまま「やり直す」と旧セッションがリークし、クリア時の判定・記録が多重発火する

- 重大度: 高
- 種別: バグ
- 場所: src/ui/PracticePlayer.tsx:165-172(retry)、112-140(startExercise)
- 問題: `retry()` は `keystrokes() > 0` のときだけ `session.abandon()` する。0キーでやり直すと旧セッションは `playing` のままエンジン購読を残し、次のクリアで新旧両セッションの `onCleared` が発火して `onAttemptFinished` が2回(N回リトライで N+1 回)呼ばれる。
- 根拠: core/practice/session.ts:78-90 で購読解除は cleared/abandoned 遷移時のみ、vim/codeMirrorVimEngine.ts のリスナは Set 保持で `reset()` では消えないことを現物確認。結果: append-only の attempts が重複記録され R19 弱点分析が歪む、クリア音の二重再生、`evaluateAchievements` が同じ実績トーストを2回積む。XP は同一 `profileRef.current` 起点の last-write-wins で倍加しないことも確認済み。
- 提案: `startExercise()` 冒頭で `sessionRef.current?.state() === "playing"` なら必ず終了させる(0キー時は attempt を記録せず破棄する `dispose()` をセッションに追加するのが素直)。
- ステータス: 対応済み(startExercise が旧セッションを必ず abandon(0キーは記録せず破棄)。PracticePlayer.test.tsx で回帰テスト)

## 2. 難易度を切り替えるとベストメダルが降格しうる(R4 違反)

- 重大度: 高
- 種別: バグ
- 場所: src/core/practice/best.ts:18-25
- 問題: `improveBest` はキーストローク数のみで比較しメダルを無条件差し替えする。メダル閾値は難易度依存(medal.ts:36-39)のため、easy で金(par10 を13打)→ 後日 normal で銀(12打)のとき 12<13 で金が銀に置換される。
- 根拠: medal.ts の `configFor(difficulty)` 依存と、PracticePlayer.tsx:118-124 で UI の難易度設定がセッションに渡ることを現物確認。R4「メダルはベスト記録で上書きされる(下がらない)」と禁止事項「メダルを遡って不利に改変しない」に違反。best.ts 冒頭コメント「medal is a pure function of keystrokes for a fixed par」は難易度導入後は不成立。best.test.ts は同一難易度のケースのみ。
- 提案: メダルと keystrokes を独立に単調改善する(メダルは序位比較で良い方のみ採用、keystrokes は最小値)。難易度をまたぐ仕様を docs に追記しテストを追加。
- ステータス: 対応済み(improveBest をメダル/キーストロークの独立単調改善に変更し、R4 に難易度またぎを明文化)

## 3. デイリーの streak 記録が record.date 基準で R12 に違反

- 重大度: 中
- 種別: バグ
- 場所: src/core/daily.ts:52-54
- 問題: `applyDailyAttempt` が `recordActivity(profile.streak, record.date)` を呼ぶ。R12 は「活動が完了した瞬間のローカル日付」(23:59 開始→0:01 クリアは翌日の活動)と明記しており、`attempt.playedAt` の日付を使うべき。
- 根拠: domain.md R12 の文言と現物を突き合わせ。DailyScreen で record は画面マウント時の日付で凍結されるため、日付をまたいでクリアすると streak が前日付で記録され、前日が既にアクティブなら `alreadyActiveToday`(streak.ts:50-51)で今日のクリアが streak を一切進めない。ドリル側 applyProgress.ts は `localDateOf(completedAt)` で正しく、attempt ログ(session.test.ts は R12 準拠を検証)と食い違う。行内コメント「the challenge belongs to its date」は意図の痕跡だが R12 と矛盾。
- 提案: `localDateOf(attempt.playedAt)` を使う(record.date は R13/R15 のお題同一性・XP 判定にのみ使う)。意図的に「チャレンジの属する日」を採るなら R12 側に例外を明文化。
- ステータス: 対応済み(recordActivity に localDateOf(attempt.playedAt) を渡すよう修正。日跨ぎクリアのテストを追加)

## 4. 自動復元の「空」判定が粗く、ローカルの試行履歴を古いバックアップで全消去しうる

- 重大度: 中
- 種別: バグ
- 場所: src/ui/App.tsx:42-55(全置換の実体は src/storage/indexedDbProgressStore.ts:99-128)
- 問題: `looksEmpty = lessonClears が空 && xp === 初期値` だけで「ブラウザに消された」と判定し、`importJson`(全ストア clear → 置換)を実行する。放棄 attempt は XP を生まないため「未クリア・XP 0 のまま何度か遊んだ」状態は普通に起こり、その起動時に古い gist スナップショットが新しい attempts / dailyChallenges を黙って全置換する。`exportedAt` の新旧比較も無い。
- 根拠: App.tsx の判定式と importJson の clear→再投入を現物確認。PracticePlayer.tsx:169 の放棄 attempt 記録(medal null / XP なし)も確認。
- 提案: 空判定に attempts 件数を含める(`isEmpty()` を ProgressStore に追加)か、復元前に snapshot の `exportedAt` とローカル状態を比較して確認を挟む。
- ステータス: 対応済み(空判定に attempts 件数を追加。App.test.tsx で復元有無の両ケースを固定)

## 5. BackupPanel: バックアップ未存在時に `busy` が戻らず全ボタンが恒久 disabled になる

- 重大度: 中
- 種別: バグ
- 場所: src/ui/BackupPanel.tsx:53-74
- 問題: `restoreNow` は `pullBackup()` が null(gist 未作成)のとき `setStatus` して早期 return するが `setBusy(false)` を通らない。以後「今すぐバックアップ/復元/無効化」が再マウントまで全て押せなくなる。有効化直後に「復元」を押すと必ず踏む導線。
- 根拠: 現物で `if (!json) { setStatus(...); return; }` 経路に busy 解除が無いことを確認。直上の `backupNow`(38-51行)は `finally` で正しく戻しており書き分けの漏れ。
- 提案: `backupNow` と同様に `try/finally` で `setBusy(false)` する(成功経路は reload するので finally でも害なし)。
- ステータス: 対応済み(restoreNow を try/finally 化。BackupPanel.test.tsx で busy 解放を回帰テスト)

## 6. BossPanel が難易度を無視した閾値をハードコードし、メインゲージと表示が矛盾する

- 重大度: 中
- 種別: バグ
- 場所: src/ui/Boss.tsx:112-121, 130
- 問題: `silverLine = Math.ceil(par * 1.5)`、gold 判定 `keystrokes <= par` と normal 固定の式を直書きし、difficulty を受け取ってすらいない。難易度「やさしい」(goldFactor 1.4)では、メインゲージが金ゾーンを示す帯域で鬼が「フン、パーは守れなかったな(smug)」と言い、GOLD CHANCE ゲージも 0 になる。
- 根拠: Boss.tsx の式と core/difficulty.ts(easy: goldFactor 1.4 / silverFactor 2)、PracticePlayer.tsx:176-177 が `aids.goldFactor` を使うことを現物確認。
- 提案: 指摘7の `medalThresholds` を core に作り、BossPanel は difficulty(または閾値)を props で受け取る。
- ステータス: 対応済み(BossPanel が difficulty を受け取り core の medalThresholds を使用。Boss.test.tsx 追加)

## 7. メダル閾値の式(R3)が UI に重複実装されている(core 含め3箇所目)

- 重大度: 中
- 種別: 設計
- 場所: src/ui/PracticePlayer.tsx:176-177(ほか src/ui/Boss.tsx:113, 本家 src/core/practice/medal.ts:37-38)
- 問題: `Math.floor(par * goldFactor)` / `Math.ceil(par * silverFactor)` というゲージ・ゾーン判定の式が core の判定式そのものの再実装。閾値変更時に判定と表示が乖離するリスク。docs/frontend.md「閾値はすべて core の関数を呼ぶ」への違反で、出現3回=三度目の法則の抽出ライン。
- 根拠: medal.ts:37-38 と同一式であることを現物確認。core は事後判定 `judgeMedal` しか公開しておらず閾値を返す関数が無いため UI が式を写している。
- 提案: core/practice/medal.ts に `medalThresholds(par, difficulty): { goldMax, silverMax }` を追加し、`judgeMedal`・PracticePlayer・BossPanel の3者がそれを使う(指摘6と同時解消)。
- ステータス: 対応済み(core/practice/medal.ts に medalThresholds を新設し、judgeMedal・ゲージ・Boss の3者が共用)

## 8. gist API レスポンスが境界でパースされず `as` キャストで素通し

- 重大度: 中
- 種別: 設計
- 場所: src/backup/gistBackup.ts:86-90, 104-107
- 問題: `(await githubJson(...)) as { id: string }` / `as { files?: ... }`。外部データを境界でパースする原則(CLAUDE.md 型安全重視)に storage 層は従っているのに backup 層だけ素通し。
- 根拠: レスポンスに `id` が無い異常系でも例外にならず `gistId: undefined` が `JSON.stringify` で欠落 → `loadBackupConfig`(:32 の `typeof === "string"` 判定)は null 扱い → 次回 push が POST で新規 gist を作成し既存バックアップがサイレントに orphan 化する連鎖を現物確認。
- 提案: zod で `{ id: z.string() }` / files 形をパースし、不一致は Error として表面化させる。
- ステータス: 対応済み(zod の GistIdResponse / GistFilesResponse で境界パース。異常レスポンスのテスト追加)

## 9. exportJson が保存データを未検証のまま書き出し、破損が「復元時」まで潜伏する

- 重大度: 中
- 種別: バグ
- 場所: src/storage/indexedDbProgressStore.ts:79-97
- 問題: `loadProfile`/`loadAttempts` は zod パースするが、`exportJson` は `db.get`/`getAll` の生値をそのまま JSON 化する。DB に破損レコードがあると破損 JSON がバックアップされ続け、`importJson` は `ExportSchema.parse` で全体 reject するため、唯一の復旧経路が「復元しようとした瞬間」に初めて失敗する。
- 根拠: exportJson の実装(生値を直接 stringify)と importJson の全体パースを現物確認。store.ts の自動 push 経路も確認。
- 提案: export 時にも `ExportSchema`(または各スキーマ)を通し、破損をバックアップ時点で早期検出する。
- ステータス: 対応済み(exportJson が ExportSchema.parse を通してから書き出す。破損レコードで export が失敗するテスト追加)

## 10. openDB に blocked/blocking ハンドラが無く、将来の v2 移行時に複数タブで無限 LOADING

- 重大度: 中
- 種別: 設計
- 場所: src/storage/indexedDbProgressStore.ts:35-39
- 問題: `openDB` に `upgrade` しか渡していない。DB_VERSION を上げた版を新タブで開くと、旧バージョン接続を持つ別タブが生きている限り upgrade がブロックされ Promise が解決しない。App.tsx:37 は `await openStore()` で待つためエラー分岐にも入らず LOADING のまま止まる。
- 根拠: openDB 呼び出しに upgrade のみであることを現物確認。migrations.ts は将来のバージョン追加を明示的に前提とした構造。
- 提案: `blocking` で `db.close()`(+リロード誘導)、`blocked` でユーザー向けメッセージを出す処理を今のうちに追加する。
- ステータス: 対応済み(openDB に blocked / blocking ハンドラを追加(blocking で db.close))

## 11. 生成お題にパー下限の保証がない(1打で金のデイリーが出うる)

- 重大度: 中
- 種別: バグ
- 場所: src/core/generation/templates.ts:70-105 ほか各テンプレート / src/core/practice/exercise.ts:38-42
- 問題: domain.md 例外ケース「生成器はパーの下限(例: 3キー以上)を保証し」に対し、実装の保証は `par >= 1` と `initial ≠ target` のみ。`extraChar` で wordIndex=0・offset=0 なら solution=`["x"]` で par=1 になる。
- 根拠: extraChar の solution 構築(w×wordIndex + l×offset + x)と assertValidExercise の `par < 1` ガードを現物確認。medal.ts:16 の doc コメントは「generation guarantees par >= 3」と主張しており実装と不一致(指摘26と同根)。
- 提案: 生成器で par<3 ならリロール(seed 決定性は rng 継続利用で保てる)するか、下限を設けない判断を domain.md 側に反映する。
- ステータス: 対応済み(generateFromTemplate が par>=3 までリロール(seed 決定性維持)。年間スイープのテスト追加)

## 12. UI のテストが1本も無い(セッション配線という最もバグりやすい層が無防備)

- 重大度: 中
- 種別: リファクタ
- 場所: src/ui/ 全体
- 問題: core / storage / backup / vim にはテストがある一方、ui はコンポーネントテストが皆無。指摘1(セッションリーク)・5(busy 戻し漏れ)はいずれも Testing Library + フェイク engine/store で機械的に捕まえられる種類のバグ。
- 根拠: `src/ui/*.test.*` が0件であることを確認。スタックに Testing Library 採用済みなのに未使用。
- 提案: まず PracticePlayer(リトライ→クリアで onAttemptFinished が1回だけ発火)と BackupPanel(null 復元後にボタンが有効)の2本から。
- ステータス: 対応済み(Boss / PracticePlayer / BackupPanel / App の UI テストを新設。Testing Library 導入、vitest include に .tsx 追加)

## 13. クイズ BANK とレッスンラベルの一致がテストされていない

- 重大度: 中
- 種別: リファクタ
- 場所: src/core/quiz.ts:46-51 / src/core/quiz.test.ts
- 問題: doc コメントで「`command` は MUST equal a lesson's command label」と不変条件を宣言しているが検証テストがない。ラベルが変わると解放ゲーティング(`clearedLabels`)が静かに壊れる。
- 根拠: quiz.ts:45-48 の doc コメントと、quiz.test.ts に照合テストが無いことを現物確認。現時点では BANK 16件すべて一致(レビュー時に照合済み、現在のバグではない)。
- 提案: `BANK.every(item => lessonLabels.has(item.command))` を検証するテストを1本追加。
- ステータス: 対応済み(BANK 全件がレッスンラベルに一致することを検証するテストを追加)

## 14. gist 手動削除後、自動バックアップが PATCH 404 で恒久停止し自己回復しない

- 重大度: 低
- 種別: バグ
- 場所: src/backup/gistBackup.ts:62-69, 86-90
- 問題: 保存済み gist をユーザーが削除すると以後の PATCH は毎回 404。自動 push 経路は `console.warn` のみでバックアップが静かに止まり続ける。
- 根拠: `githubJson` は 404 を汎用エラーにするだけで、`pushBackup` に gistId を破棄して再作成するフォールバックが無いことを現物確認(63行目のコメントは 404 = gist gone を認識済み)。
- 提案: PATCH の 404 時は gistId をクリアして POST で再作成する。
- ステータス: 対応済み(PATCH 404 時は gistId を破棄して POST で再作成するフォールバックを追加)

## 15. gistId 未確定時、手動 push とデバウンス push の並走で gist が二重作成されうる

- 重大度: 低
- 種別: バグ
- 場所: src/backup/gistBackup.ts:78-90(呼び出し: src/ui/store.ts:57-66, src/ui/BackupPanel.tsx:42-43)
- 問題: `pushBackup` は開始時に `loadBackupConfig()` を読むだけなので、gistId が null の初回に2つの push が並走すると両方 POST し、private gist が2つできて後勝ちの config だけが残る。
- 根拠: pushBackup に直列化機構が無いこと、「今すぐバックアップ」と store の4秒デバウンス push が互いに直列化されていないことを現物確認。
- 提案: 進行中の push Promise をモジュール内で共有して直列化する。
- ステータス: 対応済み(pushBackup をモジュール内 promise チェーンで直列化。並走テストで POST 1回を固定)

## 16. ドリルで「クリア後にやり直す」と WANTED パネルが次の敵を「いまの相手」と表示する

- 重大度: 低
- 種別: バグ
- 場所: src/ui/DrillScreen.tsx:103, 133, 180-184
- 問題: `currentEnemy = bounty.findIndex(r => r === null)` だが、結果モーダルの「やり直す」は同じお題を再プレイする。bounty は既にメダルで埋まっているため、i 番を再戦中にハイライトと💡ヒントが i+1 番の敵を指す。
- 根拠: currentEnemy の算出と、retry がインデックス据え置きで startExercise することを現物確認。bounty を戻す処理は無い。
- 提案: sidePanel を関数形式にして PracticePlayer の実プレイ中インデックス基準で現在敵とヒントを決める。
- ステータス: 対応済み(sidePanel を関数形式にし、ライブな exercise 基準で現在敵とヒントを算出)

## 17. 「abandoned」表示系が全て到達不能なデッドコード+prop コメントが実挙動と不一致

- 重大度: 低
- 種別: リファクタ
- 場所: src/ui/PracticePlayer.tsx:74, 100, 224-227 / src/ui/DrillScreen.tsx:97, 148-175, 228-237
- 問題: `onAttemptFinished` は `session.onCleared` からしか呼ばれず、クリア済み attempt の medal は常に非 null(judgeMedal は最低 bronze)。よって `medal ?? "abandoned"` 分岐、abandoned スタイル、💨「逃げられた」表示は一度も出ない。prop の doc「cleared or abandoned via retry」も虚偽(abandon は store 直行)。
- 根拠: session.ts:53-70(medal null は abandoned のみで onCleared に流れない)と retry の `store.appendAttempt` 直呼びを現物確認。
- 提案: abandon も `onAttemptFinished` 経由に統一して💨表示を生かすか、デッドブランチと型から `"abandoned"` を削除しコメントを直す。
- ステータス: 対応済み(到達不能な abandoned 表示系と型を削除し、onAttemptFinished の doc コメントを実挙動に修正)

## 18. HomeScreen のエクスポートにエラーハンドリングが無い

- 重大度: 低
- 種別: バグ
- 場所: src/ui/HomeScreen.tsx:478-488
- 問題: `exportProgress` は async だが try/catch が無く、`store.exportJson()` 失敗時は未処理 rejection でユーザーへのフィードバックがゼロ。
- 根拠: 現物確認。同ファイルの `importProgress` は alert で通知しており非対称。
- 提案: catch して alert か status 表示(インポートと同型)にする。
- ステータス: 対応済み(exportProgress に try/catch + alert(インポートと同型のフィードバック))

## 19. UI が VimEngine ポートではなく具象 CodeMirrorVimEngine 型に依存し、`view: EditorView` まで見えている

- 重大度: 低
- 種別: 設計
- 場所: src/ui/PracticePlayer.tsx:29-32, 134, 139, 154 / src/vim/codeMirrorVimEngine.ts:33-51 / src/core/ports.ts:20-37
- 問題: UI が使う `focus()/blur()/destroy()` は VimEngine ポートに無く具象インターフェース経由。現状 CodeMirror の生 API は呼んでいない(規約の字義は満たす)が、`view: EditorView` が UI に露出しており将来の直接依存の入口になる。
- 根拠: PracticePlayer の engine.focus/blur/destroy 使用と ports.ts の VimEngine 定義(reset/currentBuffer/currentMode/onKeystroke/onBufferChange のみ)を現物確認。
- 提案: focus/blur/destroy を ports.ts の VimEngine(または ui 向けサブポート)へ昇格し、`view` はテスト専用型に隔離する。
- ステータス: 未対応(設計判断待ち — 選択肢は 2026-07-22 の消化レポートで提示済み)

## 20. LocalDate の検証が正規表現のみで暦上あり得ない日付を通し、パターンが core と storage で重複

- 重大度: 低
- 種別: バグ
- 場所: src/core/localDate.ts:10-18 / src/storage/schema.ts:18
- 問題: `^\d{4}-\d{2}-\d{2}$` のみの検証のため `"2026-13-40"` が `localDate()` も storage 境界(zod)も通過し、`daysBetween` の `Date.parse` が NaN を返す。NaN が `recordActivity` に流れると gap 比較が全て false になり無警告で reset 扱いになる。同一パターンが2箇所に重複。
- 根拠: 両ファイルの正規表現が同一であること、daysBetween → recordActivity の経路を現物確認。import JSON は手編集されうる外部入力。
- 提案: パターンを core から export して共有し、パース→再フォーマット一致の round-trip 検証を足す。
- ステータス: 対応済み(core に isLocalDate(UTC round-trip 検証)を追加し、localDate() と storage 境界(zod refine)で共用)

## 21. フリーズ補充が「7日連続アクティブ」の字義と乖離(消費した当日に補充が発生しうる)

- 重大度: 低
- 種別: 設計
- 場所: src/core/progression/streak.ts:74-78
- 問題: 補充判定が `current % 7 === 0` で、フリーズ消費で飛んだ日を含む通算 `current` を数える。P3「7日連続アクティブごとに1個補充」の字義だと、消費した当日に補充が発生して実質タダになるケースがある(current=6 で1日サボり→翌日クリアで current=7、消費した1個が即返る)。なお `current > 0 &&` は常に真で冗長。
- 根拠: recordActivity の freeze 消費時も `current+1` して同じ式で補充することを現物確認。streak.test.ts は連続日のみでこの経路を検証していない。
- 提案: 意図的(Duolingo 風)なら P3 側に追記。字義通りにするなら「最後の補充/リセット以降の連続アクティブ日数」を別カウントする。
- ステータス: 未対応(設計判断待ち — 選択肢は 2026-07-22 の消化レポートで提示済み)

## 22. `daily-` プレフィックスによる暗黙結合

- 重大度: 低
- 種別: 設計
- 場所: src/core/progression/achievements.ts:78-79 / src/core/generation/generate.ts:47-49
- 問題: `daily-debut` 実績が `id.startsWith("daily-")` という文字列規約で判定され、ID 生成規約(`daily-${date}`)と暗黙に結合している。共有定数もテストもなく、どちらかを変えるともう片方が静かに壊れる。
- 根拠: 両箇所の文字列リテラルをレビューで照合済み。
- 提案: `DAILY_ID_PREFIX` を generation 側で export して両者が参照する。
- ステータス: 対応済み(DAILY_ID_PREFIX を generation 側で export し、生成と実績判定が共用)

## 23. `medalTrendByDay` が `localDateOf` を再実装

- 重大度: 低
- 種別: リファクタ
- 場所: src/core/analytics/weakness.ts:53-56
- 問題: y/m/d の padStart 整形が localDate.ts の `localDateOf` と完全重複。`TrendPoint.date` も裸の `string`(branded 型原則に反する)。
- 根拠: 両実装を読み比べて同一であることを現物確認。
- 提案: `localDateOf(attempt.playedAt)` を呼び、`TrendPoint.date` を `LocalDate` に。
- ステータス: 対応済み(localDateOf を使用し、TrendPoint.date を LocalDate に変更)

## 24. デッドコード・未使用エクスポート(`allExercises` ほか)

- 重大度: 低
- 種別: リファクタ
- 場所: src/core/curriculum/curriculum.ts:96-99 ほか
- 問題: `allExercises` はプロダクション・テストどちらからも参照ゼロ。doc コメント「R6 guard」も実体(単なる flatten)と不一致。`canGenerate`・`medalTrendByDay`・`isLessonPlayable` はテストからのみ参照。`MAX_FREEZES` / `FREEZE_REPLENISH_EVERY` / `DIFFICULTY_CONFIG` は外部利用のない export。
- 根拠: src 全体 grep で `allExercises` の参照が定義のみであることを確認。
- 提案: `allExercises` は削除(履歴は VCS が覚えている)。残りは export を外すか利用予定をコメントで示す。
- ステータス: 対応済み(allExercises を削除。内部専用の定数を非公開化し、テスト専用 API に利用予定コメントを付与)

## 25. `generateDrill` が `generateOne` を再利用していない

- 重大度: 低
- 種別: リファクタ
- 場所: src/core/generation/generate.ts:100-105(重複元: 24-35)
- 問題: 「template.generate → solution 付与 → assertValidExercise」の同一処理が2箇所にある。
- 根拠: レビューエージェントが両箇所を読み比べて確認。
- 提案: `generateDrill` の map 内で `generateOne` 相当を呼ぶ形に寄せる(テンプレート選択部だけ分離)。
- ステータス: 対応済み(generateOne / generateDrill が generateFromTemplate を共用)

## 26. 実装と食い違う古いコメント群

- 重大度: 低
- 種別: リファクタ
- 場所: src/core/curriculum/stages.ts:6 / src/core/curriculum/curriculum.test.ts:37 / src/core/generation/generate.test.ts:59 / src/core/practice/medal.ts:15-16
- 問題: 順に — 「see stages.test.ts」(存在しない。実体は src/vim/stageContent.test.ts)/「Stage 2 has no lessons yet」(現在10レッスンある)/「only the f-jump template qualifies」(`snipe` も該当)/「generation guarantees par >= 3 … enforced here as a guard」(実ガードは par >= 1。指摘11と同根)。
- 根拠: medal.ts は現物確認済み。他3件はレビューエージェントが現物照合済み。
- 提案: 各コメントを現状に合わせて修正(挙動変更なしのコミットで)。
- ステータス: 対応済み(stages.ts / curriculum.test.ts / generate.test.ts / medal.ts の4箇所のコメントを現状に一致させた)

## 27. 「帯 (Belt)」が用語集に無い概念+`beltForLevel` にテストがない

- 重大度: 低
- 種別: 設計
- 場所: src/core/progression/belt.ts:2
- 問題: ヘッダが「docs/domain.md: レベル→帯」と参照するが、domain.md に「帯 / Belt」は存在しない。CLAUDE.md「用語集に無い概念を導入する時は用語集を先に更新する」に反する。`beltForLevel` は `THRESHOLDS[i]!` の非 null 断言を含むがテストがない。
- 根拠: `grep -i 'belt\|帯' docs/domain.md` が0件であることを確認。
- 提案: 用語集に「帯 `Belt`」を追加し、境界値テスト(1,2,3,14,15)を1本足す。
- ステータス: 対応済み(domain.md 用語集に「帯 Belt」を追加し、belt.test.ts で境界値を検証)

## 28. VimEngine ポート契約にイベント順序の規定がない

- 重大度: 低
- 種別: 設計
- 場所: src/core/ports.ts:27-36 / src/core/practice/session.ts:72-85
- 問題: クリアを起こしたキーについて `onKeystroke` が `onBufferChange` より先に発火する保証を契約に書いていない。逆順の実装だと keystrokes=0 のまま `judgeMedal` に達し RangeError で落ちる(medal.ts:31)。
- 根拠: 現実装(capture フェーズの keydown で先にカウント)では発現しないが、差し替え可能なポート(ADR-0003)の暗黙前提になっていることを確認。
- 提案: ports.ts の doc コメントに順序保証を1行明記する。
- ステータス: 対応済み(ports.ts の onBufferChange doc に onKeystroke 先行の順序契約を明記)

## 29. 生成ドリルのベスト記録が Profile に無限蓄積

- 重大度: 低
- 種別: 設計
- 場所: src/core/applyProgress.ts:34-38 / src/core/generation/generate.ts:101
- 問題: ドリルの exercise ID は `drill-${seed}-${i}` でセッション毎に新規のため、`exerciseBests` に二度と参照されないエントリが毎セッション最大5件増え続け、`saveProfile` が全量書き込みのため肥大する(非有界データの蓄積)。
- 根拠: seed が UI からタイムスタンプで渡る設計と、再挑戦で同 ID になる経路が無いことをレビューエージェントが確認。
- 提案: source=drill の生成お題はベスト記録の保存対象から外す(XP の firstClear 判定は残せる)か、意図的なら doc に明記。
- ステータス: 未対応(設計判断待ち — 選択肢は 2026-07-22 の消化レポートで提示済み)

## 30. replayable() の「j×n ≡ (n+1)G」等価性は「行頭が非空白」前提で、コメントの主張より狭い

- 重大度: 低
- 種別: バグ
- 場所: src/vim/generatedContent.test.ts:22-32
- 問題: `nG` は行の先頭非空白に着地し `j` はカラムを保持する。現状の CODE_LINES / WORDS にインデント行が無いため一致するが、テンプレートが字下げ行を生成し始めた瞬間、検証リプレイが実プレイと乖離する。コメントは無条件に "yields the same buffer" と主張している。
- 根拠: templates.ts:38-63 の生成素材にインデント行が無いことをレビューエージェントが確認。
- 提案: 前提(生成行はインデント無し)をコメントに明記するか、debug-sweep が既にやっている `{col}|` 方式の verifySolution に寄せる。
- ステータス: 対応済み(前提(生成行はインデント無し)をコメントに明記し、不変条件テストで強制)

## 31. PURE_MODIFIERS がロック系・IME 系キーを除外していない

- 重大度: 低
- 種別: バグ
- 場所: src/vim/codeMirrorVimEngine.ts:23-30
- 問題: CapsLock は除外済みだが `NumLock` / `ScrollLock` は押すだけでキーストローク数(R2 スコア)が増える。日本語 IME 有効時の `Process` キーも同様に1打ごとに水増しカウントされる。
- 根拠: PURE_MODIFIERS の Set(Shift/Control/Alt/Meta/CapsLock/Fn のみ)を現物確認。
- 提案: `NumLock` / `ScrollLock` / `Process` / `Dead` を Set に追加する。
- ステータス: 対応済み(NumLock / ScrollLock / Process / Dead を PURE_MODIFIERS に追加。DOM 経路のテスト追加)

## 32. importJson の schemaVersion 不一致と runMigrations の欠番エラーにテストが無い

- 重大度: 低
- 種別: リファクタ
- 場所: src/storage/indexedDbProgressStore.ts:103-109 / src/storage/migrations.ts:41
- 問題: 既存テストは「app 不一致」「非 JSON」のみ。`schemaVersion: 2` の snapshot 拒否と、migration 欠番時の throw は未検証。将来のバージョン追加時に最初に踏む経路。
- 根拠: indexedDbProgressStore.test.ts:122-128 のケース一覧をレビューエージェントが確認。
- 提案: `schemaVersion: 2` の reject と `runMigrations` 欠番 throw のケースを各1本追加。
- ステータス: 対応済み(schemaVersion 不一致の reject と runMigrations 欠番 throw のテストを追加)

---

## 指摘ゼロだった観点(確認済み)

- **core 純粋性**(禁止 import・`Date.now()`・`Math.random()`・ブラウザ API): 違反ゼロ(grep で機械確認)。
- **ui からの vim ライブラリ直接 import**: ゼロ(`@replit/codemirror-vim` / `@codemirror/*` の grep 0件)。
- **any・型キャスト・抑制コメント**: backup 層の `as` キャスト(指摘8)を除きゼロ。ID は branded 型、ユニオンは網羅的 switch + assertNever。
- **R1〜R19 のテスト対応**: 全ルールに対応テストあり(ただし指摘2・3のとおり「テストはあるが仕様の穴を突いていない」箇所あり)。
- **GitHub トークンのログ出力・URL 混入**: ゼロ(Authorization ヘッダのみ)。localStorage 平文保存は ADR-0008 で明示的に受容済み。
- **importJson の原子性**: 問題なし(パース→単一トランザクションで clear→再投入、失敗時は全戻し)。
- **キーストロークの二重カウント**: なし(DOM 経路と sendKey 経路の排他が doc とテストで担保)。
- **stale closure / useEffect クリーンアップ漏れ**: 指摘1以外ゼロ(profileRef パターンで統一、非同期 effect は cancelled フラグ持ち)。
- **ホットパスの性能問題**(N+1・非有界ロード・ループ内再計算): 実行時はゼロ(指摘29は保存データ蓄積の話)。
