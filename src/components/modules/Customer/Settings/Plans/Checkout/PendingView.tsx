"use client";

import { Check, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import { removePaymentProofAction, submitPaymentDetailsAction, uploadPaymentProofAction } from "@/lib/customer/billingActions";
import { familyName, gatewayLabel, type BillingPlans, type CustomerPayment, type ManualWallet } from "@/lib/customer/billingDisplay";
import { cleanReference, formatWalletNumber, offeredWallets, payerOk, referenceOk } from "@/lib/customer/checkoutDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { MONEY_HOME } from "@/lib/customer/nav";
import { formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "../../SettingsDialog";
import { ManualPanel, type ManualForm } from "./ManualPanel";

// How often the page asks again while an admin checks the money: once the
// payment is confirmed the page turns into "You're all set" by itself.
const RECHECK_MS = 60_000;

const isWallet = (gateway: string): gateway is ManualWallet => gateway === "BKASH" || gateway === "NAGAD" || gateway === "ROCKET" || gateway === "BANK";

// "bKash · Send money", "Bank transfer": how the money was sent.
export function sentByLabel(gateway: string, t: (key: string) => string): string {
  return gateway === "BANK" || !isWallet(gateway) ? t(gatewayLabel(gateway)) : `${gatewayLabel(gateway)} · ${t("Send money")}`;
}

// Checkout › Payment sent for checking (Checkout board, pending): what the
// customer sent, where it stands, and a way to fix a typo in it.
export function PendingView({ payment, plans }: { payment: CustomerPayment; plans: BillingPlans }) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const readOnly = Boolean(user.impersonatedBy);
  const [fixing, setFixing] = useState(false);
  const money = (amount: string | number) => formatCurrency(amount, "BDT", fmt);
  const family = familyName(payment.planName);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, RECHECK_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  const sentAt = payment.submittedAt ?? payment.createdAt;
  const track = [
    { title: t("Sent"), sub: formatRelativeDateTime(sentAt, { t, locale: fmt }), state: "done" as const },
    { title: t("Checking"), sub: t("Usually within 2 hours"), state: "now" as const },
    { title: t("{plan} turns on", { plan: t(family) }), sub: t("We let you know"), state: "next" as const },
  ];
  const rows: [string, string][] = [
    [t("Plan"), t(payment.planName)],
    [t("Amount"), `${money(payment.amount)}${payment.couponCode ? ` · ${payment.couponCode}` : ""}`],
    [t("Sent by"), sentByLabel(payment.gateway, t)],
    [t("From"), payment.payerAccount ? (payment.gateway === "BANK" ? payment.payerAccount : formatWalletNumber(payment.payerAccount)) : "—"],
    [t("TrxID"), payment.reference ?? "—"],
    [t("Sent at"), formatRelativeDateTime(sentAt, { t, locale: fmt })],
    ...(payment.proof ? [[t("Screenshot"), t("Added")] as [string, string]] : []),
  ];

  return (
    <section aria-labelledby="pending-title" className="flex w-194 max-w-full flex-col gap-4.5 self-center rounded-panel border border-line-card bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
          <Clock className="size-6.5" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id="pending-title" className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {t("We got your payment details")}
          </h2>
          <p className="text-[14.5px] leading-[1.55] text-ink-soft">
            {t("We're checking it now. {plan} turns on as soon as it is confirmed, usually within 2 hours. You will get a notification and an email.", { plan: t(payment.planName) })}
          </p>
        </div>
      </div>

      <ol className="grid gap-2.5 sm:grid-cols-3">
        {track.map((step) => (
          <li
            key={step.title}
            aria-current={step.state === "now" ? "step" : undefined}
            className={cn(
              "flex flex-col gap-1.5 rounded-[14px] border px-3.5 py-3",
              step.state === "done" && "border-mint-200 bg-emerald-soft",
              step.state === "now" && "border-warning-line bg-warning-50",
              step.state === "next" && "border-divider bg-strip",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn("flex size-5.5 items-center justify-center rounded-full text-white", step.state === "done" ? "bg-emerald" : step.state === "now" ? "bg-warning-fill" : "bg-input")}
              >
                {step.state === "done" ? <Check className="size-3" strokeWidth={3} /> : step.state === "now" ? <Clock className="size-3" strokeWidth={3} /> : <Plus className="size-3" strokeWidth={3} />}
              </span>
              <b className="text-[14px] font-semibold text-ink">{step.title}</b>
            </span>
            <span className="text-[12.5px] text-ink-soft">{step.sub}</span>
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-x-4 gap-y-2.5 rounded-[14px] bg-strip px-4.5 py-4 text-[14px] sm:grid-cols-[180px_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-semibold break-words text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setFixing(true)}
          disabled={readOnly}
          className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60"
        >
          {t("Fix the details")}
        </button>
        <Link href={MONEY_HOME} className="flex h-11 items-center rounded-full bg-forest px-5 text-[14px] font-semibold text-white hover:bg-forest-hover">
          {t("Go to dashboard")}
        </Link>
      </div>

      <FixDetailsDialog open={fixing} onClose={() => setFixing(false)} payment={payment} plans={plans} />
    </section>
  );
}

// "Fix the details": the way it was sent, the number and the TrxID again,
// and the screenshot. The plan and the amount stay.
function FixDetailsDialog({ open, onClose, payment, plans }: { open: boolean; onClose: () => void; payment: CustomerPayment; plans: BillingPlans }) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const wallets = offeredWallets(plans.paymentAccounts);
  const startWallet = isWallet(payment.gateway) ? payment.gateway : wallets[0].id;
  const sentFrom = payment.payerAccount ? (startWallet === "BANK" ? payment.payerAccount : formatWalletNumber(payment.payerAccount)) : "";
  const blank = (): ManualForm => ({ wallet: startWallet, from: sentFrom, trx: payment.reference ?? "", shot: null });
  const [form, setForm] = useState<ManualForm>(blank);
  const [tried, setTried] = useState(false);
  const [dropSaved, setDropSaved] = useState(false);
  const [busy, startSave] = useTransition();

  // Each opening starts from what was sent.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(blank());
      setTried(false);
      setDropSaved(false);
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!(payerOk(form.wallet, form.from) && referenceOk(form.wallet, form.trx))) {
      setTried(true);
      return;
    }
    startSave(async () => {
      const result = await submitPaymentDetailsAction(payment.id, { gateway: form.wallet, payerAccount: form.from.trim(), reference: cleanReference(form.trx) });
      if (!result.success) {
        toast.error(t(result.message ?? "Couldn't save the details"));
        return;
      }
      if (form.shot) {
        const body = new FormData();
        body.append("screenshot", form.shot);
        const upload = await uploadPaymentProofAction(payment.id, body);
        if (!upload.success) toast.error(t(upload.message ?? "Couldn't add the screenshot"));
      } else if (dropSaved) {
        const removed = await removePaymentProofAction(payment.id);
        if (!removed.success) toast.error(t(removed.message ?? "Couldn't remove the screenshot"));
      }
      toast.success(t("Details saved. We check the new ones."));
      onClose();
      router.refresh();
    });
  }

  return (
    <SettingsDialog
      open={open}
      onClose={onClose}
      busy={busy}
      width="md"
      title={t("Fix the details")}
      description={t("Change how you sent it, the number or the TrxID. The plan and the amount stay the same.")}
      onSubmit={save}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-full border border-input bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60">
            {t("Cancel")}
          </button>
          <button type="submit" disabled={busy} className="flex h-10 items-center gap-2 rounded-full bg-forest px-4.5 text-[14px] font-semibold text-white hover:bg-forest-hover disabled:opacity-60">
            {busy && <Loader size={14} onDark label={t("Loading...")} />}
            {t("Save details")}
          </button>
        </>
      }
    >
      <ManualPanel
        wallets={wallets}
        account={null}
        instructions={null}
        amount={Number(payment.amount)}
        amountText={formatCurrency(payment.amount, "BDT", fmt)}
        reference={user.phone ? { label: t("Your phone"), value: user.phone, byPhone: true } : { label: t("Your name"), value: user.name, byPhone: false }}
        form={form}
        onChange={(next) => setForm((current) => ({ ...current, ...next }))}
        tried={tried}
        readOnly={busy}
        namePlaceholder={user.name}
        savedShot={payment.proof && !dropSaved ? { onRemove: () => setDropSaved(true) } : null}
        stepsHidden
      />
    </SettingsDialog>
  );
}
