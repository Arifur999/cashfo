"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { approvePayoutAction, markPayoutPaidAction } from "@/app/(dashboardLayout)/admin/referrals/_action";
import LoadError from "@/components/modules/Admin/Payments/LoadError";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { METHOD_BRANDS } from "@/lib/customer/referralDisplay";
import { formatDate, toDateTimeInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { payoutDetailQuery } from "@/queries/referral.queries";
import type { IPayoutDetail } from "@/types/referral.types";
import { buildMarkPayoutPaidFormZodSchema, type IMarkPayoutPaidFormValues } from "@/zod/referral.validation";
import { ChecksCard, LinesCard } from "./PayoutLines";
import { firstName, methodName, PAYOUT_STATUS_CHIP, payoutAccountLine, payoutDestination, payoutNumber } from "./payoutsDisplay";
import RejectPayoutDialog from "./RejectPayoutDialog";

// The service's square mark, in its own colour (palette data, like a logo).
export const MethodMark = ({ method, size = "sm" }: { method: IPayoutDetail["method"]; size?: "sm" | "lg" }) => {
  const brand = METHOD_BRANDS[method.type];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center font-extrabold",
        size === "lg" ? "size-11 rounded-[10px] text-[10px]" : "h-5.5 min-w-5.5 rounded-[6px] px-1.5 text-[9.5px]",
        brand.className,
      )}
      style={brand.color ? { backgroundColor: brand.color } : undefined}
    >
      {brand.logo}
    </span>
  );
};

// The board's small mint-edged copy pill.
const CopyPill = ({ value, label }: { value: string; label: string }) => {
  const { translate } = useLocale();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(translate("Couldn't copy -- select the text and copy it manually."));
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-mint-300 bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-brand-ink transition-colors hover:bg-emerald-soft"
    >
      {copied ? <Check className="size-3.25" aria-hidden="true" /> : <Copy className="size-3.25" aria-hidden="true" />}
      {translate(copied ? "Copied" : label)}
    </button>
  );
};

// A numbered step's heading: "1 SEND THIS MONEY".
const StepHeading = ({ step, id, tone, children }: { step: number; id: string; tone: "brand" | "ink"; children: React.ReactNode }) => (
  <h3 id={id} className={cn("flex items-center gap-2 text-small font-bold tracking-[0.04em] uppercase", tone === "brand" ? "text-brand-ink" : "text-ink-2")}>
    <span aria-hidden="true" className={cn("flex size-5 items-center justify-center rounded-full text-[11px] text-white", tone === "brand" ? "bg-emerald" : "bg-ink")}>
      {step}
    </span>
    {children}
  </h3>
);

// What to send and where: the amount, the account, and copy buttons for the
// number and the amount.
const SendBox = ({ payout, heading, step }: { payout: IPayoutDetail; heading: string; step?: number }) => {
  const { translate, locale } = useLocale();
  const amount = payout.status === "PAID" && payout.paidAmount ? payout.paidAmount : payout.sendAmount;
  return (
    <section aria-labelledby="payout-send" className="flex flex-col gap-3 rounded-[14px] border border-mint-200 bg-emerald-soft p-4">
      {step ? (
        <StepHeading step={step} id="payout-send" tone="brand">
          {translate(heading)}
        </StepHeading>
      ) : (
        <h3 id="payout-send" className="text-small font-bold tracking-[0.04em] text-brand-ink uppercase">
          {translate(heading)}
        </h3>
      )}
      <div className="flex items-center gap-3.5">
        <MethodMark method={payout.method} size="lg" />
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-h2 text-forest tabular-nums">{formatCurrency(amount, undefined, Number(amount) % 1 ? 2 : 0, locale)}</span>
          <span className="text-[13.5px] break-words text-brand-ink tabular-nums">
            {[payoutDestination(payout.method), payoutAccountLine(payout.method)].filter(Boolean).join(" · ")}
          </span>
        </span>
      </div>
      {Number(payout.fee) > 0 && (
        <span className="text-small text-brand-ink">
          {translate("{amount} approved, less the {fee} fee", { amount: formatCurrency(payout.amount, undefined, 2, locale), fee: formatCurrency(payout.fee, undefined, 0, locale) })}
        </span>
      )}
      {payout.status !== "PAID" && (
        <div className="flex flex-wrap gap-2">
          <CopyPill value={payoutNumber(payout.method)} label={payout.method.type === "BANK" ? "Copy account number" : "Copy number"} />
          <CopyPill value={String(Number(amount))} label="Copy amount" />
          {payout.method.type === "BANK" && payout.method.routingNumber && <CopyPill value={payout.method.routingNumber} label="Copy routing number" />}
        </div>
      )}
    </section>
  );
};

