"use client";

import { useEffect, useState } from "react";
import type { Account } from "@/lib/customer/api";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";

export interface DrawerWallets {
  wallets: Account[];
  savingsWallets: Account[];
  loading: boolean;
  // An English dictionary key; WalletPicker translates it.
  error: string | null;
}

const FAILED = "Failed to load your wallets";

// The money and savings wallets an asset is paid from or sold into, fetched
// each time a drawer opens. A request that fails outright (offline, a new
// deploy) still ends the loading, with a message, instead of leaving the
// picker on "Loading..." for good. An answer meant for an earlier opening
// is dropped.
export function useDrawerWallets(open: boolean, businessId: string): DrawerWallets {
  const [state, setState] = useState<DrawerWallets>({ wallets: [], savingsWallets: [], loading: true, error: null });

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setState((current) => ({ ...current, loading: true, error: null }));
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([listMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)])
      .then(([money, savings]) => {
        if (live) setState({ wallets: money.data ?? [], savingsWallets: savings, loading: false, error: money.success ? null : (money.message ?? FAILED) });
      })
      .catch(() => {
        if (live) setState((current) => ({ ...current, loading: false, error: FAILED }));
      });
    return () => {
      live = false;
    };
  }, [open, businessId]);

  return state;
}
