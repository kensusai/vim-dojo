// @vitest-environment jsdom
/**
 * Engine spike (PLAN M1 / ADR-0006): drives @replit/codemirror-vim headlessly
 * to verify the commands our curriculum needs. Each `describe` maps to a
 * curriculum stage; results are summarized in docs/vim-coverage.md — keep
 * that table in sync when adding cases here.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installCodeMirrorDomStubs } from "./cmDomStubs";
import {
  createVimEngine,
  type CodeMirrorVimEngine,
} from "./codeMirrorVimEngine";

beforeAll(installCodeMirrorDomStubs);

let engine: CodeMirrorVimEngine;

const keys = (sequence: string[]) => {
  for (const k of sequence) engine.sendKey(k);
};

beforeEach(() => {
  engine = createVimEngine(document.body);
});

afterEach(() => {
  engine.destroy();
});

/** Dispatch a real keydown on the editor's contentDOM, like a browser would.
 * Unlike sendKey(), this goes through the DOM path where the vim extension
 * consumes handled keys — the path that broke keystroke counting in M5. */
const domKey = (key: string) => {
  const el = engine.view.contentDOM;
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
};

describe("engine port basics", () => {
  it("reset loads the initial buffer and returns to normal mode", () => {
    engine.reset("hello\nworld");
    expect(engine.currentBuffer()).toBe("hello\nworld");
    expect(engine.currentMode()).toBe("normal");
  });

  it("counts real DOM keystrokes even for keys vim consumes (R2 regression)", () => {
    engine.reset("hello world");
    const seen: string[] = [];
    engine.onKeystroke((k) => seen.push(k));
    // g and w are vim commands the extension handles; Escape is a no-op in
    // normal mode. All must be counted (this broke when counting via
    // domEventHandlers, which vim-handled keys never reached).
    for (const k of ["Escape", "g", "g", "0", "w", "d", "w"]) domKey(k);
    expect(seen).toEqual(["Escape", "g", "g", "0", "w", "d", "w"]);
  });

  it("counts keystrokes including Esc (R2)", () => {
    engine.reset("abc");
    const seen: string[] = [];
    engine.onKeystroke((k) => seen.push(k));
    keys(["i"]);
    engine.typeText("x");
    keys(["<Esc>"]);
    expect(seen).toEqual(["i", "x", "<Esc>"]);
  });

  it("notifies buffer changes for the clear judgment (R1)", () => {
    engine.reset("abc");
    const buffers: string[] = [];
    engine.onBufferChange((b) => buffers.push(b));
    keys(["x"]);
    expect(buffers).toEqual(["bc"]);
  });

  it("undo history cannot reach the previous exercise after reset", () => {
    engine.reset("first");
    keys(["x"]);
    expect(engine.currentBuffer()).toBe("irst");
    engine.reset("second");
    keys(["u"]);
    expect(engine.currentBuffer()).toBe("second");
  });
});

describe("stage 1: basic motions and mode switching", () => {
  // NOTE: j/k (and / search below) depend on DOM layout / the search dialog
  // and cannot be driven headlessly — they are browser-verification items in
  // docs/vim-coverage.md. Line jumps here use logical motions (2G, G, gg).
  it("w / 0 $ / gg G / 2G move the cursor (verified via edits)", () => {
    engine.reset("foo bar baz\nsecond line\nthird line");
    // Verify motions indirectly through an edit at the target position —
    // buffer content is what the port exposes.
    keys(["w", "x"]); // cursor to "bar", delete 'b'
    expect(engine.currentBuffer()).toBe("foo ar baz\nsecond line\nthird line");
    keys(["$", "x"]); // end of line, delete 'z'
    expect(engine.currentBuffer()).toBe("foo ar ba\nsecond line\nthird line");
    keys(["2", "G", "0", "x"]); // line 2, line start, delete 's'
    expect(engine.currentBuffer()).toBe("foo ar ba\necond line\nthird line");
    keys(["G", "x"]); // last line
    expect(engine.currentBuffer()).toBe("foo ar ba\necond line\nhird line");
    keys(["g", "g", "x"]); // back to first line
    expect(engine.currentBuffer()).toBe("oo ar ba\necond line\nhird line");
  });

  it("f/t jump within the line", () => {
    engine.reset("abcXdefXghi");
    keys(["f", "X", "x"]);
    expect(engine.currentBuffer()).toBe("abcdefXghi");
    keys(["0", "t", "X", "x"]); // t stops just before X
    expect(engine.currentBuffer()).toBe("abcdeXghi");
  });

  it("i/a enter insert mode, Esc returns to normal", () => {
    engine.reset("ab");
    keys(["a"]);
    expect(engine.currentMode()).toBe("insert");
    engine.typeText("X");
    keys(["<Esc>"]);
    expect(engine.currentMode()).toBe("normal");
    expect(engine.currentBuffer()).toBe("aXb");
  });

  it("o opens a line below and enters insert", () => {
    engine.reset("one\ntwo");
    keys(["o"]);
    engine.typeText("new");
    keys(["<Esc>"]);
    expect(engine.currentBuffer()).toBe("one\nnew\ntwo");
  });

  it("counts multiply motions and edits (3x, 2dd)", () => {
    engine.reset("abcdef\n1\n2\n3");
    keys(["3", "x"]);
    expect(engine.currentBuffer()).toBe("def\n1\n2\n3");
    keys(["2", "G", "2", "d", "d"]);
    expect(engine.currentBuffer()).toBe("def\n3");
  });
});

