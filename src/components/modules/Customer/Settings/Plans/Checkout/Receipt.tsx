"use client";

import { Download, Printer, X } from "lucide-react";
import Logo from "@/components/smartly/Logo";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// What the receipt prints, already worded (the invoice PDF's own fields).
export interface ReceiptModel {
  invoiceId: string;
  invoiceNumber: string;
  billedTo: { name: string; email: string; phone: string | null };
  paidOn: { date: string; time: string };
  method: string;
  reference: string | null;
  item: string;
  // What the plan includes, one line.
  itemSub: string;
  period: string;
  subtotal: string;
  discount: { label: string; amount: string } | null;
  total: string;
  words: string;
}

export const invoicePdfHref = (invoiceId: string, inline = false) => `/api/invoices/${encodeURIComponent(invoiceId)}${inline ? "?inline=1" : ""}`;

const Kicker = ({ children, small = false }: { children: React.ReactNode; small?: boolean }) => (
  <span className={cn("font-semibold tracking-[0.08em] text-ink-muted uppercase", small ? "text-[9px]" : "text-[10.5px]")}>{children}</span>
);

// The receipt card's preview (Checkout board, done): the top of the
// receipt fading out, with "View full receipt" over it.
export function ReceiptMini({ receipt, onOpen }: { receipt: ReceiptModel; onOpen: () => void }) {
  const { t } = useLocale();
  return (
    <button type="button" onClick={onOpen} aria-label={t("View full receipt")} className="relative block h-71.5 cursor-zoom-in overflow-hidden rounded-[14px] bg-surface-sunken px-4.5 pt-4.5 text-left">
      <div aria-hidden="true" className="flex flex-col gap-3 rounded-t-md bg-surface px-5 py-4.5 text-ink shadow-float">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1.75">
            <Logo variant="mark" height={20} alt="" />
            <b className="text-[13px]">{BRAND_NAME}</b>
          </span>
          <span className="flex flex-col items-end gap-0.75">
            <b className="text-[13px] tracking-[0.08em]">{t("RECEIPT")}</b>
            <span className="font-mono text-[9.5px] text-ink-muted">{receipt.invoiceNumber}</span>
            <span className="rounded-full bg-mint-50 px-1.5 text-[9px] font-bold tracking-[0.06em] text-brand-ink">{t("PAID")}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
          <span className="flex min-w-0 flex-col gap-px">
            <Kicker small>{t("Billed to")}</Kicker>
            <b className="truncate">{receipt.billedTo.name}</b>
            <span className="truncate text-ink-soft">{receipt.billedTo.email}</span>
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <Kicker small>{t("Paid on")}</Kicker>
            <b>{receipt.paidOn.date}</b>
            <span className="truncate text-ink-soft">{receipt.method}</span>
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-1 border-t-[1.5px] border-b border-t-ink border-b-line py-2 text-[11px]">
          <b>{receipt.item}</b>
          <b className="tabular-nums">{receipt.subtotal}</b>
          <span className="text-ink-muted">{receipt.period}</span>
        </div>
        {receipt.discount && (
          <div className="-mt-1 flex justify-between text-[11px] text-ink-muted">
            <span>{receipt.discount.label}</span>
            <span className="text-emerald tabular-nums">− {receipt.discount.amount}</span>
          </div>
        )}
        <div className="flex justify-between text-[12.5px]">
          <b>{t("Total paid")}</b>
          <b className="tabular-nums">{receipt.total}</b>
        </div>
        <div className="h-1.5 w-4/5 rounded-sm bg-surface-sunken" />
        <div className="h-1.5 w-3/5 rounded-sm bg-surface-sunken" />
      </div>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-17.5 bg-linear-to-b from-surface-sunken/0 to-surface-sunken to-85%" />
      <span className="absolute bottom-3.5 left-1/2 flex h-8.5 -translate-x-1/2 items-center gap-1.75 rounded-full bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-ink shadow-float">
        {t("View full receipt")}
      </span>
    </button>
  );
}

