import { describe, expect, it } from "vitest";
import { greetingFor, greetingName, homeDates, hourIn } from "./greeting";

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

describe("greetingName", () => {
  it("greets by the first name", () => {
    expect(greetingName("Arifur Rahman")).toBe("Arifur");
    expect(greetingName("  Tanvir   Ahmed ")).toBe("Tanvir");
    expect(greetingName("Nusrat")).toBe("Nusrat");
  });

  it("skips the titles a name opens with, with or without the dot", () => {
    expect(greetingName("Md. Arifur Rahman")).toBe("Arifur");
    expect(greetingName("Md Arifur Rahman")).toBe("Arifur");
    expect(greetingName("MD. ARIFUR RAHMAN")).toBe("ARIFUR");
    expect(greetingName("Mst. Nasrin Akter")).toBe("Nasrin");
    expect(greetingName("Mohd Karim")).toBe("Karim");
    expect(greetingName("Dr. Kamal Hossain")).toBe("Kamal");
    expect(greetingName("Engr. Rakib Hasan")).toBe("Rakib");
    expect(greetingName("Mrs Salma Begum")).toBe("Salma");
    expect(greetingName("A. K. M. Fazlul Haque")).toBe("Fazlul");
  });

  it("skips the Bangla titles too", () => {
    expect(greetingName("মোঃ আরিফুর রহমান")).toBe("আরিফুর");
    expect(greetingName("মোছাঃ নাসরিন আক্তার")).toBe("নাসরিন");
    expect(greetingName("ডাঃ কামাল হোসেন")).toBe("কামাল");
  });

  it("keeps a name that is all titles, and an empty one", () => {
    expect(greetingName("Md.")).toBe("Md.");
    expect(greetingName("Dr. Md.")).toBe("Dr. Md.");
    expect(greetingName("")).toBe("");
  });

  it("keeps a given name that only looks like a title", () => {
    expect(greetingName("Mohammad Ali")).toBe("Mohammad");
    expect(greetingName("Mridul Das")).toBe("Mridul");
  });
});

describe("hourIn", () => {
  it("reads the hour in the platform's zone, not the machine's", () => {
    // 2026-10-02 10:30 UTC is 16:30 in Dhaka.
    expect(hourIn("Asia/Dhaka", new Date("2026-10-02T10:30:00Z"))).toBe(16);
    expect(hourIn("Asia/Dhaka", new Date("2026-10-02T18:30:00Z"))).toBe(0);
  });
});

describe("homeDates", () => {
  it("writes the Gregorian and Hijri dates in English", () => {
    const { day, hijri } = homeDates(new Date("2026-10-02T06:00:00Z"), "en", "Asia/Dhaka");
    expect(day).toBe("Friday, 2 October");
    expect(hijri).toMatch(/^[0-9]{1,2} .+ 1448$/);
  });

  it("writes them in Bangla for a Bangla reader", () => {
    const { day, hijri } = homeDates(new Date("2026-10-02T06:00:00Z"), "bn", "Asia/Dhaka");
    expect(day).toBe("শুক্রবার, ২ অক্টোবর");
    expect(hijri).toMatch(/১৪৪৮$/);
  });

  it("takes the day in the platform's zone", () => {
    // 20:00 UTC on the 1st is already the 2nd in Dhaka.
    expect(homeDates(new Date("2026-10-01T20:00:00Z"), "en", "Asia/Dhaka").day).toBe("Friday, 2 October");
  });
});
