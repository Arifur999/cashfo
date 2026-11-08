"use client";

import { AlertTriangle, Check, Minus, X } from "lucide-react";
import { useState } from "react";
import { cancelCommissionAction, releaseCommissionAction } from "@/app/(dashboardLayout)/admin/referrals/_action";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { IPayoutDetail, IPayoutLine } from "@/types/referral.types";
import { canReleaseCommission, COMMISSION_STATUS_CHIP, deskChecks, firstName, GATEWAY_NAMES } from "./payoutsDisplay";

const MOMENT = "d MMM, h:mm aaa";

const REACHED: Record<IPayoutLine["reached"], { label: string; className: string }> = {
  RECEIVED: { label: "Reached us", className: "text-brand-ink" },
  REFUNDED: { label: "Refunded", className: "text-expense" },
  UNKNOWN: { label: "No payment to check", className: "text-ink-muted" },
};

// "Did it reach us?": the chip's look for each answer.
const REACHED_CHIP: Record<IPayoutLine["reached"], { className: string; icon: typeof Check }> = {
  RECEIVED: { className: "bg-emerald-soft text-brand-ink", icon: Check },
  REFUNDED: { className: "bg-expense-soft text-expense", icon: X },
  UNKNOWN: { className: "bg-surface-sunken text-ink-muted", icon: Minus },
};

const KIND_LABEL: Record<IPayoutLine["kind"], string> = { FIRST: "First payment", RENEWAL: "Renewal", BONUS: "Sign-up bonus" };

// Tick | Friend | Plan · paid on | They paid | Did it reach us? | share
// (AdminPayoutReview); a phone keeps the tick, the words and the share.
const REVIEW_COLUMNS = "grid grid-cols-[22px_minmax(0,1fr)_auto] gap-x-2.5 md:grid-cols-[22px_minmax(0,1fr)_132px_84px_220px_78px]";

interface ReviewTableProps {
  payout: IPayoutDetail;
  excluded: Set<string>;
  onToggle: (id: string, keep: boolean) => void;
  money: (value: string | number | null) => string;
}

