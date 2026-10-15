"use client";

import { ChevronDown, Search } from "lucide-react";
import { useId, useState } from "react";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Contact } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { DIRECTION_META, LOAN_KIND_LABELS, loanDirection } from "@/lib/customer/loanDisplay";
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
}

// A bank or person, found by typing: their avatar, name and kind, and where
// the balance stands.
export function ContactPicker({ contacts, value, onChange, currency, size = "md", id, disabled = false }: ContactPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelId = useId();
  const selected = contacts.find((contact) => contact.id === value);
  const q = query.trim().toLowerCase();
  const hits = q ? contacts.filter((contact) => contact.name.toLowerCase().includes(q) || (contact.phone ?? "").includes(q)) : contacts;

  function pick(contactId: string) {
    onChange(contactId);
    setOpen(false);
    setQuery("");
  }

  const balanceLine = (contact: Contact) => {
    const direction = loanDirection(contact.currentBalance);
    const meta = DIRECTION_META[direction];
    return direction === "SETTLED" ? t(meta.label) : `${t(meta.label)} ${formatCurrency(Math.abs(Number(contact.currentBalance)), currency)}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || contacts.length === 0}
          className={cn(
            "flex w-full items-center gap-3 rounded-md border border-line-strong bg-surface text-left transition-[border-color,box-shadow] disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]",
            size === "xl" ? "h-13 px-4" : "h-11 px-3",
          )}
        >
          {selected ? (
            <>
              <PersonAvatar name={selected.name} src={selected.photoUrl} size={size === "xl" ? 30 : 28} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">
                  {selected.name} <span className="font-medium text-ink-muted">· {t(LOAN_KIND_LABELS[selected.type])}</span>
                </span>
                {size === "xl" && <span className="truncate text-caption font-normal text-ink-muted tabular-nums">{balanceLine(selected)}</span>}
              </span>
              {size === "md" && (
                <Chip tone={DIRECTION_META[loanDirection(selected.currentBalance)].chip} size="sm">
                  {t(DIRECTION_META[loanDirection(selected.currentBalance)].name)}
                </Chip>
              )}
            </>
          ) : (
            <>
              <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-body text-ink-muted">{contacts.length === 0 ? t("No banks or people yet") : t("Search by name or phone")}</span>
            </>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus leading={<Search />} placeholder={t("Type to search")} aria-label={t("Search contacts")} frameClassName="mb-1" />
        <ul role="listbox" aria-labelledby={labelId} className="flex max-h-80 flex-col overflow-y-auto">
          {hits.map((contact) => {
            const on = contact.id === value;
            return (
              <li key={contact.id} role="option" aria-selected={on}>
                <button type="button" onClick={() => pick(contact.id)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream", on && "bg-mint-50")}>
                  <PersonAvatar name={contact.name} src={contact.photoUrl} size={30} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">
                      {contact.name} <span className="font-medium text-ink-muted">· {t(LOAN_KIND_LABELS[contact.type])}</span>
                    </span>
                    <span className={cn("truncate text-caption font-normal tabular-nums", DIRECTION_META[loanDirection(contact.currentBalance)].text)}>{balanceLine(contact)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {hits.length === 0 && <li className="px-3 py-4 text-center text-small text-ink-muted">{t("No one matches")}</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
