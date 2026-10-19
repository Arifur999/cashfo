"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_PRAYER_SETTINGS, type PrayerSettings } from "@/lib/customer/prayerTimes";

interface PrayerSettingsContextValue {
  settings: PrayerSettings;
  // Takes a saved copy, so every page reflects it before the next refresh.
  setSettings: (settings: PrayerSettings) => void;
}

const PrayerSettingsContext = createContext<PrayerSettingsContextValue>({ settings: DEFAULT_PRAYER_SETTINGS, setSettings: () => {} });

// Where and how prayer times are worked out, and the Hijri adjustment --
// read once by the customer layout for Namaz, Ramadan and every Hijri date.
export function PrayerSettingsProvider({ initial, children }: { initial: PrayerSettings; children: ReactNode }) {
  const [settings, setSettings] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSettings(initial);
  }
  return <PrayerSettingsContext.Provider value={{ settings, setSettings }}>{children}</PrayerSettingsContext.Provider>;
}

export function usePrayerSettings(): PrayerSettingsContextValue {
  return useContext(PrayerSettingsContext);
}
