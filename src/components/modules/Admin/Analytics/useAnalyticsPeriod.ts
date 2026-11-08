"use client";

import { useSearchParams } from "next/navigation";
import { adminPeriodOf } from "@/lib/adminPeriod";
import type { Period } from "@/lib/customer/period";

// The period in the address, read the way the server page reads it, so its
// prefetched reports are the ones used.
export function useAnalyticsPeriod(today: string): Period {
  const searchParams = useSearchParams();
  return adminPeriodOf(Object.fromEntries(searchParams.entries()), today);
}
