import { describe, expect, it } from "vitest";
import type { ICampaign, INotificationTemplate } from "@/types/notification.types";
import { ANY_PLAN, ANY_STATUS } from "@/zod/notification.validation";
import { buildTemplateOptions, campaignToFormValues, describeAudience, droppedUserStatus, isPastDue, USER_STATUS_OPTIONS } from "./campaignOptions";

const planNames = new Map([["plan-1", "Monthly Pro"]]);

// The design's "Who gets it": "Free plan, active", "Everyone active".
describe("describeAudience", () => {
  it("reads naturally for every combination", () => {
    expect(describeAudience({}, planNames)).toBe("Everyone");
    expect(describeAudience({ status: "ACTIVE" }, planNames)).toBe("Everyone active");
    expect(describeAudience({ planId: "plan-1" }, planNames)).toBe("Monthly Pro plan");
    // An old campaign's status still reads, though new ones can't pick it.
    expect(describeAudience({ planId: "plan-1", status: "PENDING_DELETION" }, planNames)).toBe("Monthly Pro plan, pending deletion");
  });

  it("copes with a plan that no longer exists", () => {
    expect(describeAudience({ planId: "gone" }, planNames)).toBe("A removed plan");
    expect(describeAudience({ planId: "gone", status: "ACTIVE" }, planNames)).toBe("A removed plan, active");
  });
});

describe("USER_STATUS_OPTIONS", () => {
  it("offers only the statuses a customer account can have", () => {
    expect(USER_STATUS_OPTIONS.map((option) => option.value)).toEqual([ANY_STATUS, "ACTIVE", "SUSPENDED"]);
  });
});

describe("buildTemplateOptions", () => {
  it("offers active templates only", () => {
    const templates = [
      { key: "welcome", isActive: true },
      { key: "legacy_promo", isActive: false },
    ] as INotificationTemplate[];
    expect(buildTemplateOptions(templates)).toEqual([{ value: "welcome", label: "welcome" }]);
  });
});

const campaign = (extra: Partial<ICampaign> = {}): ICampaign => ({
  id: "c1",
  title: "Puja offer",
  templateKey: "promo_offer",
  targetFilter: {},
  channel: "EMAIL",
  status: "SCHEDULED",
  scheduledFor: "2026-10-20T04:00:00.000Z",
  sentCount: 0,
  failedCount: 0,
  audienceCount: 12,
  createdBy: "a1",
  createdAt: "2026-10-19T04:00:00.000Z",
  ...extra,
});

describe("isPastDue", () => {
  const now = new Date("2026-10-21T04:00:00.000Z");

  it("flags a scheduled campaign whose time has passed", () => {
    expect(isPastDue(campaign(), now)).toBe(true);
    expect(isPastDue(campaign({ scheduledFor: "2026-10-22T04:00:00.000Z" }), now)).toBe(false);
  });

  it("leaves everything else alone", () => {
    expect(isPastDue(campaign({ status: "SENT" }), now)).toBe(false);
    expect(isPastDue(campaign({ status: "DRAFT", scheduledFor: null }), now)).toBe(false);
  });
});

describe("campaignToFormValues", () => {
  const templates = [{ key: "promo_offer", isActive: true }, { key: "old_promo", isActive: false }] as INotificationTemplate[];

  it("starts a new campaign from a draft, with no time picked", () => {
    expect(campaignToFormValues(campaign({ status: "DRAFT", scheduledFor: null, channel: "SMS", targetFilter: { planId: "plan-1", status: "SUSPENDED" } }), templates)).toEqual({
      title: "Puja offer",
      templateKey: "promo_offer",
      channel: "SMS",
      planId: "plan-1",
      userStatus: "SUSPENDED",
      scheduledFor: "",
    });
  });

  it("drops a status the form no longer offers, and says which", () => {
    const draft = campaign({ targetFilter: { status: "BANNED" } });
    const values = campaignToFormValues(draft, templates);
    expect(values.userStatus).toBe(ANY_STATUS);
    expect(values.planId).toBe(ANY_PLAN);
    expect(droppedUserStatus(draft)).toBe("BANNED");
    expect(droppedUserStatus(campaign({ targetFilter: { status: "PENDING_DELETION" } }))).toBe("PENDING_DELETION");
    expect(droppedUserStatus(campaign({ targetFilter: { status: "ACTIVE" } }))).toBeNull();
    expect(droppedUserStatus(campaign({ targetFilter: {} }))).toBeNull();
  });

  // The Message select lists active templates only, so a switched-off one
  // would be sent unseen.
  it("leaves the message unpicked when its template is off or gone", () => {
    expect(campaignToFormValues(campaign({ templateKey: "old_promo" }), templates).templateKey).toBe("");
    expect(campaignToFormValues(campaign({ templateKey: "deleted" }), templates).templateKey).toBe("");
    expect(campaignToFormValues(campaign(), templates).templateKey).toBe("promo_offer");
  });
});
