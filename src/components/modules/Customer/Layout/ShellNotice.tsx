"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// What a page outside the app asks the shell to confirm as it lands, by
// ?notice= (the reset-password action sends password-changed home).
const NOTICES: Record<string, string> = {
  "password-changed": "Password changed. Your other devices were signed out.",
};

// Says a known ?notice= once, as a toast, then takes it off the address so
// a refresh or Back doesn't say it again. Any other value is left alone.
export function ShellNotice() {
  const { t } = useLocale();
  const notice = useSearchParams().get("notice");
  const message = notice !== null && Object.hasOwn(NOTICES, notice) ? NOTICES[notice] : null;

  useEffect(() => {
    if (!message) return;
    // The id keeps a second run (React's dev double effects) to one toast.
    toast.success(t(message), { id: `notice:${notice}` });
    const params = new URLSearchParams(window.location.search);
    params.delete("notice");
    const query = params.toString();
    // Next keeps useSearchParams in step with replaceState.
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [message, notice, t]);

  return null;
}
