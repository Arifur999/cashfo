import { describe, expect, it } from "vitest";
import { greetingFor, homeDateLine, hourIn } from "./greeting";

describe("greetingFor", () => {
  it("follows the time of day", () => {
    expect(greetingFor(0)).toBe("Good morning");
    expect(greetingFor(11)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(17)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    expect(greetingFor(23)).toBe("Good evening");
  });
});

describe("hourIn", () => {
  it("reads the hour in the platform's zone, not the machine's", () => {
    // 2026-10-02 10:30 UTC is 16:30 in Dhaka.
    expect(hourIn("Asia/Dhaka", new Date("2026-10-02T10:30:00Z"))).toBe(16);
    expect(hourIn("Asia/Dhaka", new Date("2026-10-02T18:30:00Z"))).toBe(0);
  });
});

describe("homeDateLine", () => {
  it("writes the Gregorian and Hijri dates in English", () => {
    const line = homeDateLine(new Date("2026-10-02T06:00:00Z"), "en", "Asia/Dhaka");
    expect(line.startsWith("Friday 2 October")).toBe(true);
    expect(line).toMatch(/· \d{1,2} .+ 1448$/);
  });

  it("writes them in Bangla for a Bangla reader", () => {
    const line = homeDateLine(new Date("2026-10-02T06:00:00Z"), "bn", "Asia/Dhaka");
    expect(line).toContain("শুক্রবার");
    expect(line).toContain("·");
  });
});
