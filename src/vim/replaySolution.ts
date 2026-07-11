/**
 * Test-only solution replay, shared by the authored-content and generated-
 * content verification tests. Tokens are single keystrokes; "<Esc>" leaves
 * insert mode. Judging by the engine's actual mode (not by which key was
 * pressed) keeps operator+text-object sequences like "c i w" correct — the
 * "i" there is a text object, not insert-enter.
 */
import type { CodeMirrorVimEngine } from "./codeMirrorVimEngine";

export function replaySolution(
  engine: CodeMirrorVimEngine,
  solution: string[],
): void {
  for (const key of solution) {
    if (key === "<Esc>") {
      engine.sendKey("<Esc>");
    } else if (engine.currentMode() === "insert") {
      engine.typeText(key);
    } else {
      engine.sendKey(key);
    }
  }
}
