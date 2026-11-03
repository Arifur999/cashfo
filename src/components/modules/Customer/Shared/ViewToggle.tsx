"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type ListView = "cards" | "table";
export const LIST_VIEWS: readonly ListView[] = ["cards", "table"];

// Cards or a table (Balance › Accounts, Savings goals): two round buttons in
// a grey pill, the one in use lifted white, in the page's own order.
export function ViewToggle({ value, onChange, order = LIST_VIEWS, className }: { value: ListView; onChange: (next: ListView) => void; order?: readonly ListView[]; className?: string }) {
  const { t } = useLocale();
  return (
    <div role="group" aria-label={t("View")} className={cn("flex shrink-0 gap-0.5 rounded-full bg-surface-sunken p-0.75", className)}>
      {order.map((view) => {
        const on = value === view;
        const label = t(view === "table" ? "Table view" : "Card view");
        return (
          <button
            key={view}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(view)}
            className={cn("flex h-7.5 w-8.5 items-center justify-center rounded-full", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)] dark:bg-surface-raised" : "text-ink-faint hover:text-ink")}
          >
            {view === "table" ? <Table2 className="size-4" aria-hidden="true" /> : <LayoutGrid className="size-4" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
