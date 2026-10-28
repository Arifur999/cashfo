import { describe, expect, it } from "vitest";
import { encodeQr, qrPath } from "./qr";

// The finder pattern in a corner: a 7x7 ring round a 3x3 core.
const finderAt = (modules: boolean[][], x: number, y: number) =>
  Array.from({ length: 7 }, (_, dy) => Array.from({ length: 7 }, (_, dx) => modules[y + dy][x + dx]))
    .map((row) => row.map((dark) => (dark ? "#" : ".")).join(""))
    .join("\n");

const FINDER = ["#######", "#.....#", "#.###.#", "#.###.#", "#.###.#", "#.....#", "#######"].join("\n");

describe("encodeQr", () => {
  // Checked against a decoder (jsQR) while it was written: these decode back.
  it("picks the smallest version that holds the text", () => {
    expect(encodeQr("hi")?.length).toBe(21);
    expect(encodeQr("https://smartly.softech.agency/register?ref=9AAD7001")?.length).toBe(33);
    expect(encodeQr("x".repeat(100))?.length).toBe(41);
  });

  it("draws the three finder patterns and the dark module", () => {
    const modules = encodeQr("https://smartly.softech.agency/register?ref=9AAD7001") as boolean[][];
    const size = modules.length;
    expect(finderAt(modules, 0, 0)).toBe(FINDER);
    expect(finderAt(modules, size - 7, 0)).toBe(FINDER);
    expect(finderAt(modules, 0, size - 7)).toBe(FINDER);
    expect(modules[size - 8][8]).toBe(true);
  });

  it("is the same every time", () => {
    expect(encodeQr("9AAD7001")).toEqual(encodeQr("9AAD7001"));
  });

  it("gives up on text too long for version 10", () => {
    expect(encodeQr("a".repeat(300))).toBeNull();
  });

  it("draws one square per dark module, inside the quiet zone", () => {
    const path = qrPath([
      [true, false],
      [false, true],
    ]);
    expect(path).toBe("M4 4h1v1h-1zM5 5h1v1h-1z");
  });
});
