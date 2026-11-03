"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { createHabitTrackerAction } from "@/lib/customer/habitsActions";

// This month's Namaz sheet opens on its own (Namaz › Today and the
// Dashboard): with none yet, it is created. Already there (another tab
// opened it at the same time) is as good as opened; a failure, or no answer
// at all (offline), says so with a retry. Either way a refresh brings in
// whatever sheet there is. Off (enabled false) for any other month.
export function useThisMonthSheet(server: HabitMonthTracker | null, year: number, month: number, enabled = true) {
  const router = useRouter();
  const creating = useRef(false);
  const [openFailed, setOpenFailed] = useState(false);

  const openSheet = useCallback(() => {
    if (creating.current) return;
    creating.current = true;
    createHabitTrackerAction({ category: "Namaz", month, year })
      .then((result) => result.success || /already exists/.test(result.message ?? ""))
      .catch(() => false)
      .then((opened) => {
        if (!opened) {
          creating.current = false;
          setOpenFailed(true);
        }
        router.refresh();
      });
  }, [month, year, router]);

  useEffect(() => {
    if (!enabled) return;
    // Once the sheet is here, a later month (the page left open past the
    // 1st) can open its own.
    if (server) creating.current = false;
    else openSheet();
  }, [enabled, server, openSheet]);

  return {
    // The failure shows only while there is still no sheet.
    failed: enabled && openFailed && !server,
    retry: () => {
      setOpenFailed(false);
      openSheet();
    },
  };
}
