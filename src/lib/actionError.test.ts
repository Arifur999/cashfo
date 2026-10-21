import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { toSafeApiError } from "./axios/safeApiError";
import { getActionErrorMessage, retryAfterSeconds, toActionError, TOO_MANY_ATTEMPTS_MESSAGE } from "./actionError";

const answered = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
    statusText: "",
    headers: new AxiosHeaders(headers),
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

const THROTTLED = { message: "ThrottlerException: Too Many Requests" };

describe("getActionErrorMessage", () => {
  it("passes the API's own message through", () => {
    expect(getActionErrorMessage(answered(401, { message: "Invalid email or password" }), "fallback")).toBe("Invalid email or password");
  });

  it("joins class-validator messages", () => {
    expect(getActionErrorMessage(answered(400, { message: ["email must be an email", "name is empty"] }), "fallback")).toBe(
      "email must be an email, name is empty",
    );
  });

  it("puts the throttler's answer in plain words", () => {
    expect(getActionErrorMessage(answered(429, THROTTLED), "fallback")).toBe(TOO_MANY_ATTEMPTS_MESSAGE);
  });

  it("says when the backend never answered", () => {
    expect(getActionErrorMessage(new AxiosError("connect ECONNREFUSED"), "fallback")).toBe("Unable to reach the server. Please try again.");
  });

  it("falls back when there is nothing better", () => {
    expect(getActionErrorMessage(answered(500, {}), "Something went wrong")).toBe("Something went wrong");
  });
});

describe("toActionError", () => {
  it("says how long to wait when the throttler names it", () => {
    expect(toActionError(answered(429, THROTTLED, { "Retry-After": "45" }), "fallback")).toEqual({ success: false, message: "Too many attempts. Try again in a minute." });
    expect(toActionError(answered(429, THROTTLED, { "Retry-After": "60" }), "fallback")).toEqual({ success: false, message: "Too many attempts. Try again in a minute." });
    // The minutes are left for the reader to fill in, in their own digits.
    expect(toActionError(answered(429, THROTTLED, { "Retry-After": "61" }), "fallback")).toEqual({
      success: false,
      message: "Too many attempts. Try again in {minutes} minutes.",
      values: { minutes: 2 },
    });
    expect(toActionError(answered(429, THROTTLED, { "Retry-After-perIp": "840" }), "fallback")).toMatchObject({ values: { minutes: 14 } });
  });

  it("gives the longest sign-in limit when the answer names no wait", () => {
    expect(toActionError(answered(429, THROTTLED), "fallback")).toEqual({ success: false, message: "Too many attempts. Wait up to 15 minutes, then try again." });
  });

  it("keeps the general words when the headers didn't come along", () => {
    expect(toActionError(toSafeApiError(answered(429, THROTTLED, { "Retry-After": "120" })), "fallback")).toEqual({ success: false, message: TOO_MANY_ATTEMPTS_MESSAGE });
  });

  it("answers anything else with the message alone", () => {
    expect(toActionError(answered(409, { message: "Another plan already uses this slug" }), "fallback")).toEqual({ success: false, message: "Another plan already uses this slug" });
    expect(toActionError(new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED"), "fallback")).toEqual({ success: false, message: "Unable to reach the server. Please try again." });
  });
});

describe("retryAfterSeconds", () => {
  it("reads whole seconds and ignores anything else", () => {
    expect(retryAfterSeconds(new AxiosHeaders({ "retry-after": "900" }))).toBe(900);
    expect(retryAfterSeconds({ "Retry-After": " 30 " })).toBe(30);
    expect(retryAfterSeconds({ "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" })).toBeNull();
    expect(retryAfterSeconds({ "x-ratelimit-reset": "900" })).toBeNull();
    expect(retryAfterSeconds(undefined)).toBeNull();
  });

  it("takes the longest of several throttlers", () => {
    expect(retryAfterSeconds({ "retry-after": "60", "retry-after-perip": "300" })).toBe(300);
  });
});
