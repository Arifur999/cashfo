import { describe, expect, it } from "vitest";
import { cn } from "./cn";

// cn() must know the design's utilities, or it drops a colour beside a
// text style (both start with "text-") and a shadow beside a shadow colour.
describe("cn", () => {
  it("keeps a text style and a colour together", () => {
    expect(cn("text-body text-ink")).toBe("text-body text-ink");
    expect(cn("text-ink", "text-display-xl")).toBe("text-ink text-display-xl");
  });

  it("still resolves two text styles to the last one", () => {
    expect(cn("text-body", "text-h1")).toBe("text-h1");
    expect(cn("text-sm", "text-amount-lg")).toBe("text-amount-lg");
  });

  it("treats the design shadows as shadows, not shadow colours", () => {
    expect(cn("shadow-card", "shadow-overlay")).toBe("shadow-overlay");
    expect(cn("shadow-card shadow-black/10")).toBe("shadow-card shadow-black/10");
  });

  it("treats the gradients as background images, not colours", () => {
    expect(cn("bg-aurora bg-surface")).toBe("bg-aurora bg-surface");
    expect(cn("bg-night", "bg-night-panel")).toBe("bg-night-panel");
  });
});
