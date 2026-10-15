"use client";

import { ChevronDown, Search } from "lucide-react";
import { useId, useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Input from "@/components/smartly/form/Input";
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
  disabled?: boolean;
  placeholder?: string;
}

// A group member, found by typing: their avatar, name and where the
// month's balance stands.
export function MemberPicker({ members, value, onChange, currency, balances, exclude, size = "xl", id, disabled = false, placeholder }: MemberPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelId = useId();
  const choices = members.filter((member) => member.id !== exclude);
  const selected = members.find((member) => member.id === value);
  const q = query.trim().toLowerCase();
  const hits = q ? choices.filter((member) => member.name.toLowerCase().includes(q) || (member.phone ?? "").includes(q)) : choices;

  function pick(memberId: string) {
    onChange(memberId);
    setOpen(false);
    setQuery("");
  }

  const balanceLine = (member: GroupMember) => {
    const balance = balances?.[member.id];
    if (balance === undefined) return { text: member.phone ?? t("Active member"), className: "text-ink-muted" };
    if (Math.abs(balance) < 0.005) return { text: t("Settled"), className: "text-ink-muted" };
    return balance > 0 ? { text: `${t("Gets back")} ${formatCurrency(balance, currency)}`, className: "text-income" } : { text: `${t("Has to pay")} ${formatCurrency(-balance, currency)}`, className: "text-expense" };
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || choices.length === 0}
          className={cn(
            "flex w-full items-center gap-3 rounded-md border border-line-strong bg-surface text-left transition-[border-color,box-shadow] disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]",
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
              <span className="min-w-0 flex-1 truncate text-body text-ink-muted">{choices.length === 0 ? t("No members yet") : (placeholder ?? t("Choose a member"))}</span>
            </>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
        <Input size="sm" type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus leading={<Search />} placeholder={t("Type to search")} aria-label={t("Search members")} frameClassName="mb-1" />
        <ul role="listbox" aria-labelledby={labelId} className="flex max-h-80 flex-col overflow-y-auto">
          {hits.map((member) => {
            const on = member.id === value;
            const line = balanceLine(member);
            return (
              <li key={member.id} role="option" aria-selected={on}>
                <button type="button" onClick={() => pick(member.id)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream", on && "bg-mint-50")}>
                  <PersonAvatar name={member.name} src={member.photoUrl} size={30} coloured />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold text-ink">{member.name}</span>
                    <span className={cn("truncate text-caption font-normal tabular-nums", line.className)}>{line.text}</span>
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
