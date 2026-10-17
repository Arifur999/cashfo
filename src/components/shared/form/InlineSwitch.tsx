"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";

interface InlineSwitchProps {
  checked: boolean;
  // Saves the change; resolves true on success (false flips it back).
  onChange: (next: boolean) => Promise<boolean>;
  ariaLabel: string;
  className?: string;
}

// An on/off toggle inside a table row: flips at once, locks while saving,
// and reverts if the save fails.
const InlineSwitch = ({ checked, onChange, ariaLabel, className }: InlineSwitchProps) => {
  const [shown, setShown] = useOptimistic(checked);
  const [isSaving, startTransition] = useTransition();

  return (
    <Switch
      checked={shown}
      disabled={isSaving}
      aria-label={ariaLabel}
      aria-busy={isSaving}
      className={className}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setShown(next);
          await onChange(next);
        })
      }
    />
  );
};

export default InlineSwitch;
