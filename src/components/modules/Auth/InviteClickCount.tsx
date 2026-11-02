"use client";

import { useEffect } from "react";
import { countInviteClickAction } from "@/lib/customer/referralActions";

// Counts this visit as an open of the inviter's link (Referrals > Invite
// links > Clicks), once per browser session for each link, so a reload or
// a failed sign-up coming back doesn't count again. Draws nothing.
export default function InviteClickCount({ code, source }: { code: string; source: string | null }) {
  useEffect(() => {
    const key = `invite-click:${code}:${source ?? ""}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage refused (a private window): count it anyway.
    }
    void countInviteClickAction(code, source);
  }, [code, source]);
  return null;
}
