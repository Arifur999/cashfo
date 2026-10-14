"use client";

import { ArrowLeftRight, Check, ChartColumn, ChartPie, CreditCard, Lock, PiggyBank } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Eyebrow from "@/components/smartly/Eyebrow";
import IconTile from "@/components/smartly/IconTile";
import { MosqueIcon } from "@/components/smartly/icons";
import SectionHeader from "@/components/smartly/SectionHeader";
import type { Tone } from "@/components/smartly/tones";
import { TONE_TEXT } from "@/components/smartly/tones";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface HomeSetupProps {
  hasWallet: boolean;
  hasTransaction: boolean;
  balance: number;
  currency: string;
  onAddTransaction: () => void;
}

const MONEY_CARDS: { icon: React.ReactNode; tone: Tone; title: string; text: string; cta: string; href: string }[] = [
  { icon: <ArrowLeftRight />, tone: "money", title: "No transactions yet", text: "Add your first income or expense to see it here.", cta: "Add transaction", href: "/transactions" },
  { icon: <ChartPie />, tone: "warning", title: "No budget yet", text: "Set a monthly limit and Smartly warns you at 70%.", cta: "Plan a budget", href: "/categories" },
  { icon: <PiggyBank />, tone: "money", title: "No savings goal yet", text: "Name something you are saving for and set a date.", cta: "Add a goal", href: "/savings-goals/dashboard" },
];

const MORE_CARDS: { icon: React.ReactNode; tone: Tone; pillar: string; title: string; text: string; cta: string; href: string }[] = [
  { icon: <CreditCard />, tone: "loans", pillar: "Loans", title: "Dena-pawna", text: "Keep track of who owes you, and whom you owe.", cta: "Add a person or bank", href: "/loan-management/bank-person-list" },
  { icon: <MosqueIcon />, tone: "habits", pillar: "Habits", title: "Namaz and habits", text: "Tick off today's prayers and build a streak.", cta: "Open Namaz", href: "/habit-tracker/habits?category=Namaz" },
  { icon: <Lock />, tone: "vault", pillar: "Security", title: "Password vault", text: "Keep every login behind its own vault password.", cta: "Set up the vault", href: "/password-manager" },
  { icon: <ChartColumn />, tone: "insights", pillar: "Insights", title: "What your numbers say", text: "After a few transactions, Smartly explains them here.", cta: "See the overview", href: "/reports/overview" },
];

// Home for a new account: three steps on the aurora card, then what each
// part of Smartly does once there is something to show.
export function HomeSetup({ hasWallet, hasTransaction, balance, currency, onAddTransaction }: HomeSetupProps) {
  const { t } = useLocale();
  const done = 1 + Number(hasWallet) + Number(hasTransaction);
  const steps = [
    { title: "Create your account", text: "Done. Welcome aboard.", done: true },
    { title: "Add your first wallet", text: "Cash, a bank account, bKash or Nagad.", done: hasWallet, cta: "Add wallet", href: "/balance/wallet" },
    { title: "Add your first transaction", text: "An income or an expense from today.", done: hasTransaction, cta: "Add transaction", action: onAddTransaction },
  ];
  const next = steps.find((step) => !step.done);

  return (
    <>
      <section aria-labelledby="setup-title" className="relative grid items-center gap-6 overflow-hidden rounded-xl bg-aurora p-5 text-white md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-8 md:p-8">
        <span aria-hidden="true" className="absolute -top-35 -right-30 size-105 rounded-full border border-white/16" />
        <div className="relative flex flex-col gap-3">
          <span className="text-body text-mint-200">{t("Total balance")}</span>
          <span className="text-display tabular-nums md:text-display-xl">{formatCurrency(balance, currency)}</span>
          <h2 id="setup-title" className="text-h2">
            {t("Let's set up your money")}
          </h2>
          <span className="text-body text-mint-50">
            {done} {t("of")} 3 {t("done")} · {t("takes about two minutes")}
          </span>
          <span className="h-2 max-w-80 overflow-hidden rounded-full bg-white/18">
            <span className="block h-full rounded-full bg-mint-200" style={{ width: `${(done / 3) * 100}%` }} />
          </span>
        </div>
        <ol className="relative flex flex-col gap-3">
          {steps.map((step, index) => {
            const isNext = step === next;
            return (
              <li key={step.title} className={cn("flex items-center gap-4 rounded-lg p-4", isNext ? "bg-surface text-ink shadow-float" : "bg-white/10")}>
                {step.done ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint-200 text-forest">
                    <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                ) : (
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-small font-extrabold", isNext ? "bg-forest text-white" : "border-[1.5px] border-white/60")}>{index + 1}</span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className={cn("text-body font-bold", step.done && "line-through decoration-white/50")}>{t(step.title)}</b>
                  <span className={cn("text-small", isNext ? "text-ink-muted" : "text-mint-50")}>{t(step.text)}</span>
                </span>
                {isNext && step.cta && (step.href ? (
                  <Button size="lg" asChild className="hidden sm:inline-flex">
                    <Link href={step.href}>{t(step.cta)}</Link>
                  </Button>
                ) : (
                  <Button size="lg" onClick={step.action} className="hidden sm:inline-flex">
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
          {MONEY_CARDS.map((card) => (
            <Card key={card.title} padding="lg" className="flex flex-col items-start gap-3">
              <IconTile tone={card.tone} size={44} className="rounded-md [&_svg]:size-5">
                {card.icon}
              </IconTile>
              <b className="text-title font-semibold text-ink">{t(card.title)}</b>
              <span className="text-body text-ink-muted">{t(card.text)}</span>
              <Button variant="soft" size="sm" asChild className="mt-1">
                <Link href={card.href}>{t(card.cta)}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-more" className="flex flex-col gap-4">
        <SectionHeader id="h-more" eyebrow={t("Also in Smartly")} tone="neutral" title={t("Ready when you are")} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MORE_CARDS.map((card) => (
            <Card key={card.title} interactive asChild className="flex flex-col gap-3">
              <Link href={card.href}>
                <Eyebrow tone={card.tone}>{t(card.pillar)}</Eyebrow>
                <IconTile tone={card.tone} size={44} className="rounded-md [&_svg]:size-5">
                  {card.icon}
                </IconTile>
                <b className="text-title font-semibold text-ink">{t(card.title)}</b>
                <span className="text-body text-ink-muted">{t(card.text)}</span>
                <span className={cn("mt-auto text-body font-semibold", TONE_TEXT.money)}>{t(card.cta)} →</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
