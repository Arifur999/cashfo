"use client";

import { ChartNoAxesCombined, Languages, PiggyBank, ShieldCheck } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import Logo from "@/components/smartly/Logo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const HIGHLIGHTS = [
  { icon: ChartNoAxesCombined, text: "Track income and expenses across every account" },
  { icon: PiggyBank, text: "Plan budgets and savings goals" },
  { icon: Languages, text: "Bangla and English, on any device" },
  { icon: ShieldCheck, text: "Secure sign-in with Google or a password" },
];

// The left half of the sign-in pages on wide screens: what the product is,
// in a sentence and four lines. Decorative glows sit behind the content.
const AuthBrandPanel = () => {
  const { translate } = useLocale();

  return (
    <aside className="relative hidden overflow-hidden bg-brand-dark text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-32 size-[30rem] rounded-full bg-brand-primary/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-32 size-[28rem] rounded-full bg-emerald-300/10 blur-3xl" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <Logo onDark height={44} className="relative self-start" />

      <div className="relative max-w-md space-y-10">
        <div className="space-y-4">
          <p className="text-sm font-medium text-brand-primary">{translate("Money management for people and businesses")}</p>
          <p className="text-4xl leading-tight font-semibold tracking-tight text-balance">{translate("Every account, every taka, in one place.")}</p>
        </div>
        <ul className="space-y-4">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3.5 text-white/85">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                <Icon className="size-5 text-brand-primary" aria-hidden="true" />
              </span>
              <span className="text-sm leading-snug">{translate(text)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/50">
        © {new Date().getFullYear()} {BRAND_NAME}
      </p>
    </aside>
  );
};

export default AuthBrandPanel;
