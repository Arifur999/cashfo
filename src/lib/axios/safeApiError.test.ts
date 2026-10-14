import { AxiosError, AxiosHeaders, isAxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { toSafeApiError } from "./safeApiError";

describe("toSafeApiError", () => {
  const config = {
    method: "get",
    url: "http://localhost:5000/admin/users?search=rahim",
    headers: new AxiosHeaders({ Authorization: "Bearer secret-token", Cookie: "refreshToken=abc" }),
  };
  const failure = new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
    status: 403,
    statusText: "Forbidden",
    data: { message: "Forbidden resource" },
    headers: {},
    config,
  });

  it("keeps the status and the API's answer, so callers read it as before", () => {
    const safe = toSafeApiError(failure);
    expect(isAxiosError(safe)).toBe(true);
    if (!isAxiosError(safe)) return;
    expect(safe.response?.status).toBe(403);
    expect(safe.response?.data).toEqual({ message: "Forbidden resource" });
    expect(safe.message).toBe("API request failed: GET /admin/users -> 403");
  });

  it("drops the request headers and the query string", () => {
    const serialized = JSON.stringify(toSafeApiError(failure));
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("refreshToken");
    expect(serialized).not.toContain("rahim");
  });

  it("leaves anything else alone", () => {
    const plain = new Error("boom");
    expect(toSafeApiError(plain)).toBe(plain);
  });
});
