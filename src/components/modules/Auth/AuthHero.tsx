"use client";

import { CreditCard, Globe, KeyRound, Landmark, Lock, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import Logo from "@/components/smartly/Logo";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type AuthHeroVariant = "login" | "register" | "narrow";

const RINGS = (
  <>
    <span aria-hidden="true" className="absolute -right-45 -bottom-55 size-155 rounded-full border border-white/14" />
    <span aria-hidden="true" className="absolute -right-15 -bottom-25 size-95 rounded-full border border-white/12" />
  </>
);

// The sign-in hero: what the product is, in a few lines, on the aurora
// gradient. Login shows a few sample cards floating under the headline,
// register three feature cards, and the narrower pages three short rows.
export function AuthHero({ variant }: { variant: AuthHeroVariant }) {
  const { t } = useLocale();

  return (
    <section aria-label={t("About Smartly")} className="relative m-4 hidden flex-col gap-8 overflow-hidden rounded-xl bg-aurora p-10 px-12 text-white lg:flex">
      {RINGS}
      <Logo onDark height={44} alt="" className="relative self-start" />

      {variant === "register" ? (
        <>
          <div className="relative flex max-w-lg flex-col gap-4">
            <p className="text-display tracking-[-0.03em]">{t("Grow smarter, every day.")}</p>
            <p className="text-body-lg text-mint-200">{t("Set up your wallets, add your first transaction and see where every taka goes. Habits and passwords come along too.")}</p>
          </div>
          <ul className="relative flex max-w-130 flex-col gap-3">
            {[
              { icon: <Wallet />, color: "text-emerald", title: "Money that adds up", text: "Income, budgets that warn you early, savings goals and assets." },
              { icon: <CreditCard />, color: "text-pillar-loans", title: "Dena-pawna, settled", text: "Know exactly who owes you, and whom you owe." },
              { icon: <Landmark />, color: "text-pillar-habits", title: "Habits that stick", text: "Prayers, reading and daily goals, tracked in a tap." },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-4 rounded-lg bg-white/10 p-4">
                <IconTile tone="white" className={cn("bg-surface", item.color)}>
                  {item.icon}
                </IconTile>
                <span className="flex flex-col gap-0.5">
                  <b className="text-body font-bold">{t(item.title)}</b>
                  <span className="text-small text-mint-50">{t(item.text)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="relative flex max-w-130 flex-col gap-4">
          <p className={cn("tracking-[-0.03em]", variant === "login" ? "text-display xl:text-display-xl" : "text-display")}>{t("Your money, habits and passwords. Smartly sorted.")}</p>
          <p className="text-body-lg text-mint-200">{t("Income, loans, savings, prayers and every login, in one calm place that tells you what matters.")}</p>
        </div>
      )}

      {variant === "login" && (
        <div className="relative hidden flex-1 xl:block">
          <div className="absolute top-2 left-0 flex w-85 flex-col gap-3 rounded-xl bg-surface p-5 text-ink shadow-[0_28px_60px_-16px_rgba(11,61,46,0.45)]">
            <div className="flex items-center justify-between">
              <span className="text-small text-ink-muted">{t("Total balance")}</span>
              <Chip tone="glow">↑ 15.2%</Chip>
            </div>
            <span className="text-display tabular-nums">৳ 66,750</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-md bg-mint-50 p-3">
                <span className="text-caption font-semibold text-brand-ink">{t("Money in")}</span>
                <span className="text-title font-bold text-emerald tabular-nums">+ ৳ 85,000</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-md bg-expense-soft p-3">
                <span className="text-caption font-semibold text-expense">{t("Money out")}</span>
                <span className="text-title font-bold text-expense tabular-nums">− ৳ 52,300</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 left-95 flex w-60 items-center gap-3 rounded-lg bg-surface p-4 text-ink shadow-[0_28px_60px_-16px_rgba(11,61,46,0.45)]">
            <IconTile tone="habits">
              <Landmark />
            </IconTile>
            <span className="flex flex-col">
              <span className="text-caption font-normal text-ink-muted">{t("Next prayer")}</span>
              <span className="text-title font-bold">Asr · 4:05 pm</span>
            </span>
          </div>
          <div className="absolute top-49 left-75 flex w-80 items-start gap-3 rounded-lg bg-surface p-4 text-ink shadow-[0_28px_60px_-16px_rgba(11,61,46,0.45)]">
            <IconTile tone="insights">
              <TrendingUp />
            </IconTile>
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-semibold">{t("Salary is 80% of your income.")}</span>
              <span className="text-caption font-normal text-ink-muted">{t("Freelance grew from ৳ 8,000 to ৳ 12,000 a month.")}</span>
            </span>
          </div>
          <div className="absolute top-59 left-6 flex w-59 items-center gap-3 rounded-lg bg-surface p-4 text-ink shadow-[0_28px_60px_-16px_rgba(11,61,46,0.45)]">
            <IconTile tone="vault">
              <Lock />
            </IconTile>
            <span className="flex flex-col">
              <span className="text-caption font-normal text-ink-muted">{t("Password vault")}</span>
              <span className="text-title font-bold">{t("14 logins, locked")}</span>
            </span>
          </div>
        </div>
      )}

      {variant === "narrow" && (
        <div className="relative mt-auto flex flex-col gap-4">
          {[
            { icon: <Wallet />, text: "Money, loans and savings in one place" },
            { icon: <KeyRound />, text: "A separate password for your vault" },
            { icon: <Globe />, text: "English and বাংলা, light and dark" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-body text-mint-50">
              <span className="flex size-9 items-center justify-center rounded-md bg-white/12 text-mint-200 [&_svg]:size-4.5">{item.icon}</span>
              {t(item.text)}
            </div>
          ))}
        </div>
      )}

      {variant === "login" && (
        <div className="relative mt-auto flex items-center gap-3 text-small text-mint-50">
          <span>
            {t("English and")}{" "}
            <span lang="bn" className="font-bn">
              বাংলা
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{t("Light and dark")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("Made for Bangladesh")}</span>
        </div>
      )}
      {variant === "register" && (
        <span className="relative mt-auto flex items-center gap-2 text-small text-mint-50">
          <PiggyBank className="size-4" aria-hidden="true" />
          {t("Free to start. Upgrade when you need more.")}
        </span>
      )}
    </section>
  );
}

// The small aurora card phones get above the form instead of the hero.
export function AuthHeroCard() {
  const { t } = useLocale();
  return (
    <div className="relative mx-5 flex items-end justify-between gap-4 overflow-hidden rounded-xl bg-aurora p-5 text-white lg:hidden">
      <span aria-hidden="true" className="absolute -top-17 -right-15 size-45 rounded-full border border-white/14" />
      <div className="relative flex max-w-47.5 flex-col gap-2">
        <p className="text-h3 font-bold tracking-[-0.01em]">{t("Your money, habits and passwords. Smartly sorted.")}</p>
        <p className="text-small leading-snug text-white/84">{t("Money, loans, prayers and every login in one calm place.")}</p>
      </div>
      <div aria-hidden="true" className="relative flex h-18 items-end gap-2">
        {[
          [38, 26],
          [50, 30],
          [44, 34],
          [66, 32],
        ].map(([a, b], index) => (
          <div key={index} className="flex items-end gap-0.75">
            <div className="w-1.75 rounded-t-[3px] bg-white" style={{ height: a }} />
            <div className="w-1.75 rounded-t-[3px] bg-white/45" style={{ height: b }} />
          </div>
        ))}
      </div>
    </div>
  );
}
