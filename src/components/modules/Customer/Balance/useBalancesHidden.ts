"use client";

import { useState, useSyncExternalStore } from "react";

// Hide or show balances, shared by Accounts, Transfers and Ledger for this
// tab (sessionStorage), so a figure hidden on one stays hidden on the next.
const KEY = "smartly-bal-hide";
const EVENT = "smartly-balance-hide";

function read(): boolean | null {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value === "1" ? true : value === "0" ? false : null;
  } catch {
    return null;
  }
}

function write(hidden: boolean) {
  try {
    window.sessionStorage.setItem(KEY, hidden ? "1" : "0");
  } catch {
    // Blocked storage: this page still hides, the next one doesn't know.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// hiddenOnOpen: the page opens with balances hidden whatever was chosen
// before (Accounts, the board's), and its own choice still carries over.
export function useBalancesHidden(hiddenOnOpen = false): { hidden: boolean; toggle: () => void } {
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const [own, setOwn] = useState<boolean | null>(hiddenOnOpen ? true : null);
  const hidden = own ?? stored ?? false;
  return {
    hidden,
    toggle: () => {
      if (hiddenOnOpen) setOwn(!hidden);
      write(!hidden);
    },
  };
}
