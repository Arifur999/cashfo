"use client";

import { ArrowLeftRight, Check, ChartPie, CreditCard, PiggyBank } from "lucide-react";
import Link from "next/link";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Eyebrow from "@/components/smartly/Eyebrow";
import IconTile from "@/components/smartly/IconTile";
import SectionHeader from "@/components/smartly/SectionHeader";
import type { Tone } from "@/components/smartly/tones";
import { TONE_TEXT } from "@/components/smartly/tones";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HomePartError } from "./HomePartError";
import type { HomeData } from "./homeTypes";

// Bangla's vowel signs need more room than these fixed lines when they wrap.
const BN_LEADING = "[.font-bn_&]:leading-normal";
// The steps that aren't next sit on the aurora; a forest fill keeps their
// text above 4.5:1 down at its light end, where a white wash did not.
const STEP_FILL = "bg-forest/55";

interface HomeSetupProps {
  data: HomeData;
  onAddTransaction: () => void;
}

interface MoneyCard {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  text: string;
  cta: string;
  // A page to open, or (no href) the transaction drawer.
  href?: string;
  // Already done before the first transaction: says so, and opens it.
  done?: { title: string; text: string; cta: string; href: string };
  // Its read failed: the card keeps its name and says it couldn't load,
  // rather than claim there is nothing yet.
  failed?: { name: string };
}

