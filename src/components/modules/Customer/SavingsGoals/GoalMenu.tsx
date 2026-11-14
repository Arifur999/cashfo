"use client";

import { Ellipsis } from "lucide-react";
import { iconActionClass } from "@/components/smartly/IconAction";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GoalAction, GoalMenuItem } from "./useGoalView";

const MENU_ITEM = "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 text-[13.5px] font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";

// A goal's ⋯ button and its menu, on the card and the table row.
// onColor: on the goal card's coloured panel, a see-through white button.
export function GoalMenu({ name, items, busy, onAction, onColor = false }: { name: string; items: GoalMenuItem[]; busy: boolean; onAction: (action: GoalAction) => void; onColor?: boolean }) {
  const { t } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("Actions for {name}", { name })} disabled={busy} className={cn(
          onColor
            ? "flex size-8.5 shrink-0 items-center justify-center rounded-[10px] border border-white/26 bg-white/12 text-white transition-colors hover:bg-white/20 disabled:opacity-50 data-open:bg-white/30 pointer-coarse:size-11 [&_svg]:size-4"
            : cn(iconActionClass(), "data-open:border-mint-200 data-open:bg-emerald-soft data-open:text-emerald"),
        )}>
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" alignOffset={-3} sideOffset={6} className="flex w-61 flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-1.5 leading-[normal] shadow-overlay ring-0">
        {items.map((item) => (
          <DropdownMenuItem key={item.key} onSelect={() => onAction(item.key)} className={cn(MENU_ITEM, item.danger && "text-loss-ink focus:bg-expense-soft focus:text-loss-ink", item.good && "text-success-ink focus:text-success-ink", item.warm && "text-tint-yellow-ink focus:text-tint-yellow-ink")}>
            <item.icon aria-hidden="true" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
