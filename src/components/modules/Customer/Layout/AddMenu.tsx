"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import IconTile from "@/components/smartly/IconTile";
import Kbd from "@/components/smartly/Kbd";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { addActionBlocks, addActionForKey, type AddAction } from "@/lib/customer/addActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ADD_ACTION_ICONS, useAddActions, WithAddActions } from "./AddActionsProvider";

// N is a letter like any other while typing, or inside an open drawer,
// dialog or menu.
const isBusy = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[role=dialog], [role=alertdialog], [role=menu]") !== null);

// One menu for everything you can add, opened with N anywhere; the letter
// on each row picks it. The design-v4 top bar has no Add button (New
// transaction lives on the Dashboard and Transactions pages, the phone has
// its +), so the menu hangs off an invisible anchor at the top bar's right
// edge, under the account button.
export function AddMenu() {
  return (
    <WithAddActions>
      <AddMenuButton />
    </WithAddActions>
  );
}

function AddMenuButton() {
  const { t } = useLocale();
  const { activeBusinessId } = useAuth();
  const { actions, run } = useAddActions();
  const [open, setOpen] = useState(false);
  // A pick opens a drawer or a panel of its own; focus stays with that
  // rather than going back to the Add button (which would close the panel).
  const picked = useRef(false);
  const anchor = useRef<HTMLSpanElement>(null);
  // Where the focus was when N opened the menu: it goes back there when
  // the menu closes without a pick (the anchor can't take it).
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Autofill fires keydowns with no key at all.
      if (typeof event.key !== "string") return;
      // Below md the anchor is hidden (the + sheet stands in for the menu).
      if (!anchor.current?.offsetParent) return;
      if (event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey && !isBusy(event.target)) {
        event.preventDefault();
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function choose(action: AddAction) {
    picked.current = true;
    setOpen(false);
    run(action);
  }

  function onMenuKeyDown(event: React.KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const action = addActionForKey(actions, event.key);
    if (action) {
      event.preventDefault();
      choose(action);
    }
  }

  if (!activeBusinessId) return null;

  const hint = t("Press N anywhere to open this menu").split("N");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span ref={anchor} aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute right-8 bottom-0 block size-px" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        onKeyDown={onMenuKeyDown}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (picked.current) picked.current = false;
          else if (opener.current?.isConnected) opener.current.focus();
          opener.current = null;
        }}
        className="w-85 rounded-lg border border-line bg-surface p-0 shadow-overlay ring-0"
      >
        <div className="p-2">
          {addActionBlocks(actions).map((block, index) => (
            <div key={block[0].key}>
              {index > 0 && <DropdownMenuSeparator className="mx-3 my-2 bg-line" />}
              {block.map((action) => {
                const Icon = ADD_ACTION_ICONS[action.icon];
                return (
                  <DropdownMenuItem key={action.key} onSelect={() => choose(action)} className="cursor-pointer gap-3 rounded-md px-3 py-2 focus:bg-surface-sunken">
                    <IconTile tone={action.tone} size={36}>
                      <Icon />
                    </IconTile>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-semibold text-ink">{t(action.label)}</span>
                      <span className="text-caption font-normal text-ink-muted">{t(action.hint)}</span>
                    </span>
                    <Kbd>{action.letter}</Kbd>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </div>
        <div className="border-t border-line bg-strip px-4 py-3 text-caption font-normal text-ink-muted">
          {hint.length === 2 ? (
            <>
              {hint[0]}
              <Kbd className="px-1 py-0">N</Kbd>
              {hint[1]}
            </>
          ) : (
            t("Press N anywhere to open this menu")
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
