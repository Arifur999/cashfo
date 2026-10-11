import { describe, expect, it } from "vitest";
import { createAdminServerZodSchema, updateAdminServerZodSchema } from "./adminAccount.validation";

describe("createAdminServerZodSchema", () => {
  it("trims the name and normalises the email", () => {
    const result = createAdminServerZodSchema.safeParse({ name: "  Rina Akter ", email: " Rina@Example.COM ", role: "SUPPORT_ADMIN" });
    expect(result.success && result.data).toEqual({ name: "Rina Akter", email: "rina@example.com", role: "SUPPORT_ADMIN" });
  });

  it("rejects a malformed email", () => {
    expect(createAdminServerZodSchema.safeParse({ name: "Rina", email: "rina@", role: "SUPPORT_ADMIN" }).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(createAdminServerZodSchema.safeParse({ name: "Rina", email: "rina@example.com", role: "OWNER" }).success).toBe(false);
  });
});

describe("updateAdminServerZodSchema", () => {
  it("requires a name", () => {
    expect(updateAdminServerZodSchema.safeParse({ name: " ", role: "FINANCE_ADMIN" }).success).toBe(false);
  });
});
