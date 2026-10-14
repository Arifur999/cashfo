"use client";

import { createContext, useContext, type ReactNode } from "react";
import { isFeatureOn, type FeatureFlags, type FeatureKey } from "@/lib/customer/features";

interface PlatformContextValue {
  flags: FeatureFlags;
  supportEmail: string;
}

const PlatformContext = createContext<PlatformContextValue>({ flags: {}, supportEmail: "" });

// The admin-configured switches every customer page can read (fed by
// getPlatform() in the customer layout).
export function PlatformProvider({ value, children }: { value: PlatformContextValue; children: ReactNode }) {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext);
}

export function useFeature(key: FeatureKey): boolean {
  return isFeatureOn(useContext(PlatformContext).flags, key);
}
