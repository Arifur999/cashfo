"use client";

import { ChevronLeft, CircleAlert, Clock, Plus, ShieldCheck, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import { Checkbox } from "@/components/ui/checkbox";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { startWithdrawalAction, type ReferralResult } from "@/lib/customer/referralActions";
import { addWorkingDays, balancesOf, maskAccount, maskWallet, METHOD_BRANDS, programOf, speedOf } from "@/lib/customer/referralDisplay";
import type { Earning, PayoutMethod, PayoutRequest, ReferralProgramInfo, WithdrawalChallenge } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useEarningLine } from "./DashboardCards";
import { WITHDRAWALS_ROUTE } from "./EarningsHero";
import { PayoutMethodDrawer } from "./PayoutMethodDrawer";
import { useMethodWords } from "./PayoutMethodsCard";
import { MethodTile, StepNumber } from "./ReferralBits";
import { WithdrawOtpDialog } from "./WithdrawOtpDialog";
import { WithdrawSubmitted } from "./WithdrawSubmitted";

interface WithdrawPageClientProps {
  info: ReferralProgramInfo | null;
  // Every line ready to withdraw, oldest first.
  lines: Earning[] | null;
  methods: PayoutMethod[];
  // The open workspace, when the reader keeps its books (the income step);
  // null hides the step.
  businessId: string | null;
  wallets: Account[];
  savingsWallets: Account[];
  currency: string;
  userName: string;
  today: string;
}

// The time a code arrived, read in the handler that got it (never during
// a render).
const clockNow = () => Date.now();

type Problem = { field: "amount" | "method" | "income" | "form"; message: string };

