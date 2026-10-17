"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { cn } from "@/lib/utils";

interface DataTableTextFilterProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  width?: "sm" | "md";
}

// "Email", "IP address": a plain box on the toolbar that narrows one field
// as you type, its label standing in as the placeholder.
const DataTableTextFilter = ({ label, value = "", onChange, width = "md" }: DataTableTextFilterProps) => {
  const [input, setInput] = useState(value);
  const [synced, setSynced] = useState(value);
  const debounced = useDebouncedCallback((next: string) => onChange(next.trim() || undefined), 400);

  // Follow outside changes ("Reset" clearing the URL) without an effect.
  if (value !== synced) {
    setSynced(value);
    setInput(value);
  }

  return (
    <input
      type="search"
      aria-label={label}
      placeholder={label}
      value={input}
      onChange={(event) => {
        setInput(event.target.value);
        debounced.run(event.target.value);
      }}
      className={cn(
        "h-8.5 rounded-md border border-line-strong bg-surface px-3 text-small text-ink outline-none placeholder:text-ink-muted focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/20 [&::-webkit-search-cancel-button]:appearance-none",
        width === "sm" ? "w-32.5" : "w-42.5",
      )}
    />
  );
};

export default DataTableTextFilter;
