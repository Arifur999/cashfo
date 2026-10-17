"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DataTableFilterOption } from "../dataTable.types";

interface DataTableSortMenuProps {
  label: string;
  options: DataTableFilterOption[];
  value: string | undefined;
  defaultValue?: string;
  onChange: (value: string | undefined) => void;
}

// "Sort: Last active, newest first" at the end of the filter row, as the
// design's Users list says it: plain words that open the orders.
const DataTableSortMenu = ({ label, options, value, defaultValue, onChange }: DataTableSortMenuProps) => {
  const { translate } = useLocale();
  const current = value ?? defaultValue ?? options[0]?.value;
  const currentLabel = options.find((option) => option.value === current)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-sm text-small text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus-ring">
        {translate(label)}:<b className="font-semibold text-ink">{currentLabel ? translate(currentLabel) : ""}</b>
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup value={current} onValueChange={(next) => onChange(next === defaultValue ? undefined : next)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {translate(option.label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DataTableSortMenu;
