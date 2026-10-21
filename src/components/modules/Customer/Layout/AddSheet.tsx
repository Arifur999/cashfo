"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import IconTile from "@/components/smartly/IconTile";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addActionBlocks, type AddAction } from "@/lib/customer/addActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ADD_ACTION_ICONS, useAddActions } from "./AddActionsProvider";

interface AddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The button that opens it (the phone's +).
  children: React.ReactNode;
}

// The phone's Add menu, up from the bottom: everything the top bar's Add
// menu offers, as 56px rows. It leads with Expense, the tab the + used to
// open New transaction on (the phone board's drawer leads with it too).
export function AddSheet({ open, onOpenChange, children }: AddSheetProps) {
  const { t } = useLocale();
  const { actions, run } = useAddActions();
  // A pick opens a drawer or a panel; focus goes there, not back to the +.
  const picked = useRef(false);

  function choose(action: AddAction) {
    picked.current = true;
    onOpenChange(false);
    run(action);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          if (!picked.current) return;
          picked.current = false;
          event.preventDefault();
        }}
        className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0 text-ink shadow-overlay"
      >
        <span aria-hidden="true" className="mt-2 block h-1 w-10 shrink-0 self-center rounded-full bg-line-strong" />
        <SheetHeader className="flex-row items-center justify-between gap-3 py-1 pr-2 pl-5">
          <SheetTitle className="text-h3 text-ink">{t("Add")}</SheetTitle>
          <SheetClose className="flex size-11 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken" aria-label={t("Close")}>
            <X className="size-5" aria-hidden="true" />
          </SheetClose>
        </SheetHeader>
        <div className="px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {addActionBlocks(actions, "expense").map((block, index) => (
            <div key={block[0].key} className={cn(index > 0 && "mt-1 border-t border-divider pt-1")}>
              {block.map((action) => {
                const Icon = ADD_ACTION_ICONS[action.icon];
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => choose(action)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-hover active:bg-surface-sunken"
                  >
                    <IconTile tone={action.tone} size={40}>
                      <Icon />
                    </IconTile>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-strong text-ink">{t(action.label)}</span>
                      <span className="text-small text-ink-muted">{t(action.hint)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
