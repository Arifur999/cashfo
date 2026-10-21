import { describe, expect, it } from "vitest";
import type { IAccountTemplate } from "@/types/accountTemplate.types";
import { getNewAccountTemplateDefaults, toAccountTemplateFormValues, toAccountTemplateSubmitValues } from "./accountTemplateForm.defaults";
import { accountKindLabel, buildSubtypeOptions, isReservedSubtype, NO_SUBTYPE } from "./accountTemplateOptions";

const template = (extra: Partial<IAccountTemplate> = {}) =>
  ({ id: "t1", name: "Cash", nameBn: "নগদ", accountType: "ASSET", accountSubtype: "cash", parentId: null, appliesTo: ["PERSONAL"], displayOrder: 1, isActive: true, children: [], ...extra }) as IAccountTemplate;

describe("buildSubtypeOptions", () => {
  it("offers no subtype, then the subtypes a template may take, savings among them", () => {
    const values = buildSubtypeOptions(NO_SUBTYPE).map((option) => option.value);
    expect(values).toEqual([NO_SUBTYPE, "cash", "bank", "mfs", "card", "savings", "loan"]);
  });

  // The API refuses the app's own subtypes on any other template.
  it("offers receivable or payable only on the template that has it", () => {
    expect(buildSubtypeOptions("cash").map((option) => option.value)).not.toContain("receivable");
    expect(buildSubtypeOptions("receivable").map((option) => option.value)).toContain("receivable");
    expect(buildSubtypeOptions("receivable").map((option) => option.value)).not.toContain("payable");
    expect(isReservedSubtype("payable")).toBe(true);
    expect(isReservedSubtype("savings")).toBe(false);
    expect(isReservedSubtype(null)).toBe(false);
  });

  it("keeps a hand-typed subtype pickable while editing it", () => {
    const options = buildSubtypeOptions("wallet");
    expect(options.at(-1)).toEqual({ value: "wallet", label: "Wallet" });
    expect(buildSubtypeOptions("bank")).toHaveLength(7);
  });
});

describe("the subtype in the form", () => {
  it("reads a missing subtype as the picker's none, and saves it as none at all", () => {
    expect(toAccountTemplateFormValues(template({ accountSubtype: null })).accountSubtype).toBe(NO_SUBTYPE);
    expect(getNewAccountTemplateDefaults().accountSubtype).toBe(NO_SUBTYPE);
    expect(toAccountTemplateSubmitValues(getNewAccountTemplateDefaults()).accountSubtype).toBe("");
    expect(toAccountTemplateSubmitValues(toAccountTemplateFormValues(template())).accountSubtype).toBe("cash");
  });
});

describe("accountKindLabel", () => {
  it("names a leaf's kind, and nothing for a group", () => {
    expect(accountKindLabel(template({ accountSubtype: "mfs" }))).toBe("Mobile wallet");
    expect(accountKindLabel(template({ children: [template()] }))).toBe("");
  });
});
