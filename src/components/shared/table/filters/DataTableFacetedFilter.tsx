"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DataTableFilterOption } from "../dataTable.types";
import { asStatus } from "@/lib/i18n/message";

// The chip the design draws for a filter: "Plan: All plans".
export const FILTER_CHIP_CLASS = "h-8 gap-2 rounded-md border-line-strong bg-surface px-3 text-small font-normal text-ink-2 hover:bg-cream data-[state=open]:bg-cream";

interface DataTableFacetedFilterProps {
  title: string;
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

const DataTableFacetedFilter = ({ title, options, selected, onChange, multiple = false, emptyLabel = "All", facets, defaultValue }: DataTableFacetedFilterProps) => {
  const { translate } = useLocale();
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
        <Button variant="outline" size="sm" className={FILTER_CHIP_CLASS}>
          <span>{translate(title)}:</span>
          <b className="font-semibold text-ink">
            {selected.length === 0
              ? translate(emptyLabel)
              : selected.length > 2
                ? translate("{count} selected", { count: selected.length })
                : options
                    .filter((option) => selected.includes(option.value))
                    .map((option) => translate(asStatus(option.label)))
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
                    {option.icon && <option.icon className="size-4 text-muted-foreground" aria-hidden="true" />}
                    <span>{translate(asStatus(option.label))}</span>
                    {count !== undefined && <span className="ml-auto font-mono text-xs text-muted-foreground">{count}</span>}
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
