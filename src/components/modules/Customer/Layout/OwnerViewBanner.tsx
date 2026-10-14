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
// session. The API refuses every change from it.
export function OwnerViewBanner({ customerName, adminName }: OwnerViewBannerProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 sm:px-6"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {t("Viewing as")} {customerName} — {t("read-only support view by")} {adminName}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => endOwnerViewAction())}
        className="flex items-center gap-1.5 rounded-lg bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {t("End view")}
      </button>
    </div>
  );
}
