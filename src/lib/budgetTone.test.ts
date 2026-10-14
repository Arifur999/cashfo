import { describe, expect, it } from "vitest";
import { budgetTone } from "./budgetTone";

describe("budgetTone", () => {
  it("is green under 70%", () => {
    expect(budgetTone(0)).toBe("income");
    expect(budgetTone(69.9)).toBe("income");
  });

  it("is amber from 70% to 90%", () => {
    expect(budgetTone(70)).toBe("warning");
    expect(budgetTone(90)).toBe("warning");
  });

  it("is red over 90%, including past the limit", () => {
    expect(budgetTone(90.1)).toBe("expense");
    expect(budgetTone(98)).toBe("expense");
    expect(budgetTone(140)).toBe("expense");
  });
});