// A label over a value, for what was recorded.
const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const { translate } = useLocale();
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-small text-ink-muted">{translate(label)}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  );
};

// The foot of a drawer that only shows something: Reject on the left when
// it still can be, Close on the right, and the step's own button.
const ViewFoot = ({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) => (
  <div className="sticky bottom-0 z-10 -mx-6 mt-auto -mb-5 flex items-center gap-2.5 border-t border-line bg-surface px-6 py-3.5">
    {left}
    <span className="grow" />
    {right}
  </div>
);

// Step 2 of an approved request: the transaction ID, when, how much went,
// and whether to tell the member.
const MarkPaidForm = ({ payout, canManage, onDone, onReject }: { payout: IPayoutDetail; canManage: boolean; onDone: () => void; onReject: () => void }) => {
  const { translate, locale } = useLocale();
  const maxAmount = Number(payout.amount);
  const rules = buildMarkPayoutPaidFormZodSchema(maxAmount).shape;
  const { run, isPending } = useActionMutation({
    action: (values: IMarkPayoutPaidFormValues) => markPayoutPaidAction(payout.id, values),
    successMessage: "Marked as paid",
    invalidateKeys: [queryKeys.referrals.all],
  });
  const form = useForm({
    defaultValues: {
      trxId: "",
      paidAt: toDateTimeInputValue(new Date()),
      paidAmount: String(Number(payout.sendAmount)),
      notifyUser: true as boolean,
      note: "",
    } satisfies IMarkPayoutPaidFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) onDone();
    },
  });
  const method = methodName(payout.method);

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col gap-4 space-y-0">
      <SendBox payout={payout} heading="Send this money" step={1} />
      <LinesCard payout={payout} canManage={canManage} />
      <ChecksCard payout={payout} />
      <section aria-labelledby="payout-record" className="flex flex-col gap-3">
        <StepHeading step={2} id="payout-record" tone="ink">
          {translate("Then record it")}
        </StepHeading>
        <form.Field name="trxId" validators={{ onChange: rules.trxId }}>
          {(field) => (
            <AppField
              field={field}
              label={payout.method.type === "BANK" ? translate("Bank reference") : translate("{method} transaction ID", { method: translate(method) })}
              placeholder="e.g. 8K2M4N7QXA"
              autoComplete="off"
              className="font-mono tracking-[0.06em]"
            />
          )}
        </form.Field>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <form.Field name="paidAt" validators={{ onChange: rules.paidAt }}>
            {(field) => <AppField field={field} label="Paid on" type="datetime-local" />}
          </form.Field>
          {/* What goes out is the request less the fee, as the board shows it. */}
          <div className="flex flex-col gap-1.5">
            <span id="payout-amount-sent" className="text-body font-medium text-ink">
              {translate("Amount sent")}
            </span>
            <span aria-labelledby="payout-amount-sent" className="flex h-11 items-center rounded-field border border-line bg-strip px-3 text-body text-ink-2 tabular-nums">
              {formatCurrency(payout.sendAmount, undefined, Number(payout.sendAmount) % 1 ? 2 : 0, locale)}
            </span>
          </div>
        </div>
        <form.Field name="notifyUser">
          {(field) => (
            <label className="flex cursor-pointer items-center gap-2.5 text-body text-ink-2">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
                className="size-4.5 rounded-[5px] border-line-strong data-checked:border-emerald data-checked:bg-emerald"
              />
              {translate("Tell {name} by email and in the app, with the transaction ID", { name: firstName(payout.user.name) })}
            </label>
          )}
        </form.Field>
        {payout.income && (
          <p className="rounded-[10px] bg-strip px-3 py-2.5 text-small text-ink-2">
            {translate("It is also added as income to {wallet} in {workspace}, as {name} asked.", {
              wallet: payout.income.accountName ?? translate("their wallet"),
              workspace: payout.income.businessName ?? translate("their workspace"),
              name: firstName(payout.user.name),
            })}
          </p>
        )}
      </section>
      <FormDialogFooter
        pinned
        isPending={isPending}
        submitLabel="Mark as paid"
        pendingLabel="Saving..."
        extra={
          <Button type="button" variant="secondary" size="md" onClick={onReject} className="border-expense-line text-expense hover:bg-expense-soft">
            {translate("Reject…")}
          </Button>
        }
      />
    </AppForm>
  );
};

