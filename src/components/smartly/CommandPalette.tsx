"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Kbd from "./Kbd";

export interface CommandItem {
  key: string;
  title: string;
  sub?: string;
  // The tile at the start of the row, usually a CommandMark.
  mark?: React.ReactNode;
  // A small tag on the right ("User", "Payment").
  badge?: string;
  // Where Enter or a click goes. onSelect runs first when both are given
  // (to remember a recent pick, say).
  href?: string;
  onSelect?: () => void;
}

export interface CommandGroup {
  label: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  // Already translated. A group with no items is left out.
  groups: CommandGroup[];
  // The field's accessible name, and its placeholder unless one is given.
  label: string;
  placeholder?: string;
  // The dialog's title and description, for screen readers only.
  title?: string;
  description?: string;
  // Shown while the query is shorter than minQueryLength.
  idle?: React.ReactNode;
  // Shown when a finished search found nothing.
  empty?: React.ReactNode;
  // The hints strip at the bottom (hidden on phones).
  footer?: React.ReactNode;
  // A search is on its way: "empty" waits for its answer.
  loading?: boolean;
  minQueryLength?: number;
}

// The round tile at the start of a row: initials on forest for a person, a
// sign (৳, #) on the sunken tone for anything else.
export const CommandMark = ({ tone = "neutral", children }: { tone?: "forest" | "neutral"; children: React.ReactNode }) => (
  <span
    aria-hidden="true"
    className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-full text-caption font-bold", tone === "forest" ? "bg-forest text-mint-200" : "bg-surface-sunken text-ink-2")}
  >
    {children}
  </span>
);

// Text inputs that take Ctrl K as a Mac editing key (delete to the end of
// the line). Checkboxes, dates and numbers have no such meaning.
const MAC_EDIT_INPUT = /^(text|search|email|url|tel|password)$/;

// Leaves the key press to the field only where Ctrl K or ⌘K means something
// there: a rich editor (insert a link), and plain Ctrl K in a Mac text field.
// Anywhere else, a filter box included, it opens the palette as before; the
// palette's own field (inside data-command-palette) still closes it.
const typingElsewhere = (event: KeyboardEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.closest("[data-command-palette]")) return false;
  if (target.isContentEditable) return true;
  if (!event.ctrlKey || event.metaKey || !/Mac|iP(hone|ad|od)/.test(navigator.platform)) return false;
  return target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && MAC_EDIT_INPUT.test(target.type));
};

// Ctrl K (⌘K on a Mac) anywhere on the page calls onToggle.
export function useCommandShortcut(onToggle: () => void) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    // Autofill fires keydowns with no key at all.
    if (typeof event.key !== "string" || event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey)) return;
    if (typingElsewhere(event)) return;
    event.preventDefault();
    onToggle();
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => handle(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// The search palette: a field over grouped results in a dialog. ↑ ↓ move
// (the pointer moves the highlight too), Enter opens, Esc closes. The field
// keeps focus throughout and points at the highlighted row through
// aria-activedescendant, as a combobox does. What it finds and how is the
// caller's: it hands over the query's results as groups.
const CommandPalette = ({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  label,
  placeholder,
  title,
  description,
  idle,
  empty,
  footer,
  loading = false,
  minQueryLength = 2,
}: CommandPaletteProps) => {
  const router = useRouter();
  const baseId = useId();
  const listId = `${baseId}-results`;
  const optionId = (key: string) => `${baseId}-option-${key.replace(/\s/g, "_")}`;

  const shown = groups.filter((group) => group.items.length > 0);
  const items = shown.flatMap((group) => group.items);
  // The highlight belongs to one set of results: new results start at the top.
  const results = items.map((item) => item.key).join("\n");
  const [cursor, setCursor] = useState({ results, index: 0 });
  const active = cursor.results === results ? Math.min(cursor.index, Math.max(items.length - 1, 0)) : 0;
  const short = query.trim().length < minQueryLength;

  function moveTo(index: number) {
    setCursor({ results, index });
    // Arrowing past the visible rows keeps the highlighted one in sight.
    document.getElementById(optionId(items[index].key))?.scrollIntoView({ block: "nearest" });
  }

  function choose(item: CommandItem | undefined) {
    if (!item) return;
    onOpenChange(false);
    item.onSelect?.();
    if (item.href) router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      moveTo((active + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      choose(items[active]);
    }
  }

  // Each group's rows continue the numbering of the ones before.
  const starts = shown.map((_, groupIndex) => shown.slice(0, groupIndex).reduce((sum, group) => sum + group.items.length, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-command-palette=""
        // Without a description Radix wants the attribute named as absent.
        {...(description ? {} : { "aria-describedby": undefined })}
        showCloseButton={false}
        className="top-24 w-160 max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden rounded-lg bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-160"
      >
        <DialogTitle className="sr-only">{title ?? label}</DialogTitle>
        {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
        <div className="flex h-15 items-center gap-3 border-b border-line px-4">
          <Search className="size-4.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={items[active] ? optionId(items[active].key) : undefined}
            aria-label={label}
            placeholder={placeholder ?? label}
            className="min-w-0 flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-ink-faint"
          />
          <Kbd className="shrink-0 text-caption font-medium">Esc</Kbd>
        </div>

        <div className="max-h-[min(28rem,calc(100vh-14rem))] overflow-y-auto pt-1 pb-2">
          {short && idle && <p className="px-4 py-6 text-center text-small text-ink-muted">{idle}</p>}
          {!short && !loading && items.length === 0 && empty && <p className="px-4 py-6 text-center text-small text-ink-muted">{empty}</p>}
          <div id={listId} role="listbox" aria-label={label} aria-busy={loading || undefined}>
            {shown.map((group, groupIndex) => (
              <div key={`${groupIndex}:${group.label}`} role="group" aria-labelledby={`${baseId}-group-${groupIndex}`}>
                <span id={`${baseId}-group-${groupIndex}`} role="presentation" className="block px-4 pt-3 pb-1 text-caption font-bold tracking-[0.08em] text-ink-muted uppercase">
                  {group.label}
                </span>
                {group.items.map((item, itemIndex) => {
                  const index = starts[groupIndex] + itemIndex;
                  return (
                    <button
                      key={item.key}
                      id={optionId(item.key)}
                      type="button"
                      role="option"
                      // Not a Tab stop: focus stays in the field, and Tab
                      // leaves the list in one press.
                      tabIndex={-1}
                      aria-selected={index === active}
                      onMouseEnter={() => setCursor({ results, index })}
                      onClick={() => choose(item)}
                      className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", index === active && "bg-mint-50")}
                    >
                      {item.mark}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <b className="truncate text-body font-semibold text-ink">{item.title}</b>
                        {item.sub && <span className="truncate text-caption text-ink-muted">{item.sub}</span>}
                      </span>
                      {item.badge && <span className="flex h-6 shrink-0 items-center rounded-full bg-surface-sunken px-3 text-caption font-semibold text-ink-2">{item.badge}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {footer && <div className="hidden gap-4 border-t border-line bg-strip px-4 py-3 text-caption text-ink-muted sm:flex">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
