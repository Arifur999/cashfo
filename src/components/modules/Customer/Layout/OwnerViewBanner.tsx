"use client";

import { Eye, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { endOwnerViewAction } from "@/lib/customer/ownerViewActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface OwnerViewBannerProps {
  customerName: string;
  adminName: string;
}

// Above everything while a super admin looks at the app as this customer
// (Admin > Users > View as customer), so it's never mistaken for their own
// session. The API refuses every change from it. The warning fill is amber
// in both themes, so the ink on it is the fixed dark one.
export function OwnerViewBanner({ customerName, adminName }: OwnerViewBannerProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-warning-fill px-4 py-2 text-sm font-medium text-night-ink sm:px-6"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {t("Viewing as")} {customerName} — {t("read-only support view by")} {adminName}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => endOwnerViewAction())}
        // The usual green focus ring barely shows on amber.
        className="flex items-center gap-1.5 rounded-lg bg-night-ink px-3 py-1 text-xs font-semibold text-white hover:bg-night-ink/80 focus-visible:outline-night-ink disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {t("End view")}
      </button>
    </div>
  );
}