// A waiting request: what was asked for, the checks, and Approve.
const ReviewBody = ({ payout, canManage, onDone, onReject }: { payout: IPayoutDetail; canManage: boolean; onDone: () => void; onReject: () => void }) => {
  const { translate, locale } = useLocale();
  // Lines unticked: held back for a second look, not paid.
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(payout.lines.filter((line) => line.reached === "REFUNDED").map((line) => line.id)));
  const { run, isPending } = useActionMutation({
    action: () => approvePayoutAction(payout.id, { excludedIds: [...excluded] }),
    successMessage: "Request approved",
    invalidateKeys: [queryKeys.referrals.all],
  });
  const allHeld = payout.lines.length > 0 && excluded.size === payout.lines.length;
  const keptTotal = payout.lines.filter((line) => !excluded.has(line.id)).reduce((sum, line) => sum + Number(line.amount ?? 0), 0);
  return (
    <AppForm onSubmit={async () => !allHeld && (await run(undefined)) && onDone()} className="flex flex-1 flex-col gap-4 space-y-0">
      <SendBox payout={payout} heading="What they asked for" />
      <LinesCard
        payout={payout}
        canManage={canManage}
        excluded={canManage ? excluded : undefined}
        onToggle={(id, keep) =>
          setExcluded((current) => {
            const next = new Set(current);
            if (keep) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />
      <ChecksCard payout={payout} />
      <p className="text-small text-ink-muted">
        {allHeld ? translate("Every payment is unticked. Reject the request instead.") : translate("Match each payment ID with the gateway. Untick anything that did not reach us, then approve; you send the money and record it next.")}
      </p>
      {canManage ? (
        <FormDialogFooter
          pinned
          isPending={isPending}
          submitLabel={excluded.size > 0 && !allHeld ? translate("Approve {amount}", { amount: formatCurrency(keptTotal, undefined, keptTotal % 1 ? 2 : 0, locale) }) : "Approve"}
          pendingLabel="Approving..."
          extra={
            <Button type="button" variant="secondary" size="md" onClick={onReject} className="border-expense-line text-expense hover:bg-expense-soft">
              {translate("Reject…")}
            </Button>
          }
        />
      ) : (
        <ViewFoot
          right={
            <Button type="button" variant="secondary" size="md" onClick={onDone}>
              {translate("Close")}
            </Button>
          }
        />
      )}
    </AppForm>
  );
};

// A closed request: what happened to it, and when.
const ClosedBody = ({ payout, canManage, onClose }: { payout: IPayoutDetail; canManage: boolean; onClose: () => void }) => {
  const { translate, locale } = useLocale();
  const moment = (iso: string | null) => formatDate(iso, "d MMM yyyy, h:mm aaa", "—", locale);
  return (
    <div className="flex flex-1 flex-col gap-4">
      <SendBox payout={payout} heading={payout.status === "PAID" ? "Sent" : "What they asked for"} />
      {payout.status === "PAID" && (
        <dl className="grid gap-3 rounded-xl border border-line px-4 py-3.5 sm:grid-cols-2">
          <Fact label="Transaction ID">
            <code className="font-mono tracking-[0.04em] select-all">{payout.trxId ?? "—"}</code>
          </Fact>
          <Fact label="Paid on">{moment(payout.paidAt)}</Fact>
          <Fact label="Amount sent">{formatCurrency(payout.paidAmount ?? payout.sendAmount, undefined, 2, locale)}</Fact>
          <Fact label="Paid by">{payout.processedByName ?? "—"}</Fact>
          {payout.income && (
            <div className="sm:col-span-2">
              <Fact label="Added as income">
                {payout.income.transactionId
                  ? translate("{wallet} in {workspace}", { wallet: payout.income.accountName ?? "—", workspace: payout.income.businessName ?? "—" })
                  : translate("Not added: the wallet was gone when it was paid")}
              </Fact>
            </div>
          )}
        </dl>
      )}
      {payout.status === "REJECTED" && (
        <dl className="grid gap-3 rounded-xl border border-expense-line bg-expense-soft/40 px-4 py-3.5">
          <Fact label="Reason">{payout.rejectReason ?? "—"}</Fact>
          <Fact label="Rejected on">{moment(payout.rejectedAt)}</Fact>
          {payout.processedByName && <Fact label="By">{payout.processedByName}</Fact>}
          <span className="text-small text-ink-muted">{translate("The payments went back to the member's balance.")}</span>
        </dl>
      )}
      {payout.status === "CANCELLED" && <p className="text-small text-ink-muted">{translate("The member cancelled this request on {date}. The payments went back to their balance.", { date: moment(payout.cancelledAt) })}</p>}
      <LinesCard payout={payout} canManage={canManage} />
      <ViewFoot
        right={
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            {translate("Close")}
          </Button>
        }
      />
    </div>
  );
};

interface PayoutDrawerProps {
  // The request to show; null closes the drawer.
  payoutId: string | null;
  onClose: () => void;
  canManage: boolean;
}

const titleKey = (payout: IPayoutDetail | undefined, canManage: boolean) => {
  if (!payout) return "Request";
  if (payout.status === "APPROVED" && canManage) return "Pay {id}";
  if (payout.status === "REQUESTED" && canManage) return "Review {id}";
  return "Request {id}";
};

const subtitleKey: Record<IPayoutDetail["status"], string> = {
  REQUESTED: "{name} · asked on {date}",
  APPROVED: "{name} · approved on {date}",
  PAID: "{name} · paid on {date}",
  REJECTED: "{name} · rejected on {date}",
  CANCELLED: "{name} · cancelled on {date}",
};

// One payout request in the design's right-hand drawer: Pay (an approved
// request, the Mark paid board), Review (a waiting one), or what happened
// (a closed one). Opened from a row, or by ?payout=<id>.
const PayoutDrawer = ({ payoutId, onClose, canManage }: PayoutDrawerProps) => {
  const { translate, locale } = useLocale();
  // Kept while the drawer closes, so it doesn't empty out as it slides away.
  const [shownId, setShownId] = useState(payoutId);
  if (payoutId && payoutId !== shownId) setShownId(payoutId);
  const id = payoutId ?? shownId;
  const query = useQuery({ ...payoutDetailQuery(id ?? ""), enabled: Boolean(id) });
  const payout = query.data?.data;
  const [rejecting, setRejecting] = useState(false);

  const chip = payout ? PAYOUT_STATUS_CHIP[payout.status] : null;
  const subtitle = payout
    ? translate(subtitleKey[payout.status], { name: payout.user.name, date: formatDate(payout.statusAt, "d MMM", "—", locale) })
    : undefined;

  return (
    <>
      <FormDrawer
        open={Boolean(payoutId) && !rejecting}
        onOpenChange={(open) => !open && onClose()}
        title={translate(titleKey(payout, canManage), { id: payout?.displayId ?? "" })}
        description={subtitle}
        // The board's status chip, on the right of the head.
        aside={payout && chip ? <StatusBadgeCell status={payout.status} label={chip.label} tone={chip.tone} dot /> : undefined}
        closeOnOutsideClick={!payout || !canManage || (payout.status !== "APPROVED" && payout.status !== "REQUESTED")}
        // The board's widths: 560 to pay, 820 to go through the lines.
        width={payout?.status === "APPROVED" && canManage ? "xl" : "2xl"}
      >
        {!payout ? (
          query.isError ? (
            <LoadError title="Couldn't load this request" onRetry={() => void query.refetch()} />
          ) : (
            <div className="flex flex-col gap-4" aria-busy="true">
              <span className="sr-only">
                <T>Loading...</T>
              </span>
              <Skeleton className="h-36 rounded-[14px]" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          )
        ) : payout.status === "APPROVED" && canManage ? (
          <MarkPaidForm key={payout.id} payout={payout} canManage={canManage} onDone={onClose} onReject={() => setRejecting(true)} />
        ) : payout.status === "REQUESTED" ? (
          <ReviewBody key={payout.id} payout={payout} canManage={canManage} onDone={onClose} onReject={() => setRejecting(true)} />
        ) : (
          <ClosedBody payout={payout} canManage={canManage} onClose={onClose} />
        )}
      </FormDrawer>
      {payout && (
        <RejectPayoutDialog
          payout={payout}
          open={rejecting}
          onOpenChange={(open) => !open && setRejecting(false)}
          onRejected={() => {
            setRejecting(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default PayoutDrawer;
