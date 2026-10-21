import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SEND, initialAfterSend, isAfterSendChoice, KEEP_STATUS, rememberedChoice, statusToSet } from "./afterSendChoice";

describe("rememberedChoice", () => {
  it("starts on Waiting on user", () => {
    expect(DEFAULT_AFTER_SEND).toBe("WAITING_ON_USER");
    expect(rememberedChoice(null)).toBe("WAITING_ON_USER");
  });

  it("keeps an everyday choice this admin made", () => {
    expect(rememberedChoice(KEEP_STATUS)).toBe(KEEP_STATUS);
    expect(rememberedChoice("IN_PROGRESS")).toBe("IN_PROGRESS");
  });

  it("never brings back resolving or closing, or something unknown", () => {
    expect(rememberedChoice("RESOLVED")).toBe(DEFAULT_AFTER_SEND);
    expect(rememberedChoice("CLOSED")).toBe(DEFAULT_AFTER_SEND);
    expect(rememberedChoice("ARCHIVED")).toBe(DEFAULT_AFTER_SEND);
  });
});

describe("isAfterSendChoice", () => {
  it("knows the select's values", () => {
    expect(isAfterSendChoice(KEEP_STATUS)).toBe(true);
    expect(isAfterSendChoice("OPEN")).toBe(true);
    expect(isAfterSendChoice("")).toBe(false);
    expect(isAfterSendChoice(null)).toBe(false);
  });
});

describe("initialAfterSend", () => {
  it("starts on the remembered choice for a ticket still in the queue", () => {
    expect(initialAfterSend("WAITING_ON_USER", "OPEN")).toBe("WAITING_ON_USER");
    expect(initialAfterSend("IN_PROGRESS", "WAITING_ON_USER")).toBe("IN_PROGRESS");
  });

  // A closing "thanks" shouldn't reopen a solved ticket.
  it("leaves a solved or closed ticket as it is", () => {
    expect(initialAfterSend("WAITING_ON_USER", "RESOLVED")).toBe(KEEP_STATUS);
    expect(initialAfterSend("IN_PROGRESS", "CLOSED")).toBe(KEEP_STATUS);
  });
});

describe("statusToSet", () => {
  it("sets a different status", () => {
    expect(statusToSet("WAITING_ON_USER", "OPEN")).toBe("WAITING_ON_USER");
    expect(statusToSet("OPEN", "RESOLVED")).toBe("OPEN");
  });

  it("sets nothing when left as is, or already there", () => {
    expect(statusToSet(KEEP_STATUS, "OPEN")).toBeNull();
    expect(statusToSet("WAITING_ON_USER", "WAITING_ON_USER")).toBeNull();
  });
});
