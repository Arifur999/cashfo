"use client";

import { Check, Trash2 } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconAction from "@/components/smartly/IconAction";
import { paymentMeta, WHO_CAN_RECEIVE } from "@/lib/customer/zakatDisplay";
import type { ZakatPayment, ZakatStepId, ZakatSummary } from "@/lib/customer/zakatTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ZakatSideProps {
  summary: ZakatSummary;
  money: (value: number | string) => string;
  // A wallet's name by its id, for "2 Nov 2026 · Cash · Expense".
  walletName: (id: string) => string;
  onRecord: () => void;
  onDelete: (payment: ZakatPayment) => void;
  pending: string | null;
  readOnly: boolean;
}

const SUM_LINES: { step: ZakatStepId; label: string }[] = [
  { step: "CASH", label: "Cash and bank" },
  { step: "SAVINGS", label: "Savings" },
  { step: "GOLD", label: "Gold and silver" },
  { step: "INVESTMENTS", label: "Investments" },
  { step: "OWED_TO_YOU", label: "Owed to you" },
];

// The right-hand column (board: Zakat): the total, step by step, down to
// the zakat; the zakat given so far; who may receive it; and the note that
// this is a guide.
export function ZakatSide({ summary, money, walletName, onRecord, onDelete, pending, readOnly }: ZakatSideProps) {
  const { t, fmt } = useLocale();
  const totalOf = (step: ZakatStepId) => summary.steps.find((each) => each.step === step)?.total ?? "0.00";
  const givenBack = Number(summary.totals.givenBack);
  const paid = Number(summary.totals.paid);
  const row = "flex items-baseline gap-2.5 text-[13.5px] text-ink-2";

  return (
    <div className="flex flex-col gap-3.5">
      <Card asChild className="flex flex-col gap-2.25 px-5 py-4.5">
        <section aria-labelledby="zk-sum">
          <h2 id="zk-sum" className="mb-1 text-[15.5px] font-semibold text-ink">
            {t("Your total")}
          </h2>
          {SUM_LINES.map((line) => (
            <div key={line.step} className={row}>
              <span className="flex-1">{t(line.label)}</span>
              <span className="font-semibold whitespace-nowrap text-ink tabular-nums">+ {money(totalOf(line.step))}</span>
            </div>
          ))}
          {givenBack > 0 && (
            <div className={row}>
              <span className="flex-1">{t("Zakat given this year, counted back")}</span>
              <span className="font-semibold whitespace-nowrap text-ink tabular-nums">+ {money(givenBack)}</span>
            </div>
          )}
          <div className={row}>
            <span className="flex-1">{t("You owe")}</span>
            <span className="font-semibold whitespace-nowrap text-loss-ink tabular-nums">− {money(summary.totals.owe)}</span>
          </div>
          <div className="my-0.5 h-px bg-line" />
          <div className="flex items-baseline gap-2.5 text-body font-semibold text-ink">
            <span className="flex-1">{t("Zakat is due on")}</span>
            <span className="tabular-nums">{money(summary.totals.net)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5 rounded-[14px] bg-primary-soft px-3.5 py-3">
            <span className="flex-1 text-[13.5px] font-semibold text-brand-ink">{t("Your zakat")}</span>
            <span className="text-[20px] font-bold text-brand-ink tabular-nums">{money(summary.totals.zakat)}</span>
          </div>
        </section>
      </Card>

      <Card asChild className="flex flex-col gap-2.5 px-5 py-4.5">
        <section aria-labelledby="zk-paid">
          <div className="flex items-baseline gap-2.5">
            <h2 id="zk-paid" className="flex-1 text-[15.5px] font-semibold text-ink">
              {t("Given so far")}
            </h2>
            {paid > 0 && <span className="text-small font-semibold text-brand-ink tabular-nums">{money(paid)}</span>}
          </div>
          {summary.payments.length === 0 ? (
            <p className="rounded-[12px] bg-strip p-3.5 text-small leading-normal text-ink-muted">{t("Nothing recorded yet. Record each time you give, and we keep track of what is left.")}</p>
          ) : (
            <ul className="flex flex-col">
              {summary.payments.map((payment) => (
                <li key={payment.id} className={cn("flex items-center gap-2.5 border-b border-page py-2", pending === `payment:${payment.id}` && "opacity-60")}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-mint-50 text-emerald">
                    <Check className="size-3.75" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{payment.givenTo || t("Zakat")}</span>
                    <span className="text-caption text-ink-muted">{paymentMeta(payment.paidOn, walletName(payment.accountId), t, fmt)}</span>
                  </span>
                  <span className="text-[13.5px] font-semibold whitespace-nowrap text-ink tabular-nums">{money(payment.amount)}</span>
                  {!readOnly && (
                    <IconAction
                      tone="danger"
                      disabled={pending === `payment:${payment.id}`}
                      onClick={() => onDelete(payment)}
                      aria-label={t("Delete this entry")}
                      title={t("Delete this entry")}
                    >
                      <Trash2 aria-hidden="true" />
                    </IconAction>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!readOnly && (
            <Button variant="secondary" onClick={onRecord} className="w-full">
              {t("Record zakat given")}
            </Button>
          )}
        </section>
      </Card>

      <Card asChild className="flex flex-col gap-2.5 px-5 py-4.5">
        <section aria-labelledby="zk-who">
          <h2 id="zk-who" className="text-[15.5px] font-semibold text-ink">
            {t("Who can receive zakat")}
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {WHO_CAN_RECEIVE.map((who) => (
              <li key={who} className="rounded-full bg-pick-wash px-2.5 py-1.25 text-[12.5px] font-medium text-brand-ink">
                {t(who)}
              </li>
            ))}
          </ul>
          <p className="rounded-[12px] bg-loss-wash px-3 py-2.5 text-[12.5px] leading-normal text-deny-ink">
            {t("Not to your parents, grandparents, children, grandchildren or husband or wife. Brothers, sisters and other relatives in need can receive it.")}
          </p>
        </section>
      </Card>

      <p className="px-1.5 text-caption leading-[1.55] text-ink-faint">{t("This is a guide built from your own records. For special cases, like business stock or shared property, ask a scholar you trust.")}</p>
    </div>
  );
}
