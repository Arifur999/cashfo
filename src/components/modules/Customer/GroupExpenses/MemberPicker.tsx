"use client";

import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface MemberPickerProps {
  members: GroupMember[];
  value: string;
  onChange: (id: string) => void;
  currency: string;
  // The month's balance per member, written under the name.
  balances?: Record<string, number>;
  // A member that cannot be picked (the other side of a payment).
  exclude?: string;
  size?: "md" | "xl";
  id?: string;
  // The field's label, already translated: it names the list too.
  label?: string;
  // The id of the field's hint, read out with the button.
  describedBy?: string;
  disabled?: boolean;
  placeholder?: string;
}

// A group member, found by typing: their avatar, name and where the
// month's balance stands. The list is a combobox: type to narrow it, arrow
// keys to move, Enter to pick.
export function MemberPicker({ members, value, onChange, currency, balances, exclude, size = "xl", id, label, describedBy, disabled = false, placeholder }: MemberPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const choices = members.filter((member) => member.id !== exclude);
  const selected = members.find((member) => member.id === value);
  const q = query.trim().toLowerCase();
  const hits = q ? choices.filter((member) => member.name.toLowerCase().includes(q) || (member.phone ?? "").includes(q)) : choices;
  const listName = label ?? t("Choose a member");
  // Everyone else is already on the other side of the payment.
  const nobody = choices.length === 0 ? (members.length > 0 ? t("No one else to pick") : t("No members yet")) : null;

  function pick(memberId: string) {
    onChange(memberId);
    setOpen(false);
    setQuery("");
  }

  const balanceLine = (member: GroupMember) => {
    const balance = balances?.[member.id];
    if (balance === undefined) return { text: member.phone ?? t("Active member"), className: "text-ink-muted" };
    if (Math.abs(balance) < 0.005) return { text: t("Settled"), className: "text-ink-muted" };
    return balance > 0 ? { text: t("Gets back {amount}", { amount: formatCurrency(balance, currency) }), className: "text-income" } : { text: t("Has to pay {amount}", { amount: formatCurrency(-balance, currency) }), className: "text-expense" };
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-describedby={describedBy}
          disabled={disabled || choices.length === 0}
          className={cn(
            "flex w-full min-w-0 items-center gap-3 rounded-md border border-line-strong bg-surface text-left transition-[border-color,box-shadow] disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]",
            size === "xl" ? "h-13.5 px-4" : "h-11 px-3",
          )}
        >
          {selected ? (
            <>
              <PersonAvatar name={selected.name} src={selected.photoUrl} size={size === "xl" ? 32 : 28} coloured />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                {size === "xl" && <span className={cn("truncate text-caption font-normal tabular-nums", balanceLine(selected).className)}>{balanceLine(selected).text}</span>}
              </span>
            </>
          ) : (
            <>
              <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-body text-ink-muted">{nobody ?? placeholder ?? t("Choose a member")}</span>
            </>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      {/* At least 256px: a picker beside another on a phone is narrower than its names. */}
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) min-w-64 gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        <Command label={listName} shouldFilter={false} loop defaultValue={value || undefined} className="flex flex-col">
          <span className="mb-1 flex h-9.5 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-ink-muted focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <Command.Input value={query} onValueChange={setQuery} placeholder={t("Type to search")} className="h-full min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-ink-faint" />
          </span>
          <Command.List label={listName} className="max-h-80 overflow-y-auto">
            {hits.map((member) => {
              const line = balanceLine(member);
              return (
                <Command.Item key={member.id} value={member.id} onSelect={() => pick(member.id)} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 data-selected:bg-surface-sunken">
                  <PersonAvatar name={member.name} src={member.photoUrl} size={30} coloured />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{member.name}</span>
                    <span className={cn("truncate text-caption font-normal tabular-nums", line.className)}>{line.text}</span>
                  </span>
                  {member.id === value && (
                    <>
                      <Check className="size-4 shrink-0 text-brand-ink" aria-hidden="true" />
                      <span className="sr-only">{t("Chosen")}</span>
                    </>
                  )}
                </Command.Item>
              );
            })}
            <Command.Empty className="px-3 py-4 text-center text-small text-ink-muted">{t("No one matches")}</Command.Empty>
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
