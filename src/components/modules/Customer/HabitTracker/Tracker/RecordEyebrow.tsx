import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface RecordEyebrowProps {
  // The list the record belongs to.
  href: string;
  // "All months", "All Ramadans", "All challenges", already translated.
  back: string;
  // The pillar line under it, already translated ("Habits").
  pillar: string;
}

// The eyebrow of a habit record page (a month's Namaz sheet, a Ramadan, a
// challenge): the way back to its list, then the pillar. One look for all
// three, so none of them reads as a different kind of page.
export function RecordEyebrow({ href, back, pillar }: RecordEyebrowProps) {
  return (
    <span className="flex flex-col gap-1">
      <Link href={href} className="flex items-center gap-1 self-start text-small font-semibold tracking-normal text-ink-2 normal-case hover:text-ink pointer-coarse:min-h-11">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {back}
      </Link>
      <span>{pillar}</span>
    </span>
  );
}
