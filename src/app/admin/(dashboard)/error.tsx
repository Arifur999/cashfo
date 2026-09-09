"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { reportFrontendError } from "@/lib/reportFrontendError";
import { t } from "@/lib/i18n/t";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Best-effort crash report -- see Prompt 9's POST /admin/system/errors
    // (ADMIN_FRONTEND source). Never let a failed report throw again inside
    // an error boundary.
    void reportFrontendError(error.message, error.stack);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-16 text-center shadow-sm shadow-black/5">
      <AlertTriangle className="h-10 w-10 text-brand-danger" />
      <h1 className="mt-4 text-lg font-semibold text-neutral-900">{t("Something went wrong")}</h1>
      <p className="mt-1 max-w-md text-sm text-neutral-500">
        {t("This page hit an unexpected error. You can try again, or navigate elsewhere from the sidebar.")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
      >
        {t("Try again")}
      </button>
    </div>
  );
}
