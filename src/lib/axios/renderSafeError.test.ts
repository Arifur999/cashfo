import { inspect } from "node:util";
import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { toRenderSafeError } from "./renderSafeError";

const config = {
  method: "get",
  url: "http://smartly-api:5000/api/businesses/biz-1/accounts?search=rent",
  headers: new AxiosHeaders({ Authorization: "Bearer eyJ.secret.token" }),
} as InternalAxiosRequestConfig;

describe("toRenderSafeError", () => {
  it("names the request and its outcome, without the token", () => {
    const failed = new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, { _header: "Authorization: Bearer eyJ.secret.token" }, {
      status: 503,
      data: {},
      statusText: "",
      headers: {},
      config,
    } as AxiosResponse);
    const safe = toRenderSafeError(failed);
    expect(safe.message).toBe("API request failed: GET /api/businesses/biz-1/accounts -> 503");
    expect(inspect(safe, { depth: 10 })).not.toContain("Bearer");
  });

  it("says when nothing answered", () => {
    expect(toRenderSafeError(new AxiosError("connect ECONNREFUSED", "ECONNREFUSED", config)).message).toBe(
      "API request failed: GET /api/businesses/biz-1/accounts -> ECONNREFUSED",
    );
  });

  it("passes other errors through", () => {
    const plain = new Error("boom");
    expect(toRenderSafeError(plain)).toBe(plain);
    expect(toRenderSafeError("text").message).toBe("text");
  });
});
