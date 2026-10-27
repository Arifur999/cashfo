"use client";

import { ArrowDownLeft, ArrowUpRight, ChartPie, FileText, Languages, ShieldCheck, Target, TrendingUp, User, Users } from "lucide-react";
import Logo from "@/components/smartly/Logo";
import { BRAND_NAME } from "@/lib/brand";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { bnHeading } from "./bnType";

export type AuthVariant = "login" | "register" | "admin";

// The boards' gradients, from the palette's own tokens: the app's (Main,
// Register) runs from the primary down to it darkened 18% and 38%; the
// admin panel's (AdminLogin) from forest lifted a little towards the
// primary, through forest, to forest darkened.
export const APP_GRADIENT = "linear-gradient(160deg, var(--emerald) 0%, color-mix(in srgb, var(--emerald) 82%, black) 55%, color-mix(in srgb, var(--emerald) 62%, black) 100%)";
export const APP_GRADIENT_PHONE = "linear-gradient(150deg, var(--emerald) 0%, color-mix(in srgb, var(--emerald) 82%, black) 60%, color-mix(in srgb, var(--emerald) 62%, black) 100%)";
const ADMIN_GRADIENT = "linear-gradient(160deg, color-mix(in srgb, var(--forest) 72%, var(--emerald)) 0%, var(--forest) 45%, color-mix(in srgb, var(--forest) 68%, black) 100%)";

// The sample month-by-month bars on the balance card (Main): income and
// expense heights in px, as the board draws them.
const BARS: [string, number, number][] = [
  ["Apr", 70, 48],
  ["May", 82, 55],
  ["Jun", 64, 60],
  ["Jul", 90, 52],
  ["Aug", 76, 58],
  ["Sep", 98, 50],
];

const REGISTER_POINTS = [
  { icon: ChartPie, title: "Budgets that warn you early", text: "Set a limit for each category and see what's left before you overspend." },
  { icon: Target, title: "Savings goals", text: "Put money aside for what matters and follow every contribution." },
  { icon: Users, title: "Dena-Pawna & loans", text: "Know exactly who owes you, and whom you owe." },
];

const ADMIN_POINTS = [
  { icon: User, text: "Only invited team members can sign in. There is no sign-up here." },
  { icon: FileText, text: "Every change is written to the audit log with your name and IP address." },
  { icon: ShieldCheck, text: "Two-step sign-in keeps the panel safe even if a password leaks." },
];

// The brand on the dark panel: the Smartly icon where the boards draw the
// wallet mark, and the name beside it.
const PanelBrand = ({ admin }: { admin: boolean }) => {
  const { t } = useLocale();
  return (
    <div className="relative flex items-center gap-3">
      <Logo variant="icon" height={40} alt="" className={admin ? "rounded-[11px]" : "rounded-[10px]"} />
      {admin ? (
        <span className="flex flex-col">
          <span className="text-[17px] leading-normal font-bold">{BRAND_NAME}</span>
          <span className="text-small text-white/65">{t("Admin panel")}</span>
        </span>
      ) : (
        <span className="text-h3 font-semibold tracking-[-0.01em]">{BRAND_NAME}</span>
      )}
    </div>
  );
};

// The rings and the soft circle behind the app's panel.
const AppRings = () => (
  <>
    <span aria-hidden="true" className="absolute -top-45 -right-45 size-130 rounded-full border border-white/10" />
    <span aria-hidden="true" className="absolute -top-22.5 -right-22.5 size-85 rounded-full border border-white/10" />
    <span aria-hidden="true" className="absolute -bottom-55 -left-35 size-110 rounded-full bg-white/5" />
  </>
);

const PanelFooter = () => (
  <div className="relative flex items-center gap-2 text-small text-white/80">
    <Languages className="size-4" aria-hidden="true" />
    <span>
      English &amp; <span lang="bn">বাংলা</span> · <LightDark />
    </span>
  </div>
);

const LightDark = () => {
  const { t } = useLocale();
  return <>{t("Light & dark mode")}</>;
};

