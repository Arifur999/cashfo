"use client";

import { commissionNote, COMMISSION_STATUS, friendDay } from "@/lib/customer/referralDisplay";
import type { Earning } from "@/lib/customer/referralTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { StatusChip } from "./ReferralBits";

type Line = Pick<Earning, "status" | "availableAt" | "paidOutAt" | "endedAt" | "cancelReason" | "payout">;

// A commission line's chip and the line under it ("On hold · Ready 3 Nov",
// "Under check · Held back from WD-1048").
export function CommissionStatusCell({ line, today, align = "start", className }: { line: Line; today: string; align?: "start" | "end"; className?: string }) {
  const { t, fmt } = useLocale();
  const look = COMMISSION_STATUS[line.status];
  const note = commissionNote(line);
  return (
    <span className={cn("flex min-w-0 flex-col gap-0.5", align === "end" && "items-end text-right", className)}>
      <StatusChip tone={look.tone}>{t(look.label)}</StatusChip>
      <span className="truncate text-caption leading-normal text-ink-muted">{t(note.note, { date: note.day ? friendDay(note.day, today, fmt) : "", request: note.request ?? "" })}</span>
    </span>
  );
}
