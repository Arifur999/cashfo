"use client";

import { Banknote, Check, ChevronDown, Share2, UserPlus } from "lucide-react";
import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface HowItWorksCardProps {
  // Already formatted, like "৳ 100.00".
  reward: string;
}

// What happens, not more: the backend confirms a reward 30 days after the
// friend signed up, whatever has happened to their account since.
const RULES = ["Rewards count 30 days after your friend joins.", "Withdraw to any wallet or savings wallet. No fee.", "Signing up again with your own link does not count.", "Invite as many friends as you like."];

// The three steps and the rules: beside the friends list from xl, the two
// cards side by side under it on tablets, and one closed "How it works" row
// on phones, so they are there without pushing the list down.
export function HowItWorksCard({ reward }: HowItWorksCardProps) {
  const { t } = useLocale();
  const steps = [
    { icon: Share2, title: t("Share your link"), body: t("On WhatsApp, Messenger, Facebook or email. Friends sign up with it.") },
    { icon: UserPlus, title: t("They sign up"), body: t("Their account is tied to your code from day one.") },
    { icon: Banknote, title: t("You earn {reward}", { reward }), body: t("It is ready 30 days later. Withdraw it to any wallet.") },
  ];

  const stepList = (
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
  );

  const ruleList = (
    <ul className="flex flex-col gap-2">
      {RULES.map((rule) => (
        <li key={rule} className="flex gap-2 text-small leading-normal text-ink-2">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />
          <span>{t(rule)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <Card asChild padding="none" className="md:hidden">
        <details className="group">
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 text-title text-ink [&::-webkit-details-marker]:hidden">
            {t("How it works")}
            <ChevronDown className="size-4.5 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <div className="flex flex-col gap-5 border-t border-divider px-4 pt-4 pb-5">
            {stepList}
            <div className="flex flex-col gap-3">
              <h3 className="text-title text-ink">{t("The rules")}</h3>
              {ruleList}
            </div>
          </div>
        </details>
      </Card>
      <div className="hidden gap-5 md:grid md:grid-cols-2 xl:flex xl:flex-col">
        <Card padding="none" className="flex flex-col gap-4 p-5">
          <h2 className="text-title font-semibold text-ink">{t("How it works")}</h2>
          {stepList}
        </Card>
        <Card padding="none" className="flex flex-col gap-3 p-5">
          <h2 className="text-title font-semibold text-ink">{t("The rules")}</h2>
          {ruleList}
        </Card>
      </div>
    </div>
  );
}
