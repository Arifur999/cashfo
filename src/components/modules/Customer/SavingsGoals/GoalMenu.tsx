"use client";

import { Ellipsis } from "lucide-react";
import { iconActionClass } from "@/components/smartly/IconAction";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GoalAction, GoalMenuItem } from "./useGoalView";

const MENU_ITEM = "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-small font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";

// A goal's ⋯ button and its menu, on the card and the table row.
export function GoalMenu({ name, items, busy, onAction }: { name: string; items: GoalMenuItem[]; busy: boolean; onAction: (action: GoalAction) => void }) {
  const { t } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t("Actions for {name}", { name })} disabled={busy} className={cn(iconActionClass(), "data-open:border-mint-200 data-open:bg-emerald-soft data-open:text-emerald")}>
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-57.5 rounded-[14px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
        {items.map((item, index) => (
          <div key={item.key}>
            {item.key === "delete" && index > 0 && <DropdownMenuSeparator className="my-1 bg-line" />}
            <DropdownMenuItem onSelect={() => onAction(item.key)} className={cn(MENU_ITEM, item.danger && "text-expense focus:bg-expense-soft focus:text-expense", item.good && "text-success-ink focus:text-success-ink")}>
              <item.icon aria-hidden="true" />
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
