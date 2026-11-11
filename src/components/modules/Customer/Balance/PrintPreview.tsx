"use client";

import { Download, Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface PrintPreviewProps {
  // "A4 · Islami Bank · This month": what is about to print.
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}

// The boards' print preview: the page as it will print, on a dark screen
// over the app, with Close, Download PDF and Print. On paper only the page
// itself prints; Download PDF opens the same print window, where the
// browser saves it as a PDF.
export function PrintPreview({ subtitle, onClose, children }: PrintPreviewProps) {
  const { t } = useLocale();
  const printRef = useRef<HTMLButtonElement>(null);

  // Print takes focus, Escape closes, and focus goes back where it was.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    printRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [onClose]);

  const button = "flex h-11 items-center gap-2 rounded-full px-4.5 text-body font-semibold whitespace-nowrap";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Print preview")}
      className="fixed inset-0 z-80 flex flex-col items-center gap-3.5 overflow-y-auto bg-scrim px-4 pt-5 pb-8 print:static print:block print:overflow-visible print:bg-transparent print:p-0"
    >
      <div role="toolbar" aria-label={t("Print preview")} className="flex w-full max-w-190 flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 flex-col text-white">
          <span className="text-body-lg font-semibold">{t("Print preview")}</span>
          <span className="truncate text-[12.5px] text-white/75">{subtitle}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onClose} className={cn(button, "border border-white/35 text-white hover:bg-white/10")}>
            {t("Close")}
          </button>
          <button type="button" onClick={() => window.print()} title={t("Choose Save as PDF in the print window")} className={cn(button, "bg-white text-ink hover:bg-white/90 dark:bg-surface")}>
            <Download className="size-4" aria-hidden="true" />
            {t("Download PDF")}
          </button>
          <button ref={printRef} type="button" onClick={() => window.print()} className={cn(button, "bg-primary text-primary-foreground hover:bg-emerald-hover")}>
            <Printer className="size-4" aria-hidden="true" />
            {t("Print")}
          </button>
        </div>
      </div>
      <article className="w-full max-w-190 shrink-0 rounded-sm bg-surface px-6 py-8 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:px-11 sm:py-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {children}
      </article>
    </div>
  );
}
