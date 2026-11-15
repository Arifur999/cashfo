"use client";

import { ChevronDown, CreditCard, Send, Tag } from "lucide-react";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const CARD = "overflow-hidden rounded-[18px]";

export interface CompareRow {
  label: string;
  free: string;
  pro: string;
  // "yes" draws Included in emerald, "no" a dash.
  freeKind?: "yes" | "no" | "text";
  proKind?: "yes" | "no" | "text";
}

// "Free or Pro" (UpgradePlan board): what Free gives against what every
// paid plan does.
export function FreeOrProCard({ rows }: { rows: CompareRow[] }) {
  const { t } = useLocale();
  const cell = (kind: CompareRow["freeKind"], value: string) => (kind === "yes" ? t("Included") : kind === "no" ? "–" : value);
  const tone = (kind: CompareRow["freeKind"]) => (kind === "yes" ? "text-brand-ink" : kind === "no" ? "text-ink-faint" : "text-ink");
  return (
    <Card padding="none" className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5.5 pt-4.5 pb-3">
        <h2 className="text-title font-semibold text-ink">{t("Free or Pro")}</h2>
        <span className="text-[12.5px] text-ink-muted">{t("Trial, Monthly and Yearly all give you full Pro")}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-120 border-collapse text-body">
          <thead>
            <tr className="bg-table-head text-[12.5px] text-ink-muted">
              <th scope="col" className="px-5.5 py-2.5 text-left font-medium">
                {t("Feature")}
              </th>
              <th scope="col" className="w-[214px] px-3 py-2.5 text-center font-medium">
                Free
              </th>
              <th scope="col" className="w-[245px] bg-primary-soft px-3 py-2.5 text-center font-semibold text-brand-ink">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-divider">
                <th scope="row" className="px-5.5 py-3 text-left font-medium text-ink">
                  {row.label}
                </th>
                <td className={cn("px-3 py-3 text-center tabular-nums", tone(row.freeKind))}>{cell(row.freeKind, row.free)}</td>
                <td className={cn("bg-soft-check px-3 py-3 text-center font-semibold tabular-nums", tone(row.proKind))}>{cell(row.proKind, row.pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// "Two ways to pay" (UpgradePlan board): online through a gateway, or
// sending the money and typing its TrxID. Online shows as coming until a
// gateway is set up.
export function WaysToPayCard({ online }: { online: boolean }) {
  const { t } = useLocale();
  const ways = [
    {
      key: "online",
      icon: CreditCard,
      tile: "bg-info-soft text-info-ink",
      title: t("Pay online"),
      body: online ? t("Through SSLCommerz. Pro turns on the moment you pay.") : t("Through SSLCommerz, coming soon. Until then, send the money yourself."),
      soon: !online,
      chips: ["Visa", "Mastercard", "bKash", "Nagad", "Rocket", t("Net banking")],
    },
    {
      key: "send",
      icon: Send,
      tile: "bg-rose-soft text-rose",
      title: t("Send money yourself"),
      body: t("Send from bKash, Nagad, Rocket or your bank, then type the TrxID. We check it within 2 hours."),
      soon: false,
      chips: ["bKash", "Nagad", "Rocket", t("Bank transfer")],
    },
  ];
  return (
    <Card padding="none" className={cn(CARD, "flex flex-col gap-3 px-5 py-4.5")}>
      <h2 className="text-title font-semibold text-ink">{t("Two ways to pay")}</h2>
      {ways.map((way) => {
        const Icon = way.icon;
        return (
          <div key={way.key} className="flex gap-3 rounded-[14px] bg-strip p-3">
            <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-4.75", way.tile)}>
              <Icon strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <b className="flex items-center gap-2 text-body font-semibold text-ink">
                {way.title}
                {way.soon && <span className="rounded-full bg-surface-sunken px-2 py-px text-caption font-semibold text-ink-soft">{t("Soon")}</span>}
              </b>
              <span className="text-[12.5px] leading-[1.45] text-ink-soft">{way.body}</span>
              <span className="mt-0.5 flex flex-wrap gap-1.25">
                {way.chips.map((chip) => (
                  <span key={chip} className="flex h-5.5 items-center rounded-full border border-line bg-surface px-2 text-[11.5px] font-semibold text-ink-2">
                    {chip}
                  </span>
                ))}
              </span>
            </span>
          </div>
        );
      })}
      <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
        <Tag className="size-3.5 text-emerald" strokeWidth={2} aria-hidden="true" />
        {t("Have a promo code? Use it on the payment page.")}
      </span>
    </Card>
  );
}

// "Questions people ask" (UpgradePlan board): one answer open at a time,
// the first to begin with.
export function PlanQuestions({ items }: { items: { q: string; a: string }[] }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(0);
  return (
    <Card padding="none" className={CARD}>
      <h2 className="px-5.5 pt-4.5 pb-2 text-title font-semibold text-ink">{t("Questions people ask")}</h2>
      {items.map((item, index) => {
        const expanded = open === index;
        const id = `plan-faq-${index}`;
        return (
          <div key={item.q} className="border-t border-divider">
            <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(expanded ? -1 : index)} className="flex w-full items-center justify-between gap-3 px-5.5 py-3.5 text-left text-[14.5px] font-semibold text-ink">
              {item.q}
              <ChevronDown className={cn("size-4.5 shrink-0 text-ink-muted transition-transform", expanded && "rotate-180")} strokeWidth={2} aria-hidden="true" />
            </button>
            <p id={id} hidden={!expanded} className="max-w-205 px-5.5 pb-4 text-body leading-[1.6] text-ink-soft">
              {item.a}
            </p>
          </div>
        );
      })}
    </Card>
  );
}