// "Receipt preview": the whole receipt as the PDF prints it, with Print
// (the PDF in the browser's own viewer) and Download PDF.
export function ReceiptDialog({ receipt, open, onClose }: { receipt: ReceiptModel; open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const fileName = `${receipt.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "") || "invoice"}.pdf`;
  const pill = "flex h-10 items-center gap-1.75 rounded-full px-3.5 text-[13.5px] font-semibold whitespace-nowrap";
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="flex max-h-[min(850px,calc(100vh-32px))] w-195 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-panel border-0 bg-surface p-0 shadow-overlay ring-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line-card py-3.5 pr-4 pl-5.5">
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <AlertDialogTitle className="text-[17px] font-semibold text-ink">{t("Receipt preview")}</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px] text-ink-muted">
              <span lang="en">{fileName}</span> · A4
            </AlertDialogDescription>
          </span>
          <a href={invoicePdfHref(receipt.invoiceId, true)} target="_blank" rel="noopener" className={cn(pill, "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
            <Printer className="size-3.75" strokeWidth={2} aria-hidden="true" />
            {t("Print")}
          </a>
          <a href={invoicePdfHref(receipt.invoiceId)} download className={cn(pill, "bg-forest px-4 text-white hover:bg-forest-hover")}>
            <Download className="size-3.75" strokeWidth={2.2} aria-hidden="true" />
            {t("Download PDF")}
          </a>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-10 items-center justify-center rounded-full bg-surface-sunken text-ink-2 hover:bg-line">
            <X className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-page px-4 pt-6.5 pb-7.5 dark:bg-strip">
          <article
            aria-label={receipt.invoiceNumber}
            className="relative mx-auto flex w-160 max-w-full flex-col gap-6.5 overflow-hidden bg-surface px-6 pt-10 pb-8.5 text-ink shadow-float sm:px-11"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-forest to-emerald" />
            <div className="flex items-start justify-between gap-4">
              <span className="flex items-center gap-2.5">
                <Logo variant="mark" height={36} alt="" />
                <span className="flex flex-col gap-0.5">
                  <b className="text-[18px]">{BRAND_NAME}</b>
                  <span className="text-[11.5px] text-ink-muted">{t("Dhaka, Bangladesh")}</span>
                </span>
              </span>
              <span className="flex flex-col items-end gap-1.25">
                <b className="text-[24px] tracking-[0.08em]">{t("RECEIPT")}</b>
                <code className="font-mono text-[12.5px] text-ink-2">{receipt.invoiceNumber}</code>
                <span className="mt-1 -rotate-4 rounded-md border-2 border-emerald px-3 py-0.75 text-[12px] font-extrabold tracking-[0.14em] text-emerald">{t("PAID")}</span>
              </span>
            </div>
            <div className="grid gap-4.5 text-[13px] leading-normal sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <span className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
                <Kicker>{t("Billed to")}</Kicker>
                <b>{receipt.billedTo.name}</b>
                <span className="text-ink-2">{receipt.billedTo.email}</span>
                {receipt.billedTo.phone && <span className="text-[12px] text-ink-2">{receipt.billedTo.phone}</span>}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <Kicker>{t("Paid on")}</Kicker>
                <b>{receipt.paidOn.date}</b>
                <span className="text-ink-2">{receipt.paidOn.time}</span>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
                <Kicker>{t("Payment")}</Kicker>
                <b>{receipt.method}</b>
                {receipt.reference && (
                  <>
                    <span className="text-ink-2">{t("Transaction ID")}</span>
                    <span className="font-mono text-[12px] text-ink-2">{receipt.reference}</span>
                  </>
                )}
              </span>
            </div>
            <div>
              <div className="grid grid-cols-[minmax(0,1fr)_110px] border-b-2 border-ink pb-2 text-[10.5px] leading-normal sm:grid-cols-[minmax(0,1fr)_170px_110px]">
                <Kicker>{t("Description")}</Kicker>
                <span className="hidden sm:block">
                  <Kicker>{t("Period")}</Kicker>
                </span>
                <span className="text-right">
                  <Kicker>{t("Amount")}</Kicker>
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_110px] items-start border-b border-line py-3.5 text-[13.5px] sm:grid-cols-[minmax(0,1fr)_170px_110px]">
                <span className="flex flex-col gap-0.75">
                  <b>{receipt.item}</b>
                  <span className="text-[12px] text-ink-muted">{receipt.itemSub}</span>
                  <span className="text-[12px] text-ink-2 sm:hidden">{receipt.period}</span>
                </span>
                <span className="hidden text-ink-2 sm:block">{receipt.period}</span>
                <span className="text-right tabular-nums">{receipt.subtotal}</span>
              </div>
              <div className="flex justify-end pt-3">
                <div className="flex w-70 max-w-full flex-col gap-1.75 text-[13.5px]">
                  <span className="flex justify-between">
                    <span className="text-ink-muted">{t("Subtotal")}</span>
                    <span className="tabular-nums">{receipt.subtotal}</span>
                  </span>
                  {receipt.discount && (
                    <span className="flex justify-between gap-3">
                      <span className="text-ink-muted">{receipt.discount.label}</span>
                      <span className="text-emerald tabular-nums">− {receipt.discount.amount}</span>
                    </span>
                  )}
                  <span className="flex justify-between border-t-2 border-ink pt-2.25 text-[17px] font-bold">
                    <span>{t("Total paid")}</span>
                    <span className="tabular-nums">{receipt.total}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-wash px-3.5 py-2.5 text-[12.5px] text-ink">
              <b>{t("In words:")}</b> {receipt.words}
            </div>
            <div className="flex flex-col gap-1 border-t border-dashed border-input pt-4 text-[12px] leading-normal text-ink-soft">
              <b className="text-[13px] text-ink">{t("Thank you for choosing Smartly Pro.")}</b>
              <span>{t("This receipt was made by computer and needs no signature.")}</span>
              <span>{t("Questions? Settings › Help and support, or reply to the receipt email.")}</span>
            </div>
          </article>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