// The review's table: each friend payment with its tick, to match with the
// gateway; an unticked one is struck through and held back.
function ReviewTable({ payout, excluded, onToggle, money }: ReviewTableProps) {
  const { translate, locale } = useLocale();
  // The share column is headed by the rate when every line has the same one.
  const rates = [...new Set(payout.lines.map((line) => line.rate))];
  const share = rates.length === 1 ? `${toLocaleDigits(String(rates[0]), locale)}%` : translate("Share");
  return (
    <div role="table" aria-label={translate("Friend payments in this request")} className="border-t border-line">
      <div role="row" className={cn(REVIEW_COLUMNS, "items-center bg-table-head px-3 py-2 text-[11.5px] leading-normal font-medium text-ink-muted max-md:hidden")}>
        <span role="columnheader" aria-label={translate("Include")} />
        <span role="columnheader">{translate("Friend")}</span>
        <span role="columnheader">{translate("Plan · paid on")}</span>
        <span role="columnheader" className="text-right">
          {translate("They paid")}
        </span>
        <span role="columnheader">{translate("Did it reach us?")}</span>
        <span role="columnheader" className="text-right">
          {share}
        </span>
      </div>
      {payout.lines.map((line) => {
        const on = !excluded.has(line.id);
        const chip = REACHED_CHIP[line.reached];
        const paidOn = line.payment?.paidAt ? formatDate(line.payment.paidAt, "d MMM", "", locale) : "";
        return (
          <div key={line.id} role="row" className={cn(REVIEW_COLUMNS, "items-center gap-y-1 border-t border-divider px-3 py-2.25 text-[13px] leading-normal tabular-nums", !on && "bg-warning-50/50")}>
            <span role="cell" className="flex">
              <Checkbox
                checked={on}
                onCheckedChange={(next) => onToggle(line.id, next === true)}
                aria-label={translate("Include {name}", { name: line.friend.name })}
                className="size-4.5 rounded-[5px] border-line-strong data-checked:border-emerald data-checked:bg-emerald"
              />
            </span>
            <span role="cell" className="flex min-w-0 flex-col gap-px">
              <span className="truncate font-semibold text-ink">{line.friend.name}</span>
              <span className="truncate text-[11.5px] text-ink-muted">{line.friend.phone ?? line.friend.email}</span>
              {line.paidFromMemberNumber && (
                <span className="flex items-center gap-1 text-[11.5px] text-warning">
                  <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                  {translate("Paid from {name}'s own number", { name: firstName(payout.user.name) })}
                </span>
              )}
            </span>
            <span role="cell" className="flex min-w-0 flex-col gap-px max-md:col-start-2">
              <span className="truncate text-ink">{line.payment?.planName ?? "—"}</span>
              <span className="truncate text-[11.5px] text-ink-muted">{[paidOn, translate(KIND_LABEL[line.kind])].filter(Boolean).join(" · ")}</span>
            </span>
            <span role="cell" className="text-right text-ink-2 max-md:hidden">
              {line.paidAmount !== null && Number(line.paidAmount) > 0 ? money(line.paidAmount) : "—"}
            </span>
            <span role="cell" className="flex min-w-0 flex-col gap-0.5 max-md:col-start-2">
              <span className={cn("inline-flex w-fit items-center gap-1.25 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", chip.className)}>
                <chip.icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
                {translate(REACHED[line.reached].label)}
              </span>
              {line.payment && (
                <span className="truncate font-mono text-[11px] text-ink-muted">
                  {GATEWAY_NAMES[line.payment.gateway] ?? line.payment.gateway} · {line.payment.reference ?? line.payment.displayId}
                </span>
              )}
            </span>
            <span role="cell" className={cn("text-right font-bold max-md:col-start-3 max-md:row-start-1", on ? "text-ink" : "text-ink-muted line-through")}>
              {money(line.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// The request's checks and the member's facts, warnings in amber.
export function ChecksCard({ payout }: { payout: IPayoutDetail }) {
  const { translate, locale } = useLocale();
  const money = (value: string | number | null) => formatCurrency(value ?? 0, undefined, Number(value ?? 0) % 1 ? 2 : 0, locale);
  const lines = deskChecks(payout, (iso) => formatDate(iso, MOMENT, "—", locale));
  const facts = [
    { label: translate("Referring since"), value: payout.member.since ? formatDate(payout.member.since, "d MMM yyyy", "—", locale) : "—" },
    { label: translate("People referred"), value: formatCount(payout.member.referred, locale) },
    { label: translate("Paid to them before"), value: money(payout.member.paidBefore) },
    { label: translate("This request"), value: money(payout.requestedAmount) },
  ];
  return (
    <section aria-labelledby="payout-checks" className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3.5">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col">
            <dt className="text-caption text-ink-muted">{fact.label}</dt>
            <dd className="truncate text-small font-semibold text-ink tabular-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <h3 id="payout-checks" className="sr-only">
        {translate("Checks")}
      </h3>
      <ul className="flex flex-col gap-1.5 border-t border-divider pt-3">
        {lines.map((line) => (
          <li key={line.text} className="flex items-start justify-between gap-2.5 text-small tabular-nums">
            <span className={cn("flex items-start gap-1.5", line.ok ? "text-ink-2" : "text-warning")}>
              {line.ok ? <Check className="mt-0.5 size-3.25 shrink-0 text-emerald" strokeWidth={2.75} aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-3.25 shrink-0" aria-hidden="true" />}
              {translate(line.text, line.values && Object.fromEntries(Object.entries(line.values).map(([k, v]) => [k, typeof v === "number" ? formatCount(v, locale) : v])))}
            </span>
            {line.value && <b className="shrink-0 text-right font-semibold text-ink">{line.value}</b>}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface LinesCardProps {
  payout: IPayoutDetail;
  // At review: the lines unticked (held back), and the toggle; otherwise
  // the lines are only shown.
  excluded?: Set<string>;
  onToggle?: (id: string, keep: boolean) => void;
  // Release or cancel a held line.
  canManage: boolean;
}

// "Friend payments in this request": each friend payment, whether it
// reached us (the gateway and its reference, to match with SSLCommerz,
// bKash or Nagad), and the member's share. At review each has a tick; an
// unticked one is held back as Under check and not paid.
export function LinesCard({ payout, excluded, onToggle, canManage }: LinesCardProps) {
  const { translate, locale } = useLocale();
  const money = (value: string | number | null) => formatCurrency(value ?? 0, undefined, Number(value ?? 0) % 1 ? 2 : 0, locale);
  const [acting, setActing] = useState<{ line: IPayoutLine; kind: "release" | "cancel" } | null>(null);
  const reviewing = Boolean(excluded && onToggle);
  const kept = payout.lines.filter((line) => !excluded?.has(line.id));
  const keptTotal = kept.reduce((sum, line) => sum + Number(line.amount ?? 0), 0);
  const refunded = payout.lines.filter((line) => line.reached !== "RECEIVED").length;

  const release = useActionMutation({
    action: (id: string) => releaseCommissionAction(id),
    successMessage: "Released to the member's balance",
    invalidateKeys: [queryKeys.referrals.all],
  });
  const cancel = useActionMutation({
    action: (id: string) => cancelCommissionAction(id, { reason: "The friend's payment did not reach us" }),
    successMessage: "Commission cancelled",
    invalidateKeys: [queryKeys.referrals.all],
  });

  return (
    <section aria-labelledby="payout-lines" className="flex flex-col overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h3 id="payout-lines" className="text-small font-semibold text-ink-2">
          {translate("Friend payments in this request")}
        </h3>
        <span className={cn("text-caption", refunded > 0 ? "text-warning" : "text-ink-muted")}>
          {refunded > 0
            ? translate(refunded === 1 ? "{count} to look at" : "{count} to look at", { count: formatCount(refunded, locale) })
            : translate("All {count} reached us", { count: formatCount(payout.lines.length, locale) })}
        </span>
      </div>
      {payout.lines.length === 0 ? (
        <p className="border-t border-divider px-4 py-3 text-small text-ink-muted">{translate("This request has no lines (it was made before lines). Pay the amount asked.")}</p>
      ) : excluded && onToggle ? (
        <ReviewTable payout={payout} excluded={excluded} onToggle={onToggle} money={money} />
      ) : (
        <ul>
          {payout.lines.map((line) => {
            const reached = REACHED[line.reached];
            const chip = COMMISSION_STATUS_CHIP[line.status];
            const paidOn = line.payment?.paidAt ? formatDate(line.payment.paidAt, "d MMM", "", locale) : "";
            return (
              <li key={line.id} className="flex items-start gap-3 border-t border-divider px-4 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-body font-semibold text-ink">{line.friend.name}</span>
                    <StatusBadgeCell status={line.status} label={chip.label} tone={chip.tone} dot />
                  </span>
                  <span className="truncate text-caption text-ink-muted">
                    {[line.payment?.planName, paidOn, translate(KIND_LABEL[line.kind])].filter(Boolean).join(" · ")}
                  </span>
                  <span className={cn("text-caption", reached.className)}>
                    {translate(reached.label)}
                    {line.payment && ` · ${GATEWAY_NAMES[line.payment.gateway] ?? line.payment.gateway}${line.payment.reference ? ` ${line.payment.reference}` : ""}`}
                  </span>
                  {line.paidFromMemberNumber && (
                    <span className="flex items-center gap-1 text-caption text-warning">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      {translate("Paid from {name}'s own number", { name: firstName(payout.user.name) })}
                    </span>
                  )}
                  {canManage && canReleaseCommission(line.status) && (
                    <span className="mt-1 flex gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setActing({ line, kind: "release" })}>
                        {translate("Release")}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setActing({ line, kind: "cancel" })} className="border-expense-line text-expense hover:bg-expense-soft">
                        {translate("Cancel commission")}
                      </Button>
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 tabular-nums">
                  <span className="text-body font-bold text-ink">{money(line.amount)}</span>
                  <span className="text-caption text-ink-muted">{translate("of {amount}", { amount: money(line.paidAmount) })}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {reviewing && payout.lines.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-strip px-4 py-2.5 text-small">
          <span className="text-ink-soft">{translate("{kept} of {total} payments", { kept: formatCount(kept.length, locale), total: formatCount(payout.lines.length, locale) })}</span>
          <b className="font-bold text-ink tabular-nums">{money(keptTotal)}</b>
        </div>
      )}
      {reviewing && excluded && excluded.size > 0 && (
        <p className="border-t border-divider bg-warning-50 px-4 py-2.5 text-caption leading-normal text-warning-ink">
          {translate("The unticked payments go back to {name} as Under check and are not paid. Release or cancel them once you know.", { name: firstName(payout.user.name) })}
        </p>
      )}
      <ConfirmDialog
        open={acting !== null}
        onClose={() => setActing(null)}
        onConfirm={async () => {
          if (!acting) return;
          const ok = acting.kind === "release" ? await release.run(acting.line.id) : await cancel.run(acting.line.id);
          if (ok) setActing(null);
        }}
        isPending={release.isPending || cancel.isPending}
        danger={acting?.kind === "cancel"}
        title={acting?.kind === "cancel" ? translate("Cancel this commission?") : translate("Release this payment?")}
        description={
          acting
            ? acting.kind === "cancel"
              ? translate("{name}'s {amount} commission is cancelled: the payment did not reach us. The member is told.", { name: acting.line.friend.name, amount: money(acting.line.amount) })
              : translate("{amount} for {name} goes back to the member's balance to withdraw again.", { name: acting.line.friend.name, amount: money(acting.line.amount) })
            : ""
        }
        confirmLabel={acting?.kind === "cancel" ? translate("Cancel commission") : translate("Release")}
        cancelLabel={translate("Back")}
      />
    </section>
  );
}
