"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HeadHintProps {
  // The column it explains ("To savings").
  label: string;
  // What the column holds, already translated.
  hint: string;
}

// The board's ⓘ beside a column head (Balance overview's To savings and
// Transfers): a hover shows the words as a title, and a tap or a key opens
// them in a small popover, so a phone and a screen reader get them too.
export function HeadHint({ label, hint }: HeadHintProps) {
  return (
    <Popover>
      <PopoverTrigger aria-label={`${label}: ${hint}`} title={hint} className="relative z-10 -m-1 inline-flex size-5.5 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink-2">
        <Info className="size-3.25" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 rounded-field border border-line bg-surface p-3 text-small leading-[normal] font-normal text-ink-2 shadow-overlay ring-0">
        {hint}
      </PopoverContent>
    </Popover>
  );
}
