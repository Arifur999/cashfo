import { describe, expect, it } from "vitest";
import type { IErrorLog } from "@/types/system.types";
import { errorDigest, errorOriginLabel, groupBoardErrors, isCustomerAppError } from "./errorOrigin";

const log = (id: string, createdAt: string, overrides: Partial<IErrorLog> = {}): IErrorLog => ({
  id,
  source: "ADMIN_FRONTEND",
  message: "Something broke",
  stackTrace: null,
  severity: "MEDIUM",
  metadata: null,
  resolved: false,
  resolvedBy: null,
  resolvedAt: null,
  createdAt,
  ...overrides,
});

const customer = { app: "customer", digest: "2338712345" };

describe("errorOriginLabel", () => {
  it("names the customer app's reports, which share the admin panel's source", () => {
    expect(errorOriginLabel(log("a", "2026-10-14T08:00:00Z", { metadata: customer }))).toBe("Customer app");
    expect(errorOriginLabel(log("b", "2026-10-14T08:00:00Z"))).toBe("Admin panel");
    expect(errorOriginLabel(log("c", "2026-10-14T08:00:00Z", { source: "BACKEND_API", metadata: { path: "/api/x" } }))).toBe("Server");
  });

  it("only takes metadata.app = customer as the customer app", () => {
    expect(isCustomerAppError(log("a", "2026-10-14T08:00:00Z", { metadata: { app: "admin" } }))).toBe(false);
    expect(isCustomerAppError(log("b", "2026-10-14T08:00:00Z", { metadata: customer }))).toBe(true);
  });
});

describe("errorDigest", () => {
  it("reads the reference the error screen showed", () => {
    expect(errorDigest(log("a", "2026-10-14T08:00:00Z", { metadata: customer }))).toBe("2338712345");
  });

  it("is null without one", () => {
    expect(errorDigest(log("a", "2026-10-14T08:00:00Z"))).toBeNull();
    expect(errorDigest(log("b", "2026-10-14T08:00:00Z", { metadata: { digest: "  " } }))).toBeNull();
    expect(errorDigest(log("c", "2026-10-14T08:00:00Z", { metadata: { digest: 42 } }))).toBeNull();
  });
});

describe("groupBoardErrors", () => {
  it("keeps the customer app's reports apart from the admin panel's with the same message", () => {
    const groups = groupBoardErrors([
      log("1", "2026-10-14T09:00:00Z", { metadata: customer }),
      log("2", "2026-10-14T08:00:00Z"),
      log("3", "2026-10-14T07:00:00Z", { metadata: customer }),
    ]);
    expect(groups.map((group) => group.logs.map((item) => item.id))).toEqual([["1", "3"], ["2"]]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(2);
    expect(groups[0].key.startsWith("customer:")).toBe(true);
  });

  it("orders the groups by when each was last seen, newest first", () => {
    const groups = groupBoardErrors([
      log("1", "2026-10-14T09:00:00Z", { message: "Panel" }),
      log("2", "2026-10-14T08:00:00Z", { message: "App", metadata: customer }),
      log("3", "2026-10-14T07:00:00Z", { message: "Server", source: "BACKEND_API" }),
    ]);
    expect(groups.map((group) => group.message)).toEqual(["Panel", "App", "Server"]);
  });

  it("groups as before when no report came from the customer app", () => {
    const groups = groupBoardErrors([log("1", "2026-10-14T09:00:00Z"), log("2", "2026-10-14T08:00:00Z")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("ADMIN_FRONTEND:Something broke");
  });
});
