"use client";

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { dayOf } from "@/lib/customer/investmentDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, BTN_SECONDARY, ENTRY_LOOK, Glyph, IC } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";

export type DeleteTarget = { kind: "investment"; id: string } | { kind: "entry"; investmentId: string; entryId: string };

// Delete this investment? / Delete this entry? -- both can be undone from
// the toast for a few minutes.
export function DeleteDialog({ target, onClose, onConfirm, busy }: { target: DeleteTarget | null; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  const { t, fmt } = useLocale();
  const { byId, money, day } = useInvestments();
  let title = "";
  let body = "";
  if (target?.kind === "investment") {
    const c = byId.get(target.id);
    title = t("Delete this investment?");
    body = c ? t("{name} and its {count} entries are removed. Account balances change back as if it never happened.", { name: c.investment.name, count: formatCount(c.entries.length, fmt) }) : "";
  } else if (target?.kind === "entry") {
    const c = byId.get(target.investmentId);
    const e = c?.investment.entries.find((row) => row.id === target.entryId);
    title = t("Delete this entry?");
    body = c && e ? t("{type} of {amount} on {date} ({name}) is removed.", { type: t(ENTRY_LOOK[e.type].label), amount: money(Number(e.amount)), date: day(dayOf(e.date)), name: c.investment.name }) : "";
  }
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-scrim="board" className="flex w-110 max-w-[calc(100vw-32px)] flex-col gap-3.5 rounded-[20px] border-0 bg-surface p-6 leading-[normal] text-ink shadow-[0_24px_60px_rgba(18,32,29,0.28)] ring-0 sm:max-w-[calc(100vw-32px)]">
        <span className="flex size-11.5 items-center justify-center rounded-[14px] bg-expense-soft text-expense-fill">
          <Glyph d={IC.trash} size={22} />
        </span>
        <AlertDialogTitle className="m-0 text-[18px] font-bold text-ink">{title}</AlertDialogTitle>
        <AlertDialogDescription data-i18n-skip="" className="m-0 text-[13.5px] leading-[1.55] text-ink-2">
          {body}
        </AlertDialogDescription>
        <div className="mt-1 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className={cn(BTN_SECONDARY, "h-11")}>
            {t("Cancel")}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={cn(BTN_PRIMARY, "h-11 bg-expense-fill")}>
            {t("Delete")}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
