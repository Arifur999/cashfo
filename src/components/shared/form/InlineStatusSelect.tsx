"use client";

import { useOptimistic, useTransition } from "react";
import SelectControl from "./SelectControl";

interface InlineStatusSelectProps<TValue extends string> {
  value: TValue;
  options: readonly { value: TValue; label: string }[];
  // Saves the change; resolves true on success (false brings the old value back).
  onChange: (next: TValue) => Promise<boolean>;
  ariaLabel: string;
  className?: string;
}

// A status picker inside a table row: the new value shows at once, the row
// is locked while it saves, and a failed save reverts it.
const InlineStatusSelect = <TValue extends string>({ value, options, onChange, ariaLabel, className = "w-36" }: InlineStatusSelectProps<TValue>) => {
  const [shown, setShown] = useOptimistic(value);
  const [isSaving, startTransition] = useTransition();

  return (
    <SelectControl
      ariaLabel={ariaLabel}
      size="sm"
      value={shown}
      options={options}
      disabled={isSaving}
      className={className}
      onValueChange={(next) =>
        startTransition(async () => {
          setShown(next);
          await onChange(next);
        })
      }
    />
  );
};

export default InlineStatusSelect;
