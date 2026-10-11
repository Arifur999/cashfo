import { describe, expect, it } from "vitest";
import {
  ANY_PLAN,
  ANY_STATUS,
  campaignServerZodSchema,
  getScheduleInPastError,
  notificationTemplateServerZodSchema,
} from "./notification.validation";

describe("notificationTemplateServerZodSchema", () => {
  const values = { subjectEn: " Welcome ", subjectBn: "স্বাগতম", bodyEn: " Hi {{userName}} ", bodyBn: "হাই {{userName}}" };

  it("keeps subjects for email templates", () => {
    const result = notificationTemplateServerZodSchema.safeParse({ ...values, isEmail: true });
    expect(result.success && result.data).toEqual({ subjectEn: "Welcome", subjectBn: "স্বাগতম", bodyEn: "Hi {{userName}}", bodyBn: "হাই {{userName}}" });
  });

  it("leaves subjects out for other channels", () => {
    const result = notificationTemplateServerZodSchema.safeParse({ ...values, isEmail: false });
    expect(result.success && result.data).toEqual({ bodyEn: "Hi {{userName}}", bodyBn: "হাই {{userName}}" });
  });

  it("requires both bodies", () => {
    expect(notificationTemplateServerZodSchema.safeParse({ ...values, bodyBn: " ", isEmail: true }).success).toBe(false);
  });
});

describe("campaignServerZodSchema", () => {
  const base = { title: "Eid offer", templateKey: "feature_announcement", channel: "IN_APP_PUSH", planId: ANY_PLAN, userStatus: ANY_STATUS, scheduledFor: "" };

  it("sends an unrestricted draft with an empty target filter", () => {
    const result = campaignServerZodSchema.safeParse(base);
    expect(result.success && result.data).toEqual({ title: "Eid offer", templateKey: "feature_announcement", channel: "IN_APP_PUSH", targetFilter: {} });
  });

  it("targets a plan and status and converts the schedule to UTC", () => {
    const result = campaignServerZodSchema.safeParse({ ...base, planId: "plan-1", userStatus: "ACTIVE", scheduledFor: "2099-03-01T09:00" });
    expect(result.success && result.data).toEqual({
      title: "Eid offer",
      templateKey: "feature_announcement",
      channel: "IN_APP_PUSH",
      targetFilter: { planId: "plan-1", status: "ACTIVE" },
      scheduledFor: "2099-03-01T03:00:00.000Z",
    });
  });

  it("rejects a schedule in the past and an unknown status", () => {
    expect(campaignServerZodSchema.safeParse({ ...base, scheduledFor: "2020-01-01T09:00" }).success).toBe(false);
    expect(campaignServerZodSchema.safeParse({ ...base, userStatus: "VIP" }).success).toBe(false);
  });
});

describe("getScheduleInPastError", () => {
  it("compares against the given clock", () => {
    const now = new Date("2026-10-11T03:00:00.000Z").getTime();
    expect(getScheduleInPastError("2026-10-11T09:00", now)).toBe("Pick a time in the future");
    expect(getScheduleInPastError("2026-10-11T09:01", now)).toBeUndefined();
    expect(getScheduleInPastError("", now)).toBeUndefined();
  });
});