// Main's picture of the app: the balance card with six months of bars, and
// this month's income and expense floating beside it. Sample figures, drawn
// for the eye only.
const DashboardArt = () => {
  const { locale, t } = useLocale();
  const digits = (text: string) => toLocaleDigits(text, locale);

  return (
    <div aria-hidden="true" className="relative min-h-100 flex-1">
      <div className="absolute top-12 left-0 flex w-[min(440px,100%)] flex-col gap-4 rounded-2xl bg-surface p-6 text-ink shadow-[0_24px_60px_rgba(18,32,29,0.30)]">
        <div className="flex items-center justify-between">
          <span className="text-small font-medium text-ink-muted">{t("Total balance")}</span>
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-caption font-medium text-ink-soft">{t("This month")}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[30px] leading-normal font-bold tracking-[-0.02em] tabular-nums">৳ {digits("12,50,000")}</span>
          <span className="flex items-center gap-1.5 text-caption text-ink-muted">
            <span className="flex items-center gap-0.5 font-semibold text-emerald">
              <TrendingUp className="size-3.5" strokeWidth={2.25} />
              {digits("8.2")}%
            </span>
            <span>{t("vs last month")}</span>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex h-27.5 items-end justify-between border-b border-line px-1.5">
            {BARS.map(([month, income, expense]) => (
              <div key={month} className="flex items-end gap-1">
                <span className="w-3 rounded-t bg-emerald" style={{ height: income }} />
                <span className="w-3 rounded-t bg-chart-expense/60" style={{ height: expense }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1.5 text-[11px] leading-normal text-ink-muted">
            {BARS.map(([month]) => (
              <span key={month} className="w-7 text-center">
                {t(month)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-4 text-caption text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-emerald" />
            {t("Income")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-chart-expense/60" />
            {t("Expense")}
          </span>
        </div>
      </div>

      <FloatCard className="top-0 right-0" tone="income" label={t("Income")} amount={`+ ৳ ${digits("85,000")}`} />
      <FloatCard className="top-79.5 right-3" tone="expense" label={t("Expense")} amount={`− ৳ ${digits("52,300")}`} />
    </div>
  );
};

const FloatCard = ({ className, tone, label, amount }: { className: string; tone: "income" | "expense"; label: string; amount: string }) => (
  <div className={cn("absolute hidden w-53 items-center gap-3 rounded-[14px] bg-surface px-4 py-3.5 text-ink shadow-[0_16px_40px_rgba(18,32,29,0.25)] xl:flex", className)}>
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tone === "income" ? "bg-mint-50 text-emerald" : "bg-expense-soft text-expense-fill")}>
      {tone === "income" ? <ArrowDownLeft className="size-4.5" strokeWidth={2.25} /> : <ArrowUpRight className="size-4.5" strokeWidth={2.25} />}
    </span>
    <span className="flex flex-col gap-0.5">
      <span className="text-caption text-ink-muted">{label}</span>
      <span className={cn("text-title font-bold tabular-nums", tone === "income" ? "text-emerald" : "text-expense-fill")}>{amount}</span>
    </span>
  </div>
);

// The left half of the sign-in pages from lg: Main's balance picture for
// signing in and the password pages, Register's three reasons for signing
// up, and the admin panel's own (AdminLogin) for its invite and reset pages.
const AuthHeroPanel = ({ variant }: { variant: AuthVariant }) => {
  const { locale, t } = useLocale();

  if (variant === "admin") {
    return (
      <section aria-label={t("About the admin panel")} className="relative hidden flex-col justify-between overflow-hidden px-12 py-11 text-white lg:flex" style={{ background: ADMIN_GRADIENT }}>
        <span aria-hidden="true" className="absolute -top-30 -right-30 size-90 rounded-full border border-white/8" />
        <span aria-hidden="true" className="absolute -top-15 -right-15 size-60 rounded-full border border-white/8" />
        <PanelBrand admin />
        <div className="relative flex max-w-105 flex-col gap-5.5">
          <p className={cn("text-[34px] leading-[1.2] font-bold tracking-[-0.02em]", bnHeading(locale))}>{t("Run the platform, safely.")}</p>
          <ul className="flex flex-col gap-3.5 text-[15px] leading-normal text-white/85">
            {ADMIN_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <span className="flex size-6.5 shrink-0 items-center justify-center rounded-lg bg-mint-300/18">
                  <Icon className="size-3.5 text-mint-200" strokeWidth={2.5} aria-hidden="true" />
                </span>
                {t(text)}
              </li>
            ))}
          </ul>
        </div>
        <span className="relative text-[12.5px] text-white/50">{t("{brand} admin · for the team only", { brand: BRAND_NAME })}</span>
      </section>
    );
  }

  if (variant === "register") {
    return (
      <aside className="relative hidden flex-col overflow-hidden px-14 py-12 text-white lg:flex" style={{ background: APP_GRADIENT }}>
        <AppRings />
        <PanelBrand admin={false} />
        <div className="relative flex max-w-120 flex-1 flex-col justify-center gap-12 py-10">
          <div className="flex flex-col gap-3">
            <p className={cn("text-display leading-[1.2] font-bold tracking-[-0.02em]", bnHeading(locale))}>{t("Start managing your money in minutes.")}</p>
            <p className="text-body-lg leading-[1.6] text-white/84">{t("Set up your wallets, add your first transaction, and see where every taka goes.")}</p>
          </div>
          <ul className="flex flex-col gap-7">
            {REGISTER_POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/14">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-title">{t(title)}</span>
                  <span className="text-body leading-[1.55] text-white/82">{t(text)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <PanelFooter />
      </aside>
    );
  }

  return (
    <aside className="relative hidden flex-col gap-10 overflow-hidden px-14 py-12 text-white lg:flex" style={{ background: APP_GRADIENT }}>
      <AppRings />
      <PanelBrand admin={false} />
      <div className="relative flex max-w-117.5 flex-col gap-3">
        <p className={cn("text-display leading-[1.2] font-bold tracking-[-0.02em]", bnHeading(locale))}>{t("Every taka, clearly accounted for.")}</p>
        <p className="text-body-lg leading-[1.6] text-white/84">{t("Income, expenses, budgets, savings goals and loans — together in one calm dashboard.")}</p>
      </div>
      <DashboardArt />
      <PanelFooter />
    </aside>
  );
};

export default AuthHeroPanel;
