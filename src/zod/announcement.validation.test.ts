import { describe, expect, it } from "vitest";
import { ALL_PLANS, announcementServerZodSchema, getScheduleError } from "./announcement.validation";

const validValues = {
  title: "Scheduled maintenance",
  titleBn: "",
  body: "The app will be read-only for an hour.",
  bodyBn: "",
  type: "MAINTENANCE",
  targetPlan: ALL_PLANS,
  startAt: "2026-10-20T01:00",
  endAt: "2026-10-20T02:00",
};

describe("announcementServerZodSchema", () => {
  it("converts Dhaka times to UTC and blanks to null", () => {
    const result = announcementServerZodSchema.safeParse(validValues);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Scheduled maintenance",
        titleBn: null,
        body: "The app will be read-only for an hour.",
        bodyBn: null,
        type: "MAINTENANCE",
        targetPlan: null,
        startAt: "2026-10-19T19:00:00.000Z",
        endAt: "2026-10-19T20:00:00.000Z",
      });
    }
  });

  it("keeps a target plan and allows an open end", () => {
    const result = announcementServerZodSchema.safeParse({ ...validValues, targetPlan: "plan-1", endAt: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetPlan).toBe("plan-1");
      expect(result.data.endAt).toBeNull();
    }
  });

  it("rejects an end at or before the start", () => {
    const result = announcementServerZodSchema.safeParse({ ...validValues, endAt: "2026-10-20T01:00" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["endAt"]);
    }
  });

  it("requires a start time", () => {
    expect(announcementServerZodSchema.safeParse({ ...validValues, startAt: "" }).success).toBe(false);
  });
});

describe("getScheduleError", () => {
  it("only complains when both ends are set and out of order", () => {
    expect(getScheduleError("2026-10-20T01:00", "")).toBeUndefined();
    expect(getScheduleError("2026-10-20T01:00", "2026-10-20T01:30")).toBeUndefined();
    expect(getScheduleError("2026-10-20T01:00", "2026-10-19T23:00")).toBe("Must be after the start");
  });
});
