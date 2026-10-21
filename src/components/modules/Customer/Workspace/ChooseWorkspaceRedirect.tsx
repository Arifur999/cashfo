"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/shared/Loader";
import { chooseWorkspaceHref } from "@/lib/customer/workspaceSwitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// What the customer layout renders while it sends someone with more than
// one workspace, and none chosen on this device yet, to "Which workspace?".
// A layout can't see the URL, so the page to come back to is read here.
// The chooser itself is outside the layout and never sends anyone back
// without a choice, so this can't go round in a loop.
export function ChooseWorkspaceRedirect() {
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    router.replace(chooseWorkspaceHref(`${window.location.pathname}${window.location.search}`));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-fresh">
      <Loader size={28} label={t("Loading...")} />
    </div>
  );
}
