/**
 * Test-only jsdom stubs for CodeMirror: it measures text with APIs jsdom
 * doesn't implement. Zero-size boxes are fine because engine tests assert
 * document/mode state, not layout. Call from a vitest beforeAll.
 * (Shared by the three engine-backed test files — rule of three.)
 */
export function installCodeMirrorDomStubs(): void {
  const zeroRect = {
    x: 0,
    y: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  } as DOMRect;
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => zeroRect;
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
