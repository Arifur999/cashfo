import { describe, expect, it } from "vitest";
import { CLIENT_ERROR_LIMITS, toClientErrorReport } from "./clientErrorReport";

describe("toClientErrorReport", () => {
  it("keeps the three fields the API takes", () => {
    expect(toClientErrorReport({ message: "Boom", digest: "123abc", path: "/transactions" })).toEqual({ message: "Boom", digest: "123abc", path: "/transactions" });
  });

  it("drops every other field, and never sends null", () => {
    const report = toClientErrorReport({ message: "Boom", digest: null, path: null, stackTrace: "at x", extra: 1 });
    expect(report).toEqual({ message: "Boom" });
    expect(Object.keys(report)).toEqual(["message"]);
  });

  it("names an error without a message", () => {
    expect(toClientErrorReport({ message: "  " }).message).toBe("Unknown error");
    expect(toClientErrorReport(undefined)).toEqual({ message: "Unknown error" });
    expect(toClientErrorReport("Boom")).toEqual({ message: "Unknown error" });
  });

  it("caps the message at 500 characters without splitting one", () => {
    const long = "😀".repeat(600);
    const { message } = toClientErrorReport({ message: long });
    expect(Array.from(message)).toHaveLength(CLIENT_ERROR_LIMITS.message);
    expect(message).toBe("😀".repeat(500));
  });

  it("strips NUL characters", () => {
    expect(toClientErrorReport({ message: "a\u0000b", path: "/x\u0000y" })).toEqual({ message: "ab", path: "/xy" });
  });

  it("leaves out a digest longer than 64", () => {
    expect(toClientErrorReport({ message: "m", digest: "d".repeat(65) })).toEqual({ message: "m" });
    expect(toClientErrorReport({ message: "m", digest: "d".repeat(64) }).digest).toHaveLength(64);
  });

  it("sends the pathname only", () => {
    expect(toClientErrorReport({ message: "m", path: "/reset?token=abc#top" }).path).toBe("/reset");
    expect(toClientErrorReport({ message: "m", path: "https://example.com/x" }).path).toBeUndefined();
    expect(toClientErrorReport({ message: "m", path: "//evil.example/x" }).path).toBeUndefined();
    expect(toClientErrorReport({ message: "m", path: "?q=1" }).path).toBeUndefined();
  });

  it("caps the path at 300", () => {
    expect(toClientErrorReport({ message: "m", path: `/${"a".repeat(400)}` }).path).toHaveLength(CLIENT_ERROR_LIMITS.path);
  });
});
