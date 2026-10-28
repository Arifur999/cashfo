"use client";

import Link from "next/link";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type ChipTone = "income" | "expense" | "warning" | "info" | "neutral";

interface KpiProps {
  label: string;
  value: React.ReactNode;
  // A chip beside the note: "+212", "15.4%".
  chip?: { text: string; tone: ChipTone } | null;
  note?: React.ReactNode;
  // "sm" is the tighter figure over a list (Coupons): a 22px value; "lg"
  // the dashboard's 30px KPI row.
  size?: "md" | "sm" | "lg";
  // The page's one headline figure (the dashboard's MRR): the deep teal card.
  hero?: boolean;
  // Opens what the figure counts (the failed payments, the open tickets):
  // the whole card is the link, and its edge darkens on hover as an
  // interactive card's does.
  href?: string;
  className?: string;
}

// One figure on an admin page: label, value, and a chip with a note under it.
const Kpi = ({ label, value, chip, note, size = "md", hero = false, href, className }: KpiProps) => {
  const { translate } = useLocale();
  const small = size === "sm";
  const large = size === "lg";
  // The boards' tiles: 14px 18px round a figure over a list (Sign-ins,
  // Payments, Tickets, Analytics), 16px 18px for the regular one
  // (Workspaces); the dashboard's large row keeps its own.
  const frame = cn(
    "flex flex-col",
    small ? "gap-1 px-4.5 py-3.5" : large ? "gap-1.5 px-5 py-4.5" : "gap-1.5 px-4.5 py-4",
    hero && "border-forest bg-forest shadow-[0_8px_24px_color-mix(in_srgb,var(--forest)_22%,transparent)]",
    className,
  );
  const figure = (
    <>
      <span className={cn("text-small", hero ? "text-mint-200" : "text-ink-muted")}>{translate(label)}</span>
      <span className={cn("tabular-nums", hero ? "text-white" : "text-ink", small ? "text-h2" : large ? "text-[30px] leading-[normal] font-bold tracking-[-0.03em]" : "text-h1")}>{value}</span>
      {(chip || note) && (
        <span className={cn("flex items-center gap-1.5", hero ? "text-mint-200" : "text-ink-muted", small ? "text-caption" : large ? "text-[12.5px] leading-[normal]" : "text-small")}>
          {chip && (
            <Chip tone={chip.tone} size="sm" className={cn(large && "h-auto py-px text-[12.5px]", hero && "bg-mint-200/18 text-mint-50")}>
              {chip.text}
            </Chip>
          )}
          {typeof note === "string" ? translate(note) : note}
        </span>
      )}
    </>
  );

  return href ? (
    <Card asChild padding="none" interactive className={frame}>
      <Link href={href}>{figure}</Link>
    </Card>
  ) : (
    <Card padding="none" className={frame}>
      {figure}
    </Card>
  );
};

export default Kpi;
