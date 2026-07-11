import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // e2e drive scripts run under Node + a real browser page: they legitimately
    // use process/console and page-context globals (indexedDB). Not shipped.
    files: ["e2e/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        indexedDB: "readonly",
        navigator: "readonly",
        document: "readonly",
      },
    },
  },
  {
    // ADR-0005 rule 1: core must stay pure. It may not import anything outside
    // core (libraries, browser APIs) and may not read ambient time/randomness;
    // those come in through core/ports.ts. Test files are exempt: they import
    // vitest and are not shipped as core code.
    files: ["src/core/**/*.ts"],
    ignores: ["src/core/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^[^.]",
              message:
                "core は core 以外(ライブラリ・フレームワーク)を import しない (ADR-0005)。外界は core/ports.ts 経由で受け取る。",
            },
            {
              regex: "^(\\.\\./)+(vim|storage|ui)(/|$)",
              message:
                "core から shell (vim/storage/ui) への import は禁止 (ADR-0005)。",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "window",
          message: "core はブラウザ API に依存しない (ADR-0005)。",
        },
        {
          name: "document",
          message: "core はブラウザ API に依存しない (ADR-0005)。",
        },
        {
          name: "localStorage",
          message: "core は保存を ProgressStore ポート経由で行う (ADR-0005)。",
        },
        {
          name: "indexedDB",
          message: "core は保存を ProgressStore ポート経由で行う (ADR-0005)。",
        },
        {
          name: "fetch",
          message: "core は外部通信をしない (ADR-0001, ADR-0005)。",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Date",
          property: "now",
          message: "core の時刻は Clock ポート経由で受け取る (ADR-0005)。",
        },
        {
          object: "Math",
          property: "random",
          message:
            "core の乱数は RandomSource ポート経由で受け取る(シード決定性 R13 のため)。",
        },
      ],
    },
  },
);
