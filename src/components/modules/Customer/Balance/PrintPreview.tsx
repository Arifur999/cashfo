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
  // "bar": the loan boards' preview -- the title and line on a dark bar as
  // wide as the page, Close and one Print button (it saves the PDF too).
  look?: "plain" | "bar";
  // The Print button's words ("Print or save PDF").
  printLabel?: string;
  // The board's own screen and page where they differ (a darker screen,
  // other margins), merged over the plain look.
  overlayClassName?: string;
  articleClassName?: string;
}

// The boards' print preview: the page as it will print, on a dark screen
// over the app, with Close, Download PDF and Print. On paper only the page
// itself prints; Download PDF opens the same print window, where the
// browser saves it as a PDF.
export function PrintPreview({ subtitle, onClose, children, look = "plain", printLabel = "Print", overlayClassName, articleClassName }: PrintPreviewProps) {
  const bar = look === "bar";
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
      className={cn("fixed inset-0 z-80 flex flex-col items-center overflow-y-auto px-4 print:static print:block print:overflow-visible print:bg-transparent print:p-0", bar ? "gap-3 bg-print-bar/78 pt-4 pb-4" : "gap-3.5 bg-scrim pt-5 pb-8", overlayClassName)}
    >
      <div role="toolbar" aria-label={t("Print preview")} className={cn("flex w-full flex-wrap items-center justify-between gap-3 print:hidden", bar ? "max-w-198.5 shrink-0 rounded-[16px] bg-print-bar py-2.5 pr-2.5 pl-4.5 leading-[normal] shadow-[0_10px_30px_rgba(0,0,0,0.25)]" : "max-w-190")}>
        <div className="flex min-w-0 flex-col text-white">
          <span className={cn("font-semibold", bar ? "text-[16px]" : "text-body-lg")}>{t("Print preview")}</span>
          <span className="truncate text-[12.5px] text-white/75">{subtitle}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onClose} className={cn(button, "border border-white/35 text-white hover:bg-white/10")}>
            {t("Close")}
          </button>
          {!bar && (
            <button type="button" onClick={() => window.print()} title={t("Choose Save as PDF in the print window")} className={cn(button, "bg-white text-ink hover:bg-white/90 dark:bg-surface")}>
              <Download className="size-4" aria-hidden="true" />
              {t("Download PDF")}
            </button>
          )}
          <button ref={printRef} type="button" onClick={() => window.print()} className={cn(button, "bg-primary text-primary-foreground hover:bg-emerald-hover")}>
            <Printer className="size-4" aria-hidden="true" />
            {t(printLabel)}
          </button>
        </div>
      </div>
      <article className={cn("flex w-full shrink-0 flex-col rounded-sm bg-surface px-6 py-8 text-ink sm:min-h-200 print:block print:min-h-0 [&>section]:flex-1 shadow-[0_20px_50px_rgba(0,0,0,0.3)] sm:px-11 sm:py-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none", bar ? "max-w-198.5" : "max-w-190", articleClassName)}>
        {children}
      </article>
    </div>
  );
}
