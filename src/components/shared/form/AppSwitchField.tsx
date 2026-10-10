"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AppSwitchFieldProps {
  field: AnyFieldApi;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
}

// Boolean fields (isActive, feature toggles). The whole row is the label, so
// the hit area isn't just the 20px switch.
const AppSwitchField = ({ field, label, description, disabled }: AppSwitchFieldProps) => {
  const descriptionId = description ? `${field.name}-description` : undefined;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border px-3.5 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={field.name}>{label}</Label>
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={field.name}
        name={field.name}
        checked={Boolean(field.state.value)}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        disabled={disabled}
        aria-describedby={descriptionId}
      />
    </div>
  );
};

export default AppSwitchField;
