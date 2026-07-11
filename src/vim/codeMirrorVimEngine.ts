/**
 * VimEngine implementation on CodeMirror 6 + @replit/codemirror-vim
 * (ADR-0003, ADR-0006). This is the only module allowed to touch the
 * CodeMirror API surface — ui and core see the VimEngine port only.
 *
 * How it works: one EditorView hosts the vim extension. reset() swaps in a
 * fresh EditorState so undo history cannot reach back into the previous
 * exercise (pressing `u` on exercise N must never restore exercise N-1).
 * Vim registers live on the global Vim object and intentionally survive
 * reset — same as quitting and reopening a buffer in real vim.
 */
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { getCM, Vim, vim } from "@replit/codemirror-vim";
import type { VimEngine, VimMode } from "../core/ports";

// Neovim-modern defaults (domain.md P9): Y yanks to end of line, not the
// whole line. Applied once, globally — Vim keymaps are engine-global state.
Vim.map("Y", "y$", "normal");

/** Keys that never count as a keystroke on their own (R2 counts real input). */
const PURE_MODIFIERS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Fn",
]);

/** Engine-side extras that ui/main may use but core must not depend on. */
export interface CodeMirrorVimEngine extends VimEngine {
  readonly view: EditorView;
  /**
   * Drive a key through the vim emulation programmatically (tests, replays).
   * In the browser, real keyboard input flows through CodeMirror itself and
   * must NOT be sent here too, or keystrokes would be counted twice.
   */
  sendKey(key: string): void;
  /** Insert text at the selection as if typed in insert mode (tests). */
  typeText(text: string): void;
  /** Run an Ex command line, e.g. "%s/foo/bar/g" (tests, lesson replays). */
  sendEx(command: string): void;
  /** Give the editor keyboard focus (call when an exercise starts). */
  focus(): void;
  destroy(): void;
}

export function createVimEngine(parent: Element): CodeMirrorVimEngine {
  const keystrokeListeners = new Set<(key: string) => void>();
  const bufferListeners = new Set<(buffer: string) => void>();
  let mode: VimMode = "normal";

  const emitKeystroke = (key: string) => {
    for (const listener of keystrokeListeners) listener(key);
  };

  const makeState = (doc: string) =>
    EditorState.create({
      doc,
      extensions: [
        // vim() must precede other keymaps so it sees keys first.
        vim(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const text = update.state.doc.toString();
          for (const listener of bufferListeners) listener(text);
        }),
        EditorView.domEventHandlers({
          keydown: (event) => {
            if (!PURE_MODIFIERS.has(event.key)) emitKeystroke(event.key);
            return false; // observe only; vim handles the key
          },
        }),
      ],
    });

  const view = new EditorView({ parent, state: makeState("") });

  const cm = () => {
    const instance = getCM(view);
    if (!instance) throw new Error("vim extension is not active on the view");
    // The package's public helpers (handleKey/handleEx) declare a stricter
    // parameter type than getCM returns; the instance is the same object.
    return instance as Parameters<typeof Vim.handleEx>[0];
  };

  // The vim plugin (and its mode events) is recreated with each state, so
  // mode tracking must be re-attached after every reset().
  const attachModeTracking = () => {
    cm().on("vim-mode-change", (event: { mode: string }) => {
      // Map vim's richer set onto the port's three UI-relevant modes:
      // replace behaves like insert for display; command-line etc. keep
      // the previous mode until vim switches back.
      if (event.mode === "insert" || event.mode === "replace") mode = "insert";
      else if (event.mode === "visual") mode = "visual";
      else if (event.mode === "normal") mode = "normal";
    });
  };
  attachModeTracking();

  return {
    view,
    reset(initialBuffer: string) {
      view.setState(makeState(initialBuffer));
      mode = "normal";
      attachModeTracking();
    },
    currentBuffer: () => view.state.doc.toString(),
    currentMode: () => mode,
    onKeystroke(listener) {
      keystrokeListeners.add(listener);
      return () => keystrokeListeners.delete(listener);
    },
    onBufferChange(listener) {
      bufferListeners.add(listener);
      return () => bufferListeners.delete(listener);
    },
    sendKey(key) {
      emitKeystroke(key);
      Vim.handleKey(cm(), key, "user");
    },
    typeText(text) {
      for (const ch of text) emitKeystroke(ch);
      cm().replaceSelection(text);
    },
    sendEx(command) {
      Vim.handleEx(cm(), command);
    },
    focus() {
      view.focus();
    },
    destroy() {
      keystrokeListeners.clear();
      bufferListeners.clear();
      view.destroy();
    },
  };
}
