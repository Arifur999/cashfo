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
  // "sm" is the tighter figure over a list (Coupons): a 22px value.
  size?: "md" | "sm";
  // Opens what the figure counts (the failed payments, the open tickets):
  // the whole card is the link, and its edge darkens on hover as an
  // interactive card's does.
  href?: string;
  className?: string;
}

// One figure on an admin page: label, value, and a chip with a note under it.
const Kpi = ({ label, value, chip, note, size = "md", href, className }: KpiProps) => {
  const { translate } = useLocale();
  const small = size === "sm";
  const frame = cn("flex flex-col px-5 py-4", small ? "gap-1" : "gap-2", className);
  const figure = (
    <>
      <span className="text-small text-ink-muted">{translate(label)}</span>
      <span className={cn("text-ink tabular-nums", small ? "text-h2" : "text-h1")}>{value}</span>
      {(chip || note) && (
        <span className={cn("flex items-center gap-2 text-ink-muted", small ? "text-caption" : "text-small")}>
          {chip && (
            <Chip tone={chip.tone} size="sm">
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
