"use client";

import { Banknote, Check, Share2, UserPlus } from "lucide-react";
import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface HowItWorksCardProps {
  // Already formatted, like "৳ 100.00".
  reward: string;
}

const RULES = ["Rewards count 30 days after your friend joins, as long as their account is still active.", "Withdraw to any of your wallets or savings pots. No fee.", "Signing up again with your own link does not count.", "Invite as many friends as you like."];

// The three steps and the rules, beside the friends list.
export function HowItWorksCard({ reward }: HowItWorksCardProps) {
  const { t } = useLocale();
  const steps = [
    { icon: Share2, title: t("Share your link"), body: t("On WhatsApp, Messenger or email. Friends sign up with it.") },
    { icon: UserPlus, title: t("They sign up"), body: t("Their account is tied to your code from day one.") },
    { icon: Banknote, title: `${t("You earn")} ${reward}`, body: t("It is ready 30 days later. Withdraw it to any wallet.") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" elevated={false} className="flex flex-col gap-4 p-5">
        <h2 className="text-title font-semibold text-ink">{t("How it works")}</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((step) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-mint-50 text-emerald">
                <step.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{step.title}</span>
                <span className="text-small leading-normal text-ink-muted">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card padding="none" elevated={false} className="flex flex-col gap-3 p-5">
        <h2 className="text-title font-semibold text-ink">{t("The rules")}</h2>
        <ul className="flex flex-col gap-2">
          {RULES.map((rule) => (
            <li key={rule} className="flex gap-2 text-small leading-normal text-ink-2">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
              <span>{t(rule)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
