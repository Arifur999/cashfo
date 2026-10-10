"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

interface DataTableSearchProps {
  value: string;
  onDebouncedChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

const DataTableSearch = ({ value, onDebouncedChange, placeholder = "Search...", debounceMs = 500 }: DataTableSearchProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const debounced = useDebouncedCallback((next: string) => onDebouncedChange(next.trim()), debounceMs);

  // Follow outside changes (e.g. "Reset" clearing the URL) without an effect:
  // adjusting state during render is React's recommended pattern for this.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setInputValue(value);
  }

  const clear = () => {
    // Apply the empty value now and drop the pending debounce, so clearing
    // doesn't fire the callback twice.
    debounced.cancel();
    setInputValue("");
    onDebouncedChange("");
  };

  return (
    <InputGroup className="h-8 w-full sm:w-64">
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        // A placeholder alone isn't an accessible name.
        aria-label={placeholder}
        placeholder={placeholder}
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          debounced.run(event.target.value);
        }}
      />
      {inputValue && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={clear}>
            <X aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
};

export default DataTableSearch;
