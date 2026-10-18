"use client";

import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";

// What a page adds to the top bar while it is open: the record it shows, as
// the breadcrumb's last part ("Transactions › Weekly groceries"), and on a
// phone a line under the page's name and an action in the avatar's place
// (the vault's lock timer and Lock now). The page renders <TopbarExtras … />
// and the bar reads it back.
export interface TopbarExtrasValue {
  record?: string;
  // A page whose name differs from its menu entry ("New journal entry"
  // under Journal entry) puts its own in the breadcrumb.
  heading?: string;
  // A page outside the menu ("Page not found") names itself alone, with no
  // trail before it.
  title?: string;
  subtitle?: React.ReactNode;
  // Takes the account menu's place on a phone.
  action?: React.ReactNode;
}

const ExtrasContext = createContext<TopbarExtrasValue | null>(null);
const SetExtrasContext = createContext<Dispatch<SetStateAction<TopbarExtrasValue | null>>>(() => {});

export function TopbarProvider({ children }: { children: React.ReactNode }) {
  const [extras, setExtras] = useState<TopbarExtrasValue | null>(null);
  return (
    <SetExtrasContext value={setExtras}>
      <ExtrasContext value={extras}>{children}</ExtrasContext>
    </SetExtrasContext>
  );
}

export function TopbarExtras({ record, heading, title, subtitle, action }: TopbarExtrasValue) {
  const setExtras = useContext(SetExtrasContext);
  // Before paint, so the bar never shows a stale part from the last page.
  useLayoutEffect(() => {
    setExtras({ record, heading, title, subtitle, action });
  }, [record, heading, title, subtitle, action, setExtras]);
  useLayoutEffect(() => () => setExtras(null), [setExtras]);
  return null;
}

export const useTopbarExtras = () => useContext(ExtrasContext);
