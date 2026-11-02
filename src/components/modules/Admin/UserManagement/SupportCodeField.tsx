"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The six-digit support code a customer makes in Settings › Security and
// reads out: every admin look at their data (View as customer, Download a
// copy) needs one, and uses it up.
export const isSupportCode = (code: string) => /^\d{6}$/.test(code);

export function SupportCodeField({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { translate } = useLocale();
  const codeId = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={codeId} className="text-body font-medium text-ink">
        {translate("Support code from the customer")}
      </Label>
      <Input
        id={codeId}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        aria-describedby={`${codeId}-hint`}
        className="h-11 rounded-md border-line-strong bg-surface font-mono text-body-lg tracking-[0.3em] text-ink"
      />
      <span id={`${codeId}-hint`} className="text-small text-ink-muted">
        {translate("Ask the customer to open Settings › Security › Support access and read you the code. It works once, for 15 minutes. Never ask for their password.")}
      </span>
    </div>
  );
}
