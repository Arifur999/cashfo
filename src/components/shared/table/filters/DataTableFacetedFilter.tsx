"use client";

import { Check, ChevronDown } from "lucide-react";
import Button from "@/components/smartly/Button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DataTableFilterOption, FilterChipShape } from "../dataTable.types";
import { asStatus } from "@/lib/i18n/message";

// The chip the design draws for a filter: "Plan: All plans". It goes on the
// smartly secondary button: 32px, plain weight, sunken while open.
// design-v4 AdminUsers: a 32px button with the field edge and 10px corners,
// the filter's name muted and its value in semibold ink.
export const FILTER_CHIP_CLASS = "h-8.5 gap-1.5 rounded-field border-input bg-surface px-2.5 text-small font-normal text-ink-muted hover:bg-surface-sunken data-[state=open]:border-focus-ring data-[state=open]:bg-surface";

export const filterChipClass = (shape: FilterChipShape = "default") =>
  cn(FILTER_CHIP_CLASS, shape === "compact" && "h-8", shape === "pill" && "rounded-full");

interface DataTableFacetedFilterProps {
  title: string;
  chip?: FilterChipShape;
  options: DataTableFilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  // What the chip says while nothing is picked: "All", "Anyone", "Any".
  emptyLabel?: string;
  // Per-option row counts, only known for in-memory tables.
  facets?: Map<unknown, number>;
  // The option an empty value means: always one picked, no "Clear filter".
  defaultValue?: string;
}

const DataTableFacetedFilter = ({ title, chip, options, selected, onChange, multiple = false, emptyLabel = "All", facets, defaultValue }: DataTableFacetedFilterProps) => {
  const { translate, locale } = useLocale();
  // A status word in the reader's language; a record's own name as it is.
  const optionLabel = (option: DataTableFilterOption) => (option.raw ? option.label : translate(asStatus(option.label)));
  const toggle = (value: string) => {
    const isSelected = selected.includes(value);
    if (multiple) {
      onChange(isSelected ? selected.filter((item) => item !== value) : [...selected, value]);
      return;
    }
    // Picking the chosen one again clears it, back to the default if any.
    onChange(isSelected ? (defaultValue ? [defaultValue] : []) : [value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className={filterChipClass(chip)}>
          <span>{translate(title)}:</span>
          <b className="font-semibold text-ink">
            {selected.length === 0
              ? translate(emptyLabel)
              : selected.length > 2
                ? translate("{count} selected", { count: formatCount(selected.length, locale) })
                : options
                    .filter((option) => selected.includes(option.value))
                    .map(optionLabel)
                    .join(", ")}
          </b>
          <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={translate(title)} />
          <CommandList>
            <CommandEmpty>{translate("No results found.")}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                const count = facets?.get(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => toggle(option.value)}>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center border",
                        multiple ? "rounded-sm" : "rounded-full",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    {option.icon && <option.icon className="size-4 text-ink-muted" aria-hidden="true" />}
                    <span>{optionLabel(option)}</span>
                    {count !== undefined && <span className="ml-auto font-mono text-caption text-ink-muted">{formatCount(count, locale)}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && !(defaultValue && selected[0] === defaultValue) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    {translate("Clear filter")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DataTableFacetedFilter;