// Home for a new account: three steps on the aurora card, then the money
// cards. The parts that need no wallet (habits, the vault, loans already
// kept) follow as their real sections, from HomePageClient.
export function HomeSetup({ data, onAddTransaction }: HomeSetupProps) {
  const { t, locale } = useLocale();
  const { canManage, currency } = data;
  const hasWallet = data.setup?.hasWallet ?? true;
  const hasTransaction = data.setup?.hasTransaction ?? true;
  const done = 1 + Number(hasWallet) + Number(hasTransaction);
  // Only an owner or accountant can add these; anyone else is told who can.
  const steps = [
    { title: "Create your account@@step", text: "Done. Welcome aboard.", done: true },
    {
      title: "Add your first wallet",
      text: canManage ? "Cash, a bank account, bKash or Nagad." : "Ask the workspace owner to add a wallet.",
      done: hasWallet,
      cta: canManage ? "Add wallet" : undefined,
      // ?new=1 asks My wallets to open its Add wallet drawer straight away,
      // as Balance › Overview's own "Add wallet" does; Savings › Goals is
      // asked the same for "Add a goal".
      href: "/balance/wallet?new=1",
    },
    {
      title: "Add your first transaction",
      text: canManage ? "An income or an expense from today." : "Ask the workspace owner to add the first transaction.",
      done: hasTransaction,
      cta: canManage ? "Add transaction" : undefined,
      action: onAddTransaction,
    },
  ];
  const next = steps.find((step) => !step.done);

  const moneyCards: MoneyCard[] = [
    // The same drawer as the step above, not the list page.
    { icon: <ArrowLeftRight />, tone: "money", title: "No transactions yet", text: "Add your first income or expense to see it here.", cta: "Add transaction" },
    {
      icon: <ChartPie />,
      tone: "warning",
      title: "No budget yet",
      text: "Set a monthly limit and Smartly warns you at 70%.",
      cta: "Plan a budget",
      href: "/categories",
      done: data.hasBudget ? { title: "Your budget is planned", text: "Smartly warns you when a category reaches 70%.", cta: "See your budget", href: "/categories" } : undefined,
      failed: data.unavailable.includes("budget") ? { name: "Budget" } : undefined,
    },
    {
      icon: <PiggyBank />,
      tone: "money",
      title: "No savings goal yet",
      text: "Name something you are saving for and set a date.",
      cta: "Add a goal",
      href: "/savings-goals/dashboard?new=1",
      done: data.goalCount > 0 ? { title: "Your savings goal is set", text: "Add money to it whenever you can.", cta: "Open goals", href: "/savings-goals/dashboard" } : undefined,
      failed: data.unavailable.includes("savings") ? { name: "Savings goals" } : undefined,
    },
  ];

  return (
    <>
      <section aria-labelledby="setup-title" className="relative grid items-center gap-6 overflow-hidden rounded-xl bg-aurora p-5 text-white md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-8 md:p-8">
        <span aria-hidden="true" className="absolute -top-35 -right-30 size-105 rounded-full border border-white/16" />
        <div className="relative flex flex-col gap-3">
          {/* Active wallets only, as on the hero: Balance's word for it. */}
          <span className="text-body text-mint-200">{t("Available balance")}</span>
          <span className="text-display tabular-nums md:text-display-xl">{formatCurrency(data.balance, currency)}</span>
          <h2 id="setup-title" className="text-h2 leading-7">
            {t("Let's set up your money")}
          </h2>
          <span className={cn("text-body leading-5 text-mint-50", BN_LEADING)}>
            {t("{done} of {total} done", { done: formatCount(done, locale), total: formatCount(steps.length, locale) })} · {t("takes about two minutes")}
          </span>
          <span className="h-2 max-w-80 overflow-hidden rounded-full bg-white/18">
            <span className="block h-full rounded-full bg-mint-200" style={{ width: `${(done / steps.length) * 100}%` }} />
          </span>
        </div>
        <ol className="relative flex flex-col gap-3">
          {steps.map((step, index) => {
            const isNext = step === next;
            return (
              // The next step stacks its button under it on phones, full width.
              <li key={step.title} aria-current={isNext ? "step" : undefined} className={cn("flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:gap-4", isNext ? "bg-surface text-ink shadow-float" : STEP_FILL)}>
                <span className="flex min-w-0 flex-1 items-center gap-4">
                  {step.done ? (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint-200 text-forest">
                      <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  ) : (
                    <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-small font-extrabold", isNext ? "bg-forest text-white" : "border-[1.5px] border-white/60")}>
                      {formatCount(index + 1, locale)}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    {/* Screen readers hear what the ticks and the highlight show. */}
                    <span className="sr-only">{step.done ? `${t("Done")}: ` : isNext ? `${t("Next step")}: ` : ""}</span>
                    <b className={cn("text-body leading-5 font-bold", step.done && "line-through decoration-white/50")}>{t(step.title)}</b>
                    <span className={cn("text-small", isNext ? "text-ink-muted" : "text-mint-50")}>{t(step.text)}</span>
                  </span>
                </span>
                {isNext &&
                  step.cta &&
                  (step.href ? (
                    <Button size="lg" asChild className="w-full sm:w-auto">
                      <Link href={step.href}>{t(step.cta)}</Link>
                    </Button>
                  ) : (
                    <Button size="lg" onClick={step.action} className="w-full sm:w-auto">
                      {t(step.cta)}
                    </Button>
                  ))}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="h-money" className="flex flex-col gap-4">
        <SectionHeader id="h-money" eyebrow={t("Money")} title={t("Income & expense")} />
        <div className="grid gap-6 md:grid-cols-3">
          {moneyCards.map((card) => {
            if (card.failed) {
              return (
                <Card key={card.title} padding="lg" className="flex flex-col items-start gap-3">
                  <IconTile tone={card.tone} size={40}>
                    {card.icon}
                  </IconTile>
                  <b className="text-title leading-5.5 font-semibold text-ink">{t(card.failed.name)}</b>
                  <HomePartError compact />
                </Card>
              );
            }
            const shown = card.done ?? card;
            // A step only an owner or accountant can take shows no button.
            const cta = card.done ? card.done.cta : canManage ? card.cta : null;
            return (
              <Card key={card.title} padding="lg" className="flex flex-col items-start gap-3">
                <span className="relative">
                  <IconTile tone={card.tone} size={40}>
                    {card.icon}
                  </IconTile>
                  {card.done && (
                    <span className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-emerald text-on-action">
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </span>
                <b className="text-title leading-5.5 font-semibold text-ink">{t(shown.title)}</b>
                <span className={cn("text-body leading-5 text-ink-muted", BN_LEADING)}>{t(shown.text)}</span>
                {cta &&
                  (card.done || card.href ? (
                    <Button variant="soft" size="lg" asChild className="mt-1 md:h-9 md:px-4 md:text-small">
                      <Link href={card.done?.href ?? card.href ?? "/"}>{t(cta)}</Link>
                    </Button>
                  ) : (
                    <Button variant="soft" size="lg" onClick={onAddTransaction} className="mt-1 md:h-9 md:px-4 md:text-small">
                      {t(cta)}
                    </Button>
                  ))}
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

// What else Smartly does, for a part that has no section of its own on the
// setup screen yet: Dena-pawna before anyone was added (its section shows
// once someone is), and only while Loans is switched on -- the loan pages
// send everyone back to Home while it is off.
export function HomeSetupMore({ showLoans, canManage }: { showLoans: boolean; canManage: boolean }) {
  const { t } = useLocale();
  const loansOn = useFeature("loan_management");
  if (!loansOn || !showLoans) return null;

  return (
    <section aria-labelledby="h-more" className="flex flex-col gap-4">
      <SectionHeader id="h-more" eyebrow={t("Also in Smartly")} tone="neutral" title={t("Ready when you are")} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card interactive asChild className="flex flex-col gap-3">
          <Link href="/loan-management/bank-person-list">
            <Eyebrow tone="loans">{t("Loans")}</Eyebrow>
            <IconTile tone="loans" size={40}>
              <CreditCard />
            </IconTile>
            <b className="text-title leading-5.5 font-semibold text-ink">{t("Dena-pawna@@home")}</b>
            <span className={cn("text-body leading-5 text-ink-muted", BN_LEADING)}>{t("Keep track of who owes you, and whom you owe.")}</span>
            <span className={cn("mt-auto text-body font-semibold", TONE_TEXT.money)}>{canManage ? t("Add a person or bank") : t("Open loans")} →</span>
          </Link>
        </Card>
      </div>
    </section>
  );
}
