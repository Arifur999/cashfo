import { describe, expect, it } from "vitest";
import { scrollFadeMask, scrollFadesOf } from "./useScrollFades";

const box = (scroll: number, size: number, shown: number) => ({ scrollTop: scroll, scrollLeft: scroll, scrollHeight: size, scrollWidth: size, clientHeight: shown, clientWidth: shown });

describe("scrollFadesOf", () => {
  it("says which ends have more beyond them, down or sideways", () => {
    expect(scrollFadesOf(box(0, 600, 300))).toEqual({ start: false, end: true });
    expect(scrollFadesOf(box(150, 600, 300), "x")).toEqual({ start: true, end: true });
    expect(scrollFadesOf(box(300, 600, 300), "x")).toEqual({ start: true, end: false });
  });

  it("reads only its own axis", () => {
    const wide = { scrollTop: 0, scrollLeft: 120, scrollHeight: 300, scrollWidth: 900, clientHeight: 300, clientWidth: 300 };
    expect(scrollFadesOf(wide, "y")).toEqual({ start: false, end: false });
    expect(scrollFadesOf(wide, "x")).toEqual({ start: true, end: true });
  });

  it("ignores a part-pixel scroll", () => {
    expect(scrollFadesOf(box(3, 600, 300))).toEqual({ start: false, end: true });
    expect(scrollFadesOf(box(297, 600, 300))).toEqual({ start: true, end: false });
    expect(scrollFadesOf(box(0, 302, 300))).toEqual({ start: false, end: false });
  });
});

describe("scrollFadeMask", () => {
  it("fades the bottom of a menu by 40px", () => {
    expect(scrollFadeMask({ start: false, end: true })).toBe("linear-gradient(to bottom, #000 0, #000 calc(100% - 40px), transparent 100%)");
    expect(scrollFadeMask({ start: true, end: false })).toBe("linear-gradient(to bottom, transparent 0, #000 40px, #000 100%)");
  });

  it("runs sideways for a bar, with its own reach", () => {
    expect(scrollFadeMask({ start: true, end: true }, "x", 32)).toBe("linear-gradient(to right, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)");
    expect(scrollFadeMask({ start: false, end: false }, "x")).toBe("linear-gradient(to right, #000 0, #000 100%)");
  });
});
