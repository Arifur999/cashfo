import { describe, expect, it } from "vitest";
import { pickActiveBusiness } from "./activeBusiness";
import type { UserBusiness } from "./api";

const workspace = (id: string, overrides: Partial<UserBusiness> = {}): UserBusiness => ({
  id,
  name: id,
  type: "BUSINESS",
  currency: "BDT",
  role: "OWNER",
  isDefault: false,
  hasPinLock: false,
  trialEndsAt: null,
  ...overrides,
});

const personal = workspace("personal", { name: "Personal", type: "PERSONAL", isDefault: true });
const shop = workspace("shop", { name: "Rahim Store" });
const office = workspace("office", { name: "Office", role: "STAFF" });
const mess = workspace("mess", { name: "Mess", type: "GROUP" });
const all = [mess, shop, personal, office];

describe("pickActiveBusiness", () => {
  it("opens the stored workspace when the account still belongs to it", () => {
    expect(pickActiveBusiness(all, "shop")).toEqual({ business: shop, remembered: true });
    expect(pickActiveBusiness(all, "office")).toEqual({ business: office, remembered: true });
    expect(pickActiveBusiness(all, "personal")).toEqual({ business: personal, remembered: true });
  });

  it("falls back to the personal workspace when nothing was chosen", () => {
    expect(pickActiveBusiness(all, undefined)).toEqual({ business: personal, remembered: false });
    expect(pickActiveBusiness(all, null)).toEqual({ business: personal, remembered: false });
    expect(pickActiveBusiness(all, "")).toEqual({ business: personal, remembered: false });
  });

  it("never opens a group, even when the cookie names one", () => {
    expect(pickActiveBusiness(all, "mess")).toEqual({ business: personal, remembered: false });
  });

  it("ignores an id the account doesn't belong to (tampered, deleted or left)", () => {
    expect(pickActiveBusiness(all, "someone-elses-shop")).toEqual({ business: personal, remembered: false });
    expect(pickActiveBusiness([mess, personal, office], "shop")).toEqual({ business: personal, remembered: false });
    expect(pickActiveBusiness(all, "SHOP")).toEqual({ business: personal, remembered: false });
  });

  it("takes the first workspace when there is no personal one", () => {
    expect(pickActiveBusiness([mess, office, shop], "gone")).toEqual({ business: office, remembered: false });
  });

  it("opens nothing when only groups are left", () => {
    expect(pickActiveBusiness([mess], "mess")).toEqual({ business: null, remembered: false });
    expect(pickActiveBusiness([], "shop")).toEqual({ business: null, remembered: false });
  });
});
