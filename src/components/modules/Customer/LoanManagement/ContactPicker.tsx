"use client";

import { ChevronDown, Search } from "lucide-react";
import { useId, useState } from "react";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Contact } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { contactMatches, DIRECTION_META, LOAN_KIND_LABELS, loanDirection } from "@/lib/customer/loanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";

interface ContactPickerProps {
  contacts: Contact[];
  value: string;
  onChange: (id: string) => void;
  currency: string;
  // 44px with the Dena / Pawna chip (the statement), or 52px with the
  // balance written under the name (the entry drawer).
  size?: "md" | "xl";
  id?: string;
  disabled?: boolean;
  // The list's name for assistive tech: the field's own label.
  label?: string;
  // Save found none picked: a red edge, and the error read out with it.
  invalid?: boolean;
  describedBy?: string;
}

// A bank or person, found by typing: their avatar, name and kind, and where
// the balance stands. The search field drives the list: the arrow keys move
// through it and Enter picks, as a combobox does. Archived contacts come
// last, still there for their statement.
export function ContactPicker({ contacts, value, onChange, currency, size = "md", id, disabled = false, label, invalid = false, describedBy }: ContactPickerProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const selected = contacts.find((contact) => contact.id === value);
  const ordered = [...contacts].sort((a, b) => Number(a.status === "ARCHIVED") - Number(b.status === "ARCHIVED"));
  const hits = ordered.filter((contact) => contactMatches(contact.name, contact.phone, query));
  const activeIndex = Math.min(active, hits.length - 1);
  const optionId = (contactId: string) => `${listId}-${contactId}`;

  function openChange(next: boolean) {
    setOpen(next);
    if (next) setActive(Math.max(0, ordered.findIndex((contact) => contact.id === value)));
    else setQuery("");
  }

  function pick(contactId: string) {
    onChange(contactId);
    setOpen(false);
    setQuery("");
  }

  function moveTo(index: number) {
    const next = Math.max(0, Math.min(index, hits.length - 1));
    setActive(next);
    const hit = hits[next];
    if (hit) document.getElementById(optionId(hit.id))?.scrollIntoView({ block: "nearest" });
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveTo(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(activeIndex - 1);
    } else if (event.key === "Enter") {
      // Never the form's submit: Enter here picks.
      event.preventDefault();
      const hit = hits[activeIndex];
      if (hit) pick(hit.id);
    }
  }

  const balanceLine = (contact: Contact) => {
    const direction = loanDirection(contact.currentBalance);
    const meta = DIRECTION_META[direction];
    return direction === "SETTLED" ? t(meta.label) : `${t(meta.label)} ${formatCurrency(Math.abs(Number(contact.currentBalance)), currency, fmt)} · ${t(meta.name)}`;
  };
  const kindOf = (contact: Contact) => (contact.status === "ARCHIVED" ? `${t(LOAN_KIND_LABELS[contact.type])} · ${t("Archived")}` : t(LOAN_KIND_LABELS[contact.type]));

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={describedBy}
          disabled={disabled || contacts.length === 0}
          className={cn(
            invalid ? "border-expense" : "border-input",
            "flex w-full min-w-0 items-center gap-3 border bg-surface text-left transition-[border-color,box-shadow] focus-visible:border-focus-ring focus-visible:focus-halo focus-visible:outline-none disabled:opacity-60 data-open:border-focus-ring data-open:focus-halo",
            size === "xl" ? "h-11.5 rounded-[12px] px-3" : "h-11 rounded-field px-3",
          )}
        >
          {selected ? (
            <>
              <PersonAvatar name={selected.name} src={selected.photoUrl} kind={selected.type} size={size === "xl" ? 30 : 28} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">
                  {selected.name} <span className="font-medium text-ink-muted">· {kindOf(selected)}</span>
                  {/* The statement names the loan too ("· house loan"). */}
                  {size === "md" && (selected.type === "BANK" || selected.type === "NGO") && selected.notes && <span className="font-medium text-ink-muted"> · {selected.notes}</span>}
                </span>
                {size === "xl" && <span className={cn("truncate text-caption font-normal tabular-nums", loanDirection(selected.currentBalance) === "SETTLED" ? "text-ink-muted" : DIRECTION_META[loanDirection(selected.currentBalance)].text)}>{balanceLine(selected)}</span>}
              </span>
              {size === "md" && (
                <Chip tone={DIRECTION_META[loanDirection(selected.currentBalance)].chip} size="sm">
                  {t(DIRECTION_META[loanDirection(selected.currentBalance)].name)}
                </Chip>
              )}
            </>
          ) : (
            <>
              {/* The entry popup reads as the board's select; the statement's as a search. */}
              {size === "md" && <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
              <span className={cn("min-w-0 flex-1 truncate text-body", size === "xl" ? "text-ink" : "text-ink-muted")}>{contacts.length === 0 ? t("No banks or people yet") : size === "xl" ? t("Select a bank or person") : t("Search name or phone…")}</span>
            </>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        <Input
          size="sm"
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={hits[activeIndex] ? optionId(hits[activeIndex].id) : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onSearchKeyDown}
          autoFocus
          leading={<Search />}
          placeholder={t("Search name or phone…")}
          aria-label={t("Search by name or phone")}
          frameClassName="mb-1"
        />
        <ul id={listId} role="listbox" aria-label={label ?? t("Banks and people")} className="flex max-h-80 flex-col overflow-y-auto">
          {hits.map((contact, index) => {
            const on = contact.id === value;
            return (
              <li key={contact.id} role="none">
                <button
                  type="button"
                  id={optionId(contact.id)}
                  role="option"
                  aria-selected={on}
                  tabIndex={-1}
                  onClick={() => pick(contact.id)}
                  onMouseMove={() => index !== activeIndex && setActive(index)}
                  className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", on ? "bg-mint-50" : index === activeIndex ? "bg-hover" : "hover:bg-hover", index === activeIndex && "outline-2 -outline-offset-2 outline-focus-ring")}
                >
                  <PersonAvatar name={contact.name} src={contact.photoUrl} kind={contact.type} size={30} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">
                      {contact.name} <span className="font-medium text-ink-muted">· {kindOf(contact)}</span>
                    </span>
                    <span className={cn("truncate text-caption font-normal tabular-nums", DIRECTION_META[loanDirection(contact.currentBalance)].text)}>{balanceLine(contact)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {hits.length === 0 && (
            <li role="none" className="px-3 py-4 text-center text-small text-ink-muted">
              {t("No one matches")}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
