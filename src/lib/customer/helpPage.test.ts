import { describe, expect, it } from "vitest";
import { officeDays, officeState, searchVideos, telHref, whatsappHref, type HelpVideo } from "./helpPage";

const hours = { openDays: ["sat", "sun", "mon", "tue", "wed", "thu"] as const, opensAt: "09:00", closesAt: "18:00" };

describe("the office card", () => {
  it("is open in the hours of an office day", () => {
    expect(officeState({ ...hours, openDays: [...hours.openDays] }, { day: 6, minutes: 10 * 60 })).toEqual({ open: true, closesAt: "18:00" });
  });

  it("says when it opens next: later today, tomorrow or another day", () => {
    const company = { ...hours, openDays: [...hours.openDays] };
    expect(officeState(company, { day: 0, minutes: 2 * 60 })).toMatchObject({ open: false, opensDay: "sun", today: true });
    expect(officeState(company, { day: 0, minutes: 19 * 60 })).toMatchObject({ open: false, opensDay: "mon", tomorrow: true });
    expect(officeState(company, { day: 5, minutes: 12 * 60 })).toMatchObject({ open: false, opensDay: "sat", tomorrow: true });
    expect(officeState({ ...company, openDays: [] }, { day: 5, minutes: 0 })).toMatchObject({ open: false, opensDay: null });
  });

  it("groups the office days into runs, Saturday first", () => {
    expect(officeDays(["sat", "sun", "mon", "tue", "wed", "thu"])).toEqual([["sat", "sun", "mon", "tue", "wed", "thu"]]);
    expect(officeDays(["sun", "tue", "wed"])).toEqual([["sun"], ["tue", "wed"]]);
  });

  it("makes call and chat links from a typed number", () => {
    expect(telHref("+880 9612-345678")).toBe("tel:+8809612345678");
    expect(whatsappHref("+880 1711-234567")).toBe("https://wa.me/8801711234567");
  });
});

describe("searchVideos", () => {
  const video: HelpVideo = { id: "1", titleEn: "Plan a monthly budget", titleBn: "মাসিক বাজেট", category: "INCOME_EXPENSE", minutes: 5, youtubeId: "x", shown: true, position: 0 };
  it("finds a guide by its title in either language or its category", () => {
    const label = () => "Income & Expense";
    expect(searchVideos([video], "budget", false, label)).toHaveLength(1);
    expect(searchVideos([video], "বাজেট", true, label)).toHaveLength(1);
    expect(searchVideos([video], "income", false, label)).toHaveLength(1);
    expect(searchVideos([video], "loan", false, label)).toHaveLength(0);
  });
});

describe("youtubeIdOf", () => {
  it("reads a YouTube link in any of its shapes", async () => {
    const { youtubeIdOf } = await import("./helpPage");
    const id = "dQw4w9WgXcQ";
    expect(["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", id].map(youtubeIdOf)).toEqual([id, id, id, id]);
    expect(["https://vimeo.com/123", "not a link"].map(youtubeIdOf)).toEqual([null, null]);
  });
});
