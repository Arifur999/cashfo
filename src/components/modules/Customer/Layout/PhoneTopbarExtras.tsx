"use client";

import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";

// What a page adds to the phone top bar beside its title: the vault's
// "Unlocked · locks in 8:24" line and its Lock now button. The page renders
// <PhoneTopbarExtras … /> and the top bar reads it back while the page is open.
export interface TopbarExtras {
  subtitle?: React.ReactNode;
  // Takes the account menu's place.
  action?: React.ReactNode;
}

const ExtrasContext = createContext<TopbarExtras | null>(null);
const SetExtrasContext = createContext<Dispatch<SetStateAction<TopbarExtras | null>>>(() => {});

export function PhoneTopbarProvider({ children }: { children: React.ReactNode }) {
  const [extras, setExtras] = useState<TopbarExtras | null>(null);
  return (
    <SetExtrasContext value={setExtras}>
      <ExtrasContext value={extras}>{children}</ExtrasContext>
    </SetExtrasContext>
  );
}

export function PhoneTopbarExtras({ subtitle, action }: TopbarExtras) {
  const setExtras = useContext(SetExtrasContext);
  // Before paint, so the bar never shows a stale line from the last page.
  useLayoutEffect(() => {
    setExtras({ subtitle, action });
  }, [subtitle, action, setExtras]);
  useLayoutEffect(() => () => setExtras(null), [setExtras]);
  return null;
}

export const usePhoneTopbarExtras = () => useContext(ExtrasContext);