// Withdraw your earnings (WithdrawPage): 1 the payments to withdraw (every
// ready commission line, all ticked to start), 2 where it goes (the saved
// accounts, or add one in the drawer), 3 keep your books right (book it as
// Referral income in a wallet when paid; optional), with the summary
// beside it. Continue emails a one-time code; the code makes the request,
// and the page turns into the request sent.
export function WithdrawPageClient({ info, lines, methods: initialMethods, businessId, wallets, savingsWallets, currency, userName, today }: WithdrawPageClientProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const words = useMethodWords();
  const describe = useEarningLine();
  const program = info ? programOf(info) : null;
  const balances = info ? balancesOf(info) : null;
  const available = balances?.available ?? 0;
  const minimum = program?.minWithdrawal ?? 0;
  const fee = program?.fee ?? 0;

  const [methods, setMethods] = useState(initialMethods);
  const usable = (method: PayoutMethod) => !program || program.methods.includes(method.type);
  const [methodId, setMethodId] = useState(() => (initialMethods.find((m) => m.isDefault && usable(m)) ?? initialMethods.find(usable))?.id ?? "");
  const readyLines = lines ?? [];
  const [picked, setPicked] = useState<Set<string>>(() => new Set(readyLines.map((line) => line.id)));
  const allWallets = [...wallets, ...savingsWallets];
  const [bookIt, setBookIt] = useState(businessId !== null && allWallets.length > 0);
  const [walletId, setWalletId] = useState(allWallets[0]?.id ?? "");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [challenge, setChallenge] = useState<WithdrawalChallenge | null>(null);
  const [issuedAt, setIssuedAt] = useState(0);
  // The request made, and what was left to withdraw after it (worked out
  // once: the refresh that follows brings the balance with it taken off).
  const [submitted, setSubmitted] = useState<{ request: PayoutRequest; left: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!info || !program || !balances || !lines) {
    return (
      <PageFrame className="max-md:pt-4 md:gap-[18px] leading-[normal] md:pt-6 md:pb-8">
        <TopbarExtras heading={t("Withdrawals")} />
        <ErrorState title={t("Couldn't load your invite details")} onRetry={() => router.refresh()} />
      </PageFrame>
    );
  }

  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const amount = readyLines.filter((line) => picked.has(line.id)).reduce((sum, line) => Math.round((sum + Number(line.amount)) * 100) / 100, 0);
  const allPicked = readyLines.length > 0 && picked.size === readyLines.length;
  const method = methods.find((m) => m.id === methodId) ?? null;
  const wallet = allWallets.find((w) => w.id === walletId) ?? null;
  const walletName = (w: Account) => accountDisplayName(w, displayLanguage(locale));
  const receive = Math.max(0, amount - fee);
  const amountIssue = picked.size === 0 ? "NO_LINES" : amount < minimum ? "BELOW_MINIMUM" : amount <= fee ? "FEE_EXCEEDS_AMOUNT" : null;
  const payBy = addWorkingDays(today, program.payWithinDays);
  const payByText = formatDate(`${payBy}T06:00:00Z`, "EEE, d MMM", payBy, fmt);
  const destination = method ? (method.type === "BANK" ? (method.bankName ?? t("Bank")) : METHOD_BRANDS[method.type].name) : "";
  const destinationNumber = method ? (method.type === "BANK" ? maskAccount(method.accountNumber) : maskWallet(method.walletNumber)) : "";
  const errorFor = (field: Problem["field"]) => (problem?.field === field ? problem.message : null);

  const amountMessage = (issue: NonNullable<typeof amountIssue>) =>
    issue === "BELOW_MINIMUM"
      ? t("The smallest withdrawal is {amount}. Tick more payments.", { amount: money(minimum) })
      : issue === "FEE_EXCEEDS_AMOUNT"
        ? t("The amount must be more than the transfer fee.")
        : t("Tick the payments you want to withdraw.");

  function pick(ids: string[]) {
    setPicked(new Set(ids));
    if (problem?.field === "amount") setProblem(null);
  }

  // The API's refusal, put where it belongs.
  function refused(result: ReferralResult<unknown>) {
    const reason = result.reason ?? "";
    setChallenge(null);
    if (reason === "BELOW_MINIMUM") setProblem({ field: "amount", message: t("The smallest withdrawal is {amount}.", { amount: money(result.minWithdrawal ?? minimum) }) });
    else if (reason === "LINES_CHANGED" || reason === "NO_LINES") {
      setProblem({ field: "amount", message: t("Some of these payments are no longer ready. We reloaded the list; tick them again.") });
      router.refresh();
    } else if (reason === "FEE_EXCEEDS_AMOUNT") setProblem({ field: "amount", message: t("The amount must be more than the transfer fee.") });
    else if (reason === "METHOD_NOT_FOUND") {
      setProblem({ field: "method", message: t("That account was removed. Choose another, or add one.") });
      router.refresh();
    } else if (reason === "METHOD_NOT_ALLOWED") setProblem({ field: "method", message: t(result.message ?? "Withdrawals to this account are not available right now.") });
    else if (reason === "INCOME_NOT_ALLOWED") setProblem({ field: "income", message: t(result.message ?? "Pick a cash, bank, mobile banking or savings wallet") });
    else if (reason === "EMAIL_NOT_CONFIGURED" || reason === "CODE_NOT_SENT" || reason === "EMAIL_NOT_SENT")
      setProblem({ field: "form", message: t(result.message ?? "We could not send the code. Please try again in a minute.") });
    else setProblem({ field: "form", message: t(result.message ?? "We couldn't start the withdrawal. Please try again.") });
  }

  async function start(): Promise<void> {
    const result = await startWithdrawalAction({
      commissionIds: [...picked],
      methodId,
      ...(bookIt && businessId && wallet && { income: { businessId, accountId: wallet.id } }),
    }).catch(() => null);
    if (!result) {
      setProblem({ field: "form", message: t("Couldn't reach Smartly. Check your connection and try again.") });
      setChallenge(null);
      return;
    }
    if (result.success && result.data) {
      setProblem(null);
      setIssuedAt(clockNow());
      setChallenge(result.data);
    } else refused(result);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    if (amountIssue) {
      setProblem({ field: "amount", message: amountMessage(amountIssue) });
      return;
    }
    if (!method) {
      setProblem({ field: "method", message: t("Choose where the money should go.") });
      return;
    }
    startTransition(() => start());
  }

  function methodSaved(saved: PayoutMethod | null) {
    setDrawerOpen(false);
    if (!saved) return;
    setMethods((current) => [...current.filter((m) => m.id !== saved.id).map((m) => (saved.isDefault ? { ...m, isDefault: false } : m)), saved]);
    setMethodId(saved.id);
    if (problem?.field === "method") setProblem(null);
    router.refresh();
  }

  if (submitted) {
    return (
      <PageFrame className="max-md:pt-4 leading-[normal] md:pt-6 md:pb-8">
        <TopbarExtras heading={t("Withdrawals")} />
        <WithdrawSubmitted
          request={submitted.request}
          left={submitted.left}
          pending={balances.onHold}
          pendingNextAt={balances.onHoldNextAt}
          incomeWallet={submitted.request.income ? (submitted.request.income.accountName ?? (wallet ? walletName(wallet) : null)) : null}
          currency={currency}
          today={today}
        />
      </PageFrame>
    );
  }

  const facts = [
    { icon: Clock, text: t("Paid by {date} ({days} working days; Friday and Saturday are off).", { date: payByText, days: formatCount(program.payWithinDays, fmt) }) },
    { icon: X, text: t("You can cancel while we are still checking.") },
    { icon: ShieldCheck, text: t("We send you a 6-digit code before anything is sent.") },
  ];

  return (
    <PageFrame className="max-md:pt-4 md:gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <TopbarExtras heading={t("Withdrawals")} />
      <Link href={WITHDRAWALS_ROUTE} className="flex w-fit items-center gap-1.5 rounded-sm text-[13.5px] font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("Withdrawals")}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-page-title text-ink">{t("Withdraw your earnings")}</h1>
        <p className="text-body text-ink-muted">{t("Pick what to withdraw and where to send it. We check each friend's payment, then send the money, usually within {days} working days.", { days: formatCount(program.payWithinDays, fmt) })}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:gap-[18px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="none" asChild>
          <form onSubmit={submit} noValidate className="flex flex-col">
            {available < minimum && (
              <div role="note" className="mx-4 mt-4 flex items-start gap-2.5 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3 text-[13px] leading-[normal] text-warning-ink md:mx-6 md:mt-5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <span>{t("You have {amount} ready. You can withdraw once you have {min}.", { amount: money(available), min: money(minimum) })}</span>
              </div>
            )}
            <section aria-labelledby="wd-s1" className="flex flex-col gap-3 border-b border-divider px-4 py-5 md:px-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="wd-s1" className="flex items-center gap-2.5 text-title text-ink">
                  <StepNumber n={1} />
                  {t("What you're withdrawing")}
                </h2>
                {readyLines.length > 1 && (
                  <button type="button" onClick={() => pick(allPicked ? [] : readyLines.map((line) => line.id))} className="rounded-sm text-[13px] font-semibold text-emerald hover:underline">
                    {allPicked ? t("Untick all") : t("Tick all")}
                  </button>
                )}
              </div>
              {readyLines.length === 0 ? (
                <p className="rounded-field border border-line px-3.5 py-3 text-small text-ink-muted">{t("Nothing is ready to withdraw yet. Each payment is ready {days} days after your friend pays.", { days: formatCount(program.holdDays, fmt) })}</p>
              ) : (
                <div className="overflow-hidden rounded-field border border-line">
                  <ul aria-labelledby="wd-s1">
                    {readyLines.map((line) => {
                      const on = picked.has(line.id);
                      return (
                        <li key={line.id} className="border-b border-divider last:border-b-0">
                          <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-hover">
                            <Checkbox checked={on} onCheckedChange={(next) => pick(next === true ? [...picked, line.id] : [...picked].filter((id) => id !== line.id))} className="size-4.5 rounded-[5px] border-[1.5px] border-ink-faint" />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-body font-semibold text-ink">{line.friendName}</span>
                              <span className="truncate text-caption text-ink-muted">{describe(line, today)}</span>
                            </span>
                            <span className="text-caption text-ink-muted tabular-nums max-sm:hidden">{Number(line.paidAmount) > 0 ? t("paid {amount}", { amount: money(line.paidAmount) }) : ""}</span>
                            <span className={cn("w-24 text-right text-body font-bold tabular-nums", on ? "text-ink" : "text-ink-muted")}>{money(line.amount)}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center justify-between gap-3 border-t border-line bg-strip px-3.5 py-2.5 text-small">
                    <span className="text-ink-soft">{t("{picked} of {total} payments", { picked: formatCount(picked.size, fmt), total: formatCount(readyLines.length, fmt) })}</span>
                    <b className="font-bold text-ink tabular-nums">{money(amount)}</b>
                  </div>
                </div>
              )}
              {errorFor("amount") ? (
                <p role="alert" className="flex items-center gap-2 text-caption text-expense">
                  <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                  {errorFor("amount")}
                </p>
              ) : (
                picked.size > 0 && <span className="text-[12.5px] text-ink-muted">{t(picked.size === 1 ? "Our team checks this payment before sending the money." : "Our team checks these {count} payments before sending the money.", { count: formatCount(picked.size, fmt) })}</span>
              )}
            </section>

            <section aria-labelledby="wd-s2" className="flex flex-col gap-3 border-b border-divider px-4 py-5 md:px-6">
              <h2 id="wd-s2" className="flex items-center gap-2.5 text-title text-ink">
                <StepNumber n={2} />
                {t("Where should it go?")}
              </h2>
              <div role="radiogroup" aria-labelledby="wd-s2" className="flex flex-col gap-2">
                {methods.map((m) => {
                  const on = m.id === methodId;
                  const off = !usable(m);
                  const speed = speedOf(m.type, program.payWithinDays);
                  const title = words.title(m);
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3.5 rounded-field px-3.5 py-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-focus-ring",
                        on ? "border-[1.5px] border-emerald bg-emerald-soft" : "border border-line bg-surface hover:border-line-strong",
                        off && "cursor-not-allowed opacity-55",
                      )}
                    >
                      <input
                        type="radio"
                        name="payout-method"
                        value={m.id}
                        checked={on}
                        disabled={off}
                        onChange={() => {
                          setMethodId(m.id);
                          if (problem?.field === "method") setProblem(null);
                        }}
                        className="sr-only"
                      />
                      <span aria-hidden="true" className={cn("size-4.5 shrink-0 rounded-full bg-surface", on ? "border-[5px] border-emerald" : "border-[1.5px] border-ink-faint")} />
                      <MethodTile method={m} size="lg" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-2 text-body leading-[normal] font-semibold text-ink">
                          <span className="truncate">{title}</span>
                          {m.isDefault && <span className="shrink-0 rounded-full bg-surface-sunken px-1.75 py-px text-[11px] font-semibold text-ink-soft">{t("Default")}</span>}
                        </span>
                        <span className="truncate text-[12.5px] leading-[normal] text-ink-muted tabular-nums">{words.detail(m, { withName: true, withBranch: true })}</span>
                        {!m.nameMatches && <span className="text-caption leading-[normal] text-warning">{t("The name on this account isn't {name}. The payment may be rejected.", { name: userName })}</span>}
                      </span>
                      <span className="shrink-0 text-[12.5px] text-ink-muted max-sm:hidden">
                        {off ? t("Not available right now") : t("{from}–{to} working days", { from: formatCount(speed.from, fmt), to: formatCount(speed.to, fmt) })}
                      </span>
                    </label>
                  );
                })}
                <button type="button" onClick={() => setDrawerOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-input bg-surface px-4 py-2 text-center text-body font-semibold text-emerald hover:border-emerald">
                  <Plus className="size-4" strokeWidth={2.25} aria-hidden="true" />
                  {t("Add bKash, Nagad, Rocket or bank account")}
                </button>
              </div>
              {errorFor("method") && (
                <p role="alert" className="flex items-center gap-2 text-caption text-expense">
                  <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                  {errorFor("method")}
                </p>
              )}
            </section>

            {businessId && (
              <section aria-labelledby="wd-s3" className="flex flex-col gap-3 px-4 py-5 md:px-6">
                <h2 id="wd-s3" className="flex items-center gap-2.5 text-title text-ink">
                  <StepNumber n={3} />
                  {t("Keep your books right")} <span className="text-[13px] font-normal text-ink-muted">({t("optional")})</span>
                </h2>
                {allWallets.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-field border border-line px-3.5 py-3">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-body leading-[1.45] text-ink">
                      <Checkbox
                        checked={bookIt}
                        onCheckedChange={(next) => {
                          setBookIt(next === true);
                          if (problem?.field === "income") setProblem(null);
                        }}
                        className="size-4.5 rounded-[5px] border-[1.5px] border-ink-faint"
                      />
                      <span>{fillNodes(t("When it's paid, add {amount} as {income} to my wallet"), { amount: money(amount || 0), income: <b className="font-semibold">{t("Referral income")}</b> })}</span>
                    </label>
                    <NativeSelect
                      size="sm"
                      aria-label={t("Wallet")}
                      value={walletId}
                      disabled={!bookIt}
                      onChange={(event) => {
                        setWalletId(event.target.value);
                        if (problem?.field === "income") setProblem(null);
                      }}
                      className="max-w-48 text-[13.5px] font-normal"
                    >
                      {wallets.length > 0 && savingsWallets.length > 0 ? (
                        <>
                          <optgroup label={t("Wallets")}>
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {walletName(w)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={t("Savings wallets")}>
                            {savingsWallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {walletName(w)}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      ) : (
                        allWallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {walletName(w)}
                          </option>
                        ))
                      )}
                    </NativeSelect>
                  </div>
                ) : (
                  <p className="text-small text-ink-muted">
                    {t("No wallet yet.")}{" "}
                    <Link href="/balance/accounts" className="font-semibold text-emerald hover:underline">
                      {t("Add a wallet")}
                    </Link>
                  </p>
                )}
                {errorFor("income") ? (
                  <p role="alert" className="flex items-center gap-2 text-caption text-expense">
                    <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                    {errorFor("income")}
                  </p>
                ) : (
                  <span className="text-[12.5px] text-ink-muted">{t("Pick the wallet where the money will land. You can add a bKash wallet under Balance › Wallet.")}</span>
                )}
              </section>
            )}

            {errorFor("form") && (
              <p role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense md:mx-6">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {errorFor("form")}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 rounded-b-card border-t border-line bg-strip px-4 py-3.5 max-sm:flex-col-reverse max-sm:items-stretch md:px-6">
              <Button asChild variant="ghost" size="lg" className="h-10.5 px-4 text-ink-soft">
                <Link href={WITHDRAWALS_ROUTE}>{t("Cancel")}</Link>
              </Button>
              <Button type="submit" size="lg" disabled={isPending || readyLines.length === 0 || available < minimum} className="h-10.5 px-4.5">
                {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <ShieldCheck className="size-4" />}
                {t("Continue · confirm with a code")}
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="none" asChild>
          <aside aria-labelledby="wd-sum" className="flex flex-col gap-3.5 p-5">
            <h2 id="wd-sum" className="text-title text-ink">
              {t("Summary")}
            </h2>
            <dl className="flex flex-col gap-2.5 text-body tabular-nums">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{t("Ready now")}</dt>
                <dd className="font-semibold text-ink">{money(available)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{t("This withdrawal")}</dt>
                <dd className="font-semibold text-ink">− {money(amount || 0)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">{t("Transfer fee")}</dt>
                <dd className={cn("font-semibold", fee > 0 ? "text-ink" : "text-emerald")}>{fee > 0 ? money(fee) : t("{amount} · we pay it", { amount: money(0) })}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1 rounded-[14px] border border-emerald-line bg-emerald-soft p-3.5">
              <span className="text-[12.5px] text-brand-ink">{t("You receive")}</span>
              <span className="text-[26px] leading-[normal] font-bold text-emerald tabular-nums">{money(receive)}</span>
              {method && (
                <span className="text-[12.5px] text-brand-ink">
                  {t("on {service} {number} · {name}", { service: destination, number: destinationNumber, name: method.accountName })}
                </span>
              )}
            </div>
            <div className="flex justify-between gap-3 text-body tabular-nums">
              <span className="text-ink-soft">{t("Left after this")}</span>
              <b className="font-bold text-ink">{money(Math.max(0, available - (amount || 0)))}</b>
            </div>
            <ul className="flex flex-col gap-2.25 border-t border-divider pt-3">
              {facts.map((fact) => (
                <li key={fact.text} className="flex gap-2 text-[12.5px] leading-[normal] text-ink-soft">
                  <fact.icon className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span>{fact.text}</span>
                </li>
              ))}
            </ul>
          </aside>
        </Card>
      </div>

      <PayoutMethodDrawer open={drawerOpen} method={null} userName={userName} allowed={program.methods} isFirst={methods.length === 0} onClose={() => setDrawerOpen(false)} onSaved={methodSaved} />
      <WithdrawOtpDialog
        challenge={challenge}
        issuedAt={issuedAt}
        amount={money(amount)}
        destination={destination}
        onBack={() => setChallenge(null)}
        onConfirmed={(request) => {
          setChallenge(null);
          setSubmitted({ request, left: Math.max(0, available - Number(request.amount)) });
          router.refresh();
        }}
        onRestart={() => start()}
        onRefused={refused}
      />
    </PageFrame>
  );
}
