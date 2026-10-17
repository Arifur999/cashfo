"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DataTableToggleFilterProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

// "Sensitive only": the design's small switch with its label after it. On
// sends "true"; off drops the filter.
const DataTableToggleFilter = ({ label, value, onChange }: DataTableToggleFilterProps) => {
  const { translate } = useLocale();
  const id = useId();
  return (
    <span className="flex items-center gap-2 text-small text-ink-2">
      <Switch
        id={id}
        checked={value === "true"}
        onCheckedChange={(checked) => onChange(checked ? "true" : undefined)}
        className="data-checked:bg-emerald data-unchecked:bg-line-strong"
      />
      <label htmlFor={id} className="cursor-pointer">
        {translate(label)}
      </label>
    </span>
  );
};

export default DataTableToggleFilter;
