"use client";

import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/shared/Loader";
import { cn } from "@/lib/utils";

export interface PlanCardModel {
  key: string;
  name: string;
  who: string;
  icon: LucideIcon;
  // The tile's look on a light card: trial mint, monthly sky, yearly amber.
  tone: "mint" | "sky" | "amber";
  price: string;
  per: string;
  note: string;
  // The note in the plan's own colour (the trial's emerald, the yearly
  // saving's amber) rather than muted.
  noteAccent: boolean;
  ribbon: string | null;
  features: { label: string; value: string }[];
  foot: string;
  // The one dark card: the plan in force (or the trial card while on Free).
  current: boolean;
  tag: string | null;
  action:
    | { kind: "link"; label: string; href: string }
    | { kind: "button"; label: string; onClick?: () => void; disabled: boolean; busy?: boolean; look: "main" | "line" | "off" };
}

const TILES = {
  mint: "bg-mint-50 text-brand-ink",
  sky: "bg-sky-soft text-sky",
  amber: "bg-warning-soft text-warning",
} as const;

// One package on the Plans page (UpgradePlan board): name and who it's for,
// the price, what it includes and its button. The current one sits on the
// forest ground.
export function PlanCard({ card }: { card: PlanCardModel }) {
  const { current } = card;
  const Icon = card.icon;
  const muted = current ? "text-mint-200" : "text-ink-muted";
  const lineButton = "border-[1.5px] border-forest bg-surface text-forest hover:bg-emerald-soft dark:border-mint-200 dark:text-mint-200";
  const buttonClass = (look: "main" | "line" | "off") =>
    cn(
      "flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold whitespace-nowrap transition-colors",
      look === "off" ? (current ? "cursor-default bg-mint-200/18 text-mint-200" : "cursor-default border border-line bg-strip text-ink-faint") : look === "main" ? (current ? "bg-mint-200 text-forest hover:bg-white" : "bg-forest text-white hover:bg-forest-hover") : lineButton,
    );

  return (
    <section
      aria-label={card.name}
      className={cn(
        "relative flex flex-col gap-4 rounded-[22px] border px-5.5 pt-6 pb-5.5",
        current ? "border-forest bg-forest text-white shadow-[0_14px_34px_rgba(15,63,56,0.28)]" : "border-line-card bg-surface text-ink shadow-card",
      )}
    >
      {card.ribbon && (
        <span className="absolute -top-3 left-5.5 flex h-6 items-center rounded-full bg-warning-fill px-3 text-caption font-bold text-night-ink shadow-[0_4px_10px_rgba(245,158,11,0.35)]">{card.ribbon}</span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-5", current ? "bg-mint-200/16 text-mint-200" : TILES[card.tone])}>
            <Icon strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <b className="truncate text-[17px] font-bold">{card.name}</b>
            <span className={cn("truncate text-[12.5px]", muted)}>{card.who}</span>
          </span>
        </span>
        {card.tag && <span className={cn("rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap text-forest", current ? "bg-mint-200" : "bg-mint-50")}>{card.tag}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[36px] leading-[normal] font-bold tracking-[-0.03em] tabular-nums">{card.price}</span>
          <span className={cn("text-body", muted)}>{card.per}</span>
        </span>
        <span className={cn("text-[13px] font-medium", card.noteAccent ? (current ? "text-gold-on-forest" : card.tone === "amber" ? "text-warning" : "text-emerald") : muted)}>{card.note}</span>
      </div>
      <div className={cn("h-px", current ? "bg-mint-200/18" : "bg-divider")} />
      <ul className="flex flex-1 flex-col gap-2.75">
        {card.features.map((feature) => (
          <li key={feature.label} className={cn("flex items-center gap-2.5 text-[14.5px]", current ? "text-white" : "text-ink-2")}>
            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", current ? "bg-mint-200 text-forest" : "bg-mint-50 text-emerald")}>
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="flex-1">{feature.label}</span>
            {feature.value && <b className="text-[13px] font-bold">{feature.value}</b>}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        {card.action.kind === "link" ? (
          <Link href={card.action.href} className={buttonClass("line")}>
            {card.action.label}
            <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={card.action.onClick} disabled={card.action.disabled} aria-disabled={card.action.disabled || undefined} className={buttonClass(card.action.look)}>
            {card.action.busy && <Loader size={16} />}
            {card.action.label}
          </button>
        )}
        <span className={cn("text-center text-[12.5px]", muted)}>{card.foot}</span>
      </div>
    </section>
  );
}
