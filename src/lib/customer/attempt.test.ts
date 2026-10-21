import { notFound, redirect } from "next/navigation";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { describe, expect, it } from "vitest";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "./attempt";

describe("attempt", () => {
  it("passes the action's own answer through", async () => {
    await expect(attempt(async () => ({ success: true, data: 7 }))).resolves.toEqual({ success: true, data: 7 });
    await expect(attempt(async () => ({ success: false, message: "Name is taken" }))).resolves.toEqual({ success: false, message: "Name is taken" });
  });

  it("reads an action that never reached the server as a failed answer", async () => {
    const dropped = () => Promise.reject(new TypeError("Failed to fetch"));
    await expect(attempt(dropped)).resolves.toEqual({ success: false, message: OFFLINE_MESSAGE });
    await expect(attempt(dropped, "সংযোগ নেই")).resolves.toEqual({ success: false, message: "সংযোগ নেই" });
  });

  it("catches a throw before the action's promise too", async () => {
    const broken = (): Promise<{ success: boolean }> => {
      throw new Error("boom");
    };
    await expect(attempt(broken)).resolves.toEqual({ success: false, message: OFFLINE_MESSAGE });
  });

  it("asks for a reload when the page is from an older build than the server", async () => {
    const stale = () => Promise.reject(new UnrecognizedActionError("x"));
    await expect(attempt(stale)).resolves.toEqual({ success: false, message: STALE_MESSAGE });
    await expect(attempt(stale, OFFLINE_MESSAGE, "রিলোড করুন")).resolves.toEqual({ success: false, message: "রিলোড করুন" });
  });

  it("lets Next's redirect and not-found through", async () => {
    await expect(attempt(async () => redirect("/login"))).rejects.toThrow("NEXT_REDIRECT");
    await expect(attempt(async () => notFound())).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK");
  });
});
