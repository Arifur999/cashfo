import { describe, expect, it } from "vitest";
import { walletShares } from "./walletShares";
import { WALLET_PALETTES } from "./walletVisuals";

const wallet = (id: string, currentBalance: string, status = "ACTIVE") => ({ id, name: id, currentBalance, status });

describe("walletShares", () => {
  it("orders the wallets by balance and keeps their list colour", () => {
    const shares = walletShares([wallet("cash", "9650"), wallet("islami", "16800"), wallet("ucb", "1800"), wallet("exim", "38500")]);
    expect(shares.map((s) => s.id)).toEqual(["exim", "islami", "cash", "ucb"]);
    expect(shares[0].bar).toBe(WALLET_PALETTES[3].bar);
    expect(shares[2].bar).toBe(WALLET_PALETTES[0].bar);
    expect(shares.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100);
    expect(Math.round(shares[0].share)).toBe(58);
  });

  it("leaves out empty, overdrawn and archived wallets", () => {
    const shares = walletShares([wallet("a", "0"), wallet("b", "-50"), wallet("c", "100"), wallet("d", "900", "ARCHIVED")]);
    expect(shares).toHaveLength(1);
    expect(shares[0]).toMatchObject({ id: "c", share: 100, bar: WALLET_PALETTES[2].bar });
  });

  it("is empty when nothing is held", () => {
    expect(walletShares([wallet("a", "0")])).toEqual([]);
    expect(walletShares([])).toEqual([]);
  });
});
