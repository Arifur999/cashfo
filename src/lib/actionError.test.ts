import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { getActionErrorMessage, TOO_MANY_ATTEMPTS_MESSAGE } from "./actionError";

const answered = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

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
    expect(getActionErrorMessage(answered(429, { message: "ThrottlerException: Too Many Requests" }), "fallback")).toBe(TOO_MANY_ATTEMPTS_MESSAGE);
  });

  it("says when the backend never answered", () => {
    expect(getActionErrorMessage(new AxiosError("connect ECONNREFUSED"), "fallback")).toBe("Unable to reach the server. Please try again.");
  });

  it("falls back when there is nothing better", () => {
    expect(getActionErrorMessage(answered(500, {}), "Something went wrong")).toBe("Something went wrong");
  });
});
