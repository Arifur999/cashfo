"use client";

import { createContext, useContext, useMemo } from "react";

interface Slots {
  // The net worth card, streamed in on its own.
  netWorth: React.ReactNode;
  // The loans note under What changed.
  loansNote: React.ReactNode;
}

const SlotsContext = createContext<Slots>({ netWorth: null, loansNote: null });

// The overview layout's own parts, handed down to the page so they sit in
// its grid. A layout isn't rendered again when only the period changes, so
// a period switch neither waits for net worth nor reads it twice.
export function InsightsSlots({ netWorth, loansNote, children }: Slots & { children: React.ReactNode }) {
  const value = useMemo(() => ({ netWorth, loansNote }), [netWorth, loansNote]);
  return <SlotsContext.Provider value={value}>{children}</SlotsContext.Provider>;
}

export const useInsightsSlots = () => useContext(SlotsContext);
