"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface AppSwitchFieldProps {
  field: AnyFieldApi;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

// Boolean fields (isActive, feature toggles), drawn as the design's switch
// row: the name and what it means on the left, the emerald switch on the
// right, a faint line under each. The whole row is the label, so the hit
// area isn't just the switch.
const AppSwitchField = ({ field, label, description, disabled, className }: AppSwitchFieldProps) => {
  const descriptionId = description ? `${field.name}-description` : undefined;

  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-surface-sunken py-3", className)}>
      <Label htmlFor={field.name} className="flex grow cursor-pointer flex-col items-start gap-px">
        <span className="text-body font-medium text-ink">{label}</span>
        {description && (
          <span id={descriptionId} className="text-small font-normal text-ink-muted">
            {description}
          </span>
        )}
      </Label>
      <Switch
        id={field.name}
        name={field.name}
        checked={Boolean(field.state.value)}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        disabled={disabled}
        aria-describedby={descriptionId}
        className="data-checked:bg-emerald data-unchecked:bg-line-strong"
      />
    </div>
  );
};

export default AppSwitchField;
