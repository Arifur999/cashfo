"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  // A plain string is shorthand for { value: it, label: it } (e.g. free-text
  // category names, where the option IS the value). Object options let the
  // committed `value` be an id while the input/list show a separate
  // human-readable `label` (e.g. contact id -> contact name).
  options: (string | ComboboxOption)[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

// A searchable single-select: typing filters `options` (case-insensitive
// substring match) instead of scrolling a long native <select>, but the
// committed `value` only ever changes via an explicit pick -- text typed
// that doesn't match anything reverts to the last committed value on blur,
// rather than silently submitting free text as a new category. Built from
// scratch (no library) to stay consistent with this app's other hand-rolled
// UI (Modal, DatePicker).
//
// Parents that reset `value` for reasons other than a pick made here (e.g.
// AddTransactionModal clearing `category` on tab switch/modal reopen) should
// pass a `key` that changes at that same moment, so React remounts this
// component with fresh initial state instead of needing a value-sync effect
// (which would either fight the user's in-progress typing or need
// SSR-unsafe `document` access to tell the two cases apart).
export function Combobox({ value, onChange, options, placeholder, emptyMessage = "No matches", disabled }: ComboboxProps) {
  const { t } = useLocale();
  const normalized = useMemo<ComboboxOption[]>(() => options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)), [options]);
  const labelFor = (v: string) => normalized.find((o) => o.value === v)?.label ?? v;

  const [query, setQuery] = useState(() => labelFor(value));
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Untouched (query still exactly matches the committed value's label,
    // e.g. right after opening a field that already has a selection) shows
    // every option -- only an actual keystroke narrows the list. Without
    // this, opening a pre-filled combobox would filter down to just the
    // one already-selected option instead of letting you pick a different one.
    if (!q || q === labelFor(value).trim().toLowerCase()) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, query, value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(labelFor(value));
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, normalized]);

  function select(option: ComboboxOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function handleBlur() {
    // Deferred so a suggestion's onClick (which needs the input to still be
    // mounted/focused-adjacent) fires first -- see the onMouseDown
    // preventDefault below, which is the primary guard; this is a backstop
    // for blur paths that skip it (e.g. Escape then Tab).
    setOpen(false);
    const committedLabel = labelFor(value);
    if (query !== committedLabel) setQuery(committedLabel);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={query}
          disabled={disabled}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              if (open && filtered[highlighted]) {
                e.preventDefault();
                select(filtered[highlighted]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery(labelFor(value));
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-100 bg-surface py-1 shadow-xl shadow-black/10">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2 text-sm text-neutral-400">{t(emptyMessage)}</p>
          ) : (
            filtered.map((option, i) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
                className={`block w-full px-3.5 py-2 text-left text-sm ${
                  i === highlighted ? "bg-brand-primary/10 text-brand-primary" : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
