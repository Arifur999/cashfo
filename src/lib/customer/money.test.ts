import { describe, expect, it } from "vitest";
import { limitMoneyDecimals } from "./money";

describe("limitMoneyDecimals", () => {
  it("keeps up to two decimals as typed", () => {
    expect(limitMoneyDecimals("")).toBe("");
    expect(limitMoneyDecimals("12")).toBe("12");
    expect(limitMoneyDecimals("12.")).toBe("12.");
    expect(limitMoneyDecimals("12.5")).toBe("12.5");
    expect(limitMoneyDecimals("12.34")).toBe("12.34");
    expect(limitMoneyDecimals("-5.25")).toBe("-5.25");
  });

  it("drops a third decimal and beyond", () => {
    expect(limitMoneyDecimals("12.345")).toBe("12.34");
    expect(limitMoneyDecimals("0.019")).toBe("0.01");
    expect(limitMoneyDecimals("-1.999")).toBe("-1.99");
  });
});
