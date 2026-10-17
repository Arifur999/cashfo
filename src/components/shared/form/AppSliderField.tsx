"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import { Slider } from "@/components/ui/slider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import FormFieldShell from "./FormFieldShell";

interface AppSliderFieldProps {
  // Holds a number.
  field: AnyFieldApi;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  // How the current value reads next to the label, e.g. (v) => `${v}%`.
  formatValue?: (value: number) => string;
  description?: React.ReactNode;
}

// A numeric range field (rollout %, thresholds) with its value shown live.
const AppSliderField = ({ field, label, min = 0, max = 100, step = 1, formatValue = String, description }: AppSliderFieldProps) => {
  const { translate } = useLocale();
  const value = Number(field.state.value ?? min);

  return (
    <FormFieldShell
      field={field}
      label={
        <span className="flex w-full items-center justify-between gap-2">
          {translate(label)}
          <span className="font-semibold text-foreground tabular-nums">{formatValue(value)}</span>
        </span>
      }
      description={description}
    >
      {(control) => (
        <Slider
          id={control.id}
          thumbProps={{
            "aria-labelledby": `${field.name}-label`,
            "aria-describedby": control["aria-describedby"],
            "aria-valuetext": formatValue(value),
          }}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([next]) => field.handleChange(next)}
          onValueCommit={() => field.handleBlur()}
          className="py-2"
        />
      )}
    </FormFieldShell>
  );
};

export default AppSliderField;
