"use client";

import { usePushResync } from "@/hooks/usePushSubscription";

// Mounted once in the customer shell: re-sends this device's push
// subscription with the reader's language on load (see usePushResync).
// `enabled` is false for a read-only "View as customer" session.
export function PushResync({ enabled }: { enabled: boolean }) {
  usePushResync(enabled);
  return null;
}
