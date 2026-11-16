"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useFieldControlId } from "./FormFieldShell";

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
  const { translate } = useLocale();
  // The field's name, or an id of its own inside AppForm's uniqueIds.
  const controlId = useFieldControlId(field);
  const descriptionId = description ? `${controlId}-description` : undefined;

  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-divider py-2.5", className)}>
      <Label htmlFor={controlId} className="flex grow cursor-pointer flex-col items-start gap-px">
        <span className="text-body font-medium text-ink">{translate(label)}</span>
        {description && (
          <span id={descriptionId} className="text-[12.5px] leading-[normal] font-normal text-ink-muted">
            {typeof description === "string" ? translate(description) : description}
          </span>
        )}
      </Label>
      <Switch
        id={controlId}
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