describe("stage 2: operators and text objects", () => {
  it("dw / dd / x delete", () => {
    engine.reset("foo bar\nsecond");
    keys(["d", "w"]);
    expect(engine.currentBuffer()).toBe("bar\nsecond");
    keys(["d", "d"]);
    expect(engine.currentBuffer()).toBe("second");
  });

  it("diw / ciw on inner word", () => {
    engine.reset("foo bar baz");
    keys(["w", "d", "i", "w"]);
    expect(engine.currentBuffer()).toBe("foo  baz");
    keys(["0", "c", "i", "w"]);
    expect(engine.currentMode()).toBe("insert");
    engine.typeText("qux");
    keys(["<Esc>"]);
    expect(engine.currentBuffer()).toBe("qux  baz");
  });

  it('di" / ci" on quoted strings', () => {
    engine.reset('say "hello world" end');
    keys(["f", '"', "d", "i", '"']);
    expect(engine.currentBuffer()).toBe('say "" end');
  });

  it("yy / p yank and paste linewise", () => {
    engine.reset("alpha\nbeta");
    keys(["y", "y", "p"]);
    expect(engine.currentBuffer()).toBe("alpha\nalpha\nbeta");
  });

  it("Y behaves like y$ (Neovim default, domain.md P9)", () => {
    engine.reset("abc def");
    keys(["w", "Y", "0", "p"]); // yank "def", paste after 'a'
    expect(engine.currentBuffer()).toBe("adefbc def");
  });

  it("the dot command repeats the last change", () => {
    engine.reset("aa bb cc");
    keys(["d", "w", "."]);
    expect(engine.currentBuffer()).toBe("cc");
  });

  it("visual mode selection with operator (viw + d)", () => {
    engine.reset("foo bar baz");
    keys(["w", "v", "i", "w"]);
    expect(engine.currentMode()).toBe("visual");
    keys(["d"]);
    expect(engine.currentBuffer()).toBe("foo  baz");
    expect(engine.currentMode()).toBe("normal");
  });
});

describe("stage 3: search and substitute", () => {
  // "/" and "n" go through the vim search dialog (a real DOM input) and
  // cannot be driven via Vim.handleKey — browser-verification items in
  // docs/vim-coverage.md. Regex behavior itself is covered by :s and :g.
  it(":s substitutes on the current line, :%s on all lines", () => {
    engine.reset("foo x\nfoo y");
    engine.sendEx("s/foo/bar/");
    expect(engine.currentBuffer()).toBe("bar x\nfoo y");
    engine.sendEx("%s/foo/baz/g");
    expect(engine.currentBuffer()).toBe("bar x\nbaz y");
  });

  it(":g runs a command on matching lines", () => {
    engine.reset("keep\nlog: a\nkeep2\nlog: b");
    engine.sendEx("g/^log/d");
    expect(engine.currentBuffer()).toBe("keep\nkeep2");
  });
});

describe("stage 4: registers", () => {
  it('named registers "ayy and "ap survive other yanks', () => {
    engine.reset("first\nsecond");
    keys(['"', "a", "y", "y"]); // yank "first" into register a
    keys(["j", "y", "y"]); // unnamed register now holds "second"
    keys(['"', "a", "p"]); // paste register a below "second"
    expect(engine.currentBuffer()).toBe("first\nsecond\nfirst");
  });
});
