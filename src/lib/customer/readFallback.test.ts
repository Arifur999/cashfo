import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it, vi } from "vitest";
import { emptyUnlessOutage } from "./readFallback";

const answered = (status: number) =>
  new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    data: {},
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe("emptyUnlessOutage", () => {
  it("reads 'nothing here for you' as empty", () => {
    expect(emptyUnlessOutage(answered(404), [])).toEqual([]);
    expect(emptyUnlessOutage(answered(403), null)).toBeNull();
    expect(emptyUnlessOutage(answered(401), { total: 0 })).toEqual({ total: 0 });
    expect(emptyUnlessOutage(answered(400), [])).toEqual([]);
  });

  it("throws an outage so the page can say so", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => emptyUnlessOutage(answered(500), [])).toThrow();
    expect(() => emptyUnlessOutage(answered(503), [])).toThrow();
    expect(() => emptyUnlessOutage(answered(429), [])).toThrow();
    expect(() => emptyUnlessOutage(answered(408), [])).toThrow();
    expect(() => emptyUnlessOutage(new AxiosError("connect ECONNREFUSED"), [])).toThrow();
    expect(() => emptyUnlessOutage(new Error("boom"), [])).toThrow("boom");
  });
});
